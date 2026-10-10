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
export function createOtaEngine(adapter: OtaAdapter, emit: (state: OtaState) => void, now = Date.now) {
  let running = false;
  let lastCheck = 0;
  let state: OtaState = { ...initialOtaState };
  const update = (patch: Partial<OtaState>) => { state = { ...state, ...patch }; emit(state); };
  const message = (error: unknown) => error instanceof Error ? error.message : "Não foi possível atualizar. Versão local preservada.";
  async function start(): Promise<boolean> {
    update({ status: "starting" });
    try {
      const pending = await adapter.claimStartup();
      if (pending.id) {
        const { bundles } = await adapter.list();
        const bundle = bundles.find((b) => b.id === pending.id && b.status !== "error" && b.status !== "deleted");
        if (bundle) { await adapter.set({ id: bundle.id }); return true; }
      }
      const [info, current] = await Promise.all([adapter.info(), adapter.current()]);
      update({ status: info.configured ? (info.pending ? "staged" : "idle") : "unconfigured", nativeVersion: info.nativeVersion, nativeCode: info.nativeCode,
        active: current.bundle.id === "builtin" ? "Incluída no APK" : current.bundle.version,
        previous: info.previous, channel: info.channel,
        message: info.configured ? (info.pending ? "Preparada para a próxima abertura." : "Última versão local carregada.") : "Origem e assinatura ainda não configuradas." });
      return false;
    } catch (error) { update({ status: "error", message: message(error) }); return false; }
  }
  async function ready() {
    // Called only after launcher navigation exists, not after a network response.
    await adapter.notifyReady();
    const current = await adapter.current();
    await adapter.confirmed({ id: current.bundle.id });
    const info = await adapter.info();
    update({ previous: info.previous });
    // Bound retained storage without ever removing active/pending/fallback.
    const { bundles } = await adapter.list();
    const retained = new Set([current.bundle.id, info.previous, info.pending, "builtin"]);
    for (const b of bundles) {
      if (!retained.has(b.id) && b.status !== "downloading") await adapter.remove({ id: b.id }).catch(() => {});
    }
  }
  async function check(online: boolean, visible: boolean, manual = false) {
    if (running || !visible) return;
    if (!online) { update({ status: "offline", message: "Sem internet. Versão local preservada." }); return; }
    if (!manual && lastCheck && now() - lastCheck < INTERVAL) return;
    running = true; lastCheck = now();
    try {
      const info = await adapter.info();
      if (!info.configured) { update({ status: "unconfigured", message: "Origem e assinatura ainda não configuradas." }); return; }
      if (info.pending) { update({ status: "staged", message: "Preparada para a próxima abertura." }); return; }
      update({ status: "checking", message: "Verificando versão assinada…" });
      const result = await adapter.check();
      const m = result.manifest;
      if (!m) { update({ status: "idle", message: "Nenhuma nova versão disponível." }); return; }
      update({ available: m.version, notes: m.notes });
      if (m.suspended) { update({ status: "suspended", message: "Publicação suspensa pelo distribuidor." }); return; }
      if (!m.compatible || m.kind === "native") { update({ status: "native_required", message: m.notes || "Esta atualização exige um novo APK compatível.", nativeUrl: m.kind === "native" ? m.url : "" }); return; }
      if (!result.envelope || m.sequence <= info.highest || !/^[a-f0-9]{64}$/.test(m.sha256)) throw new Error("Manifesto recusado.");
      update({ status: "downloading", message: "Baixando sem interromper o launcher…" });
      const bundle = await adapter.download({ url: m.url, version: `${m.sequence}-${m.version}`, checksum: m.sha256 });
      if (bundle.checksum !== m.sha256 || bundle.status === "error") { await adapter.remove({ id: bundle.id }); throw new Error("Hash do pacote inválido."); }
      await adapter.stage({ id: bundle.id, envelope: result.envelope });
      update({ status: "staged", message: "Validada e preparada para a próxima abertura; ainda não ativada." });
    } catch (error) { update({ status: "error", message: message(error) }); }
    finally { running = false; }
  }
  return { start, ready, check };
}