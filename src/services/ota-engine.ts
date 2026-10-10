export interface OtaManifest {
  schema: 1; appId: string; sequence: number; version: string; channel: string;
  kind: "ota" | "native"; compatible: boolean; suspended?: boolean;
  url: string; sha256: string; bytes: number; notes: string;
  minNativeCode: number; maxNativeCode: number; minLauncherVersion: string;
  bridgeRevision: number; publishedAt: number; expiresAt: number;
}
export interface OtaBundle { id: string; version: string; checksum: string; status: string }
export interface OtaInfo {
  configured: boolean; nativeVersion: string; nativeCode: number; highest: number;
  pending: string; previous: string; channel: string; lastResult: string;
}
export interface OtaCheck { manifest?: OtaManifest; envelope?: Record<string, unknown> }
export interface OtaAdapter {
  info(): Promise<OtaInfo>;
  claimStartup(): Promise<{ id?: string }>;
  check(): Promise<OtaCheck>;
  stage(options: { id: string; envelope: Record<string, unknown> }): Promise<void>;
  confirmed(options: { id: string }): Promise<void>;
  current(): Promise<{ bundle: OtaBundle; native: string }>;
  download(options: { url: string; version: string; checksum: string }): Promise<OtaBundle>;
  set(options: { id: string }): Promise<void>;
  notifyReady(): Promise<void>;
  list(): Promise<{ bundles: OtaBundle[] }>;
  remove(options: { id: string }): Promise<void>;
}
export interface OtaState {
  status: "web" | "starting" | "unconfigured" | "idle" | "checking" | "downloading" | "staged" | "native_required" | "suspended" | "offline" | "error";
  nativeVersion: string; nativeCode: number; active: string; previous: string; available: string;
  channel: string; message: string; notes: string; nativeUrl: string;
}
export const initialOtaState: OtaState = { status: "web", nativeVersion: "—", nativeCode: 0, active: "Incluída no APK", previous: "—", available: "—", channel: "—", message: "Disponível no aplicativo Android.", notes: "", nativeUrl: "" };
const INTERVAL = 6 * 60 * 60_000;

/** No runtime reload: only a native one-time cold-start claim can select a staged bundle. */
export class OtaEngine {
  private running = false;
  private lastCheck = 0;
  private state: OtaState = { ...initialOtaState };
  constructor(private adapter: OtaAdapter, private emit: (state: OtaState) => void, private now = Date.now) {}
  private update(patch: Partial<OtaState>) { this.state = { ...this.state, ...patch }; this.emit(this.state); }
  async start(): Promise<boolean> {
    this.update({ status: "starting" });
    try {
      const pending = await this.adapter.claimStartup();
      if (pending.id) {
        const { bundles } = await this.adapter.list();
        const bundle = bundles.find((b) => b.id === pending.id && b.status !== "error" && b.status !== "deleted");
        if (bundle) { await this.adapter.set({ id: bundle.id }); return true; }
      }
      const [info, current] = await Promise.all([this.adapter.info(), this.adapter.current()]);
      this.update({ status: info.configured ? (info.pending ? "staged" : "idle") : "unconfigured", nativeVersion: info.nativeVersion, nativeCode: info.nativeCode,
        active: current.bundle.id === "builtin" ? "Incluída no APK" : current.bundle.version,
        previous: info.previous, channel: info.channel,
        message: info.configured ? (info.pending ? "Preparada para a próxima abertura." : "Última versão local carregada.") : "Origem e assinatura ainda não configuradas." });
      return false;
    } catch (error) { this.update({ status: "error", message: this.message(error) }); return false; }
  }
  async ready() {
    // Called only after launcher navigation exists, not after a network response.
    await this.adapter.notifyReady();
    const current = await this.adapter.current();
    await this.adapter.confirmed({ id: current.bundle.id });
    const info = await this.adapter.info();
    this.update({ previous: info.previous });
    // Bound retained storage without ever removing active/pending/fallback.
    const { bundles } = await this.adapter.list();
    const retained = new Set([current.bundle.id, info.previous, info.pending, "builtin"]);
    for (const b of bundles) {
      if (!retained.has(b.id) && b.status !== "downloading") await this.adapter.remove({ id: b.id }).catch(() => {});
    }
  }
  async check(online: boolean, visible: boolean, manual = false) {
    if (this.running || !visible) return;
    if (!online) { this.update({ status: "offline", message: "Sem internet. Versão local preservada." }); return; }
    if (!manual && this.lastCheck && this.now() - this.lastCheck < INTERVAL) return;
    this.running = true; this.lastCheck = this.now();
    try {
      const info = await this.adapter.info();
      if (!info.configured) { this.update({ status: "unconfigured", message: "Origem e assinatura ainda não configuradas." }); return; }
      if (info.pending) { this.update({ status: "staged", message: "Preparada para a próxima abertura." }); return; }
      this.update({ status: "checking", message: "Verificando versão assinada…" });
      const result = await this.adapter.check();
      const m = result.manifest;
      if (!m) { this.update({ status: "idle", message: "Nenhuma nova versão disponível." }); return; }
      this.update({ available: m.version, notes: m.notes });
      if (m.suspended) { this.update({ status: "suspended", message: "Publicação suspensa pelo distribuidor." }); return; }
      if (!m.compatible || m.kind === "native") { this.update({ status: "native_required", message: m.notes || "Esta atualização exige um novo APK compatível.", nativeUrl: m.kind === "native" ? m.url : "" }); return; }
      if (!result.envelope || m.sequence <= info.highest || !/^[a-f0-9]{64}$/.test(m.sha256)) throw new Error("Manifesto recusado.");
      this.update({ status: "downloading", message: "Baixando sem interromper o launcher…" });
      const bundle = await this.adapter.download({ url: m.url, version: `${m.sequence}-${m.version}`, checksum: m.sha256 });
      if (bundle.checksum !== m.sha256 || bundle.status === "error") { await this.adapter.remove({ id: bundle.id }); throw new Error("Hash do pacote inválido."); }
      await this.adapter.stage({ id: bundle.id, envelope: result.envelope });
      this.update({ status: "staged", message: "Validada e preparada para a próxima abertura; ainda não ativada." });
    } catch (error) { this.update({ status: "error", message: this.message(error) }); }
    finally { this.running = false; }
  }
  private message(error: unknown) { return error instanceof Error ? error.message : "Não foi possível atualizar. Versão local preservada."; }
}