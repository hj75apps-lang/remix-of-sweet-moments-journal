import { readBoundedText } from "./bounded-body";

type Env = Record<string, unknown>;
export const NAVIGATION_CREATOR_COOKIE = "__Host-sal-navigation-creator";

export class NavigationGuardError extends Error {
  constructor(public readonly code: string, public readonly status: number, public readonly retryAfter?: number) {
    super(code);
    this.name = "NavigationGuardError";
  }
}

function envText(env: Env, key: string): string | undefined {
  const direct = env[key];
  return typeof direct === "string" ? direct : typeof process !== "undefined" ? process.env?.[key] : undefined;
}

async function digest(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function credentials(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  // An invalid explicit header cannot silently fall back to a different identity.
  if (authorization !== null) return /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(authorization)?.[1] ?? null;
  const cookies = (request.headers.get("cookie") ?? "").split(";")
    .map((entry) => entry.trim()).filter((entry) => entry.startsWith(`${NAVIGATION_CREATOR_COOKIE}=`));
  if (cookies.length !== 1) return null;
  const value = cookies[0]?.slice(NAVIGATION_CREATOR_COOKIE.length + 1) ?? "";
  return /^[A-Za-z0-9_-]{32,256}$/.test(value) ? value : null;
}

/** Registry contains hashes of independently provisioned client keys, never a VITE_* secret. */
export async function authenticateNavigationCreator(request: Request, env: Env): Promise<string> {
  const raw = envText(env, "NAVIGATION_CONNECT_CREATOR_KEYS_JSON");
  if (!raw || raw.length > 20_000) throw new NavigationGuardError("navigation_auth_not_configured", 503);
  let registry: unknown;
  try { registry = JSON.parse(raw); } catch { throw new NavigationGuardError("navigation_auth_not_configured", 503); }
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) throw new NavigationGuardError("navigation_auth_not_configured", 503);
  const entries = Object.entries(registry);
  if (!entries.length || entries.length > 100 || entries.some(([id, hash]) =>
    !/^[a-zA-Z0-9_-]{1,64}$/.test(id) || typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash))) {
    throw new NavigationGuardError("navigation_auth_not_configured", 503);
  }
  const credential = credentials(request);
  if (!credential) throw new NavigationGuardError("unauthorized_creator", 401);
  const actual = await digest(credential);
  let creator: string | null = null;
  for (const [id, expected] of entries) {
    let mismatch = 0;
    for (let index = 0; index < actual.length; index++) mismatch |= actual.charCodeAt(index) ^ String(expected).charCodeAt(index);
    if (mismatch === 0) creator = id;
  }
  if (!creator) throw new NavigationGuardError("unauthorized_creator", 401);
  return creator;
}

interface QuotaBinding { fetch(request: Request): Promise<Response> }

/** One atomic quota service shared by instances; IP headers do not select the bucket. */
export async function consumeNavigationQuota(env: Env, operation: "create" | "read", subject: string): Promise<void> {
  const binding = env["NAVIGATION_CONNECT_QUOTA"] as Partial<QuotaBinding> | undefined;
  if (typeof binding?.fetch !== "function") throw new NavigationGuardError("navigation_quota_unavailable", 503);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error("quota_timeout")); }, 2_000);
    });
    const response = await Promise.race([binding.fetch(new Request("https://navigation-quota.internal/consume", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation, subject }), signal: controller.signal,
    })), timeout]);
    if (!response.ok) throw new Error("quota_failed");
    const result: unknown = JSON.parse(await readBoundedText(response, 1024, 2_000));
    if (!result || typeof result !== "object" || !("allowed" in result) || typeof result.allowed !== "boolean" ||
        !("retryAfter" in result) || typeof result.retryAfter !== "number" || !Number.isInteger(result.retryAfter) ||
        result.retryAfter < 0 || result.retryAfter > 3600) throw new Error("invalid_quota_response");
    if (!result.allowed) throw new NavigationGuardError("rate_limited", 429, Math.max(1, result.retryAfter));
  } catch (error) {
    if (error instanceof NavigationGuardError) throw error;
    throw new NavigationGuardError("navigation_quota_unavailable", 503);
  } finally { clearTimeout(timer); }
}
