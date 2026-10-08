type Env = Record<string, unknown>;

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

interface TripResponse {
  name?: string;
  authToken?: { token?: string; expireTime?: string };
}

function envValue(env: Env, name: string): string | undefined {
  const direct = env[name];
  if (typeof direct === "string" && direct) return direct;
  const processEnv = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return processEnv || undefined;
}

function readServiceAccount(env: Env): ServiceAccount {
  const raw = envValue(env, "GOOGLE_NAVIGATION_CONNECT_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Navigation Connect não configurado: credencial do servidor ausente");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Credencial do Navigation Connect inválida"); }
  if (!value || typeof value !== "object") throw new Error("Credencial do Navigation Connect inválida");
  const account = value as Partial<ServiceAccount>;
  if (!account.client_email || !account.private_key) throw new Error("Credencial do Navigation Connect incompleta");
  return account as ServiceAccount;
}

function base64Url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function createGoogleAccessToken(env: Env): Promise<string> {
  const account = readServiceAccount(env);
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Falha na autenticação Google (${response.status})`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Google não retornou access token");
  return payload.access_token;
}

function projectId(env: Env, account: ServiceAccount): string {
  return envValue(env, "GOOGLE_NAVIGATION_CONNECT_PROJECT_ID") || account.project_id || "";
}

function androidAppId(env: Env): string {
  return envValue(env, "GOOGLE_NAVIGATION_CONNECT_ANDROID_APP_ID") || "app.smartautolauncher";
}

function tripUrl(project: string, tripId?: string): string {
  return tripId
    ? `https://navigationconnect.googleapis.com/v1/projects/${encodeURIComponent(project)}/trips/${encodeURIComponent(tripId)}`
    : `https://navigationconnect.googleapis.com/v1/projects/${encodeURIComponent(project)}/trips`;
}

function navigationSecret(env: Env): string {
  const secret = envValue(env, "NAVIGATION_CONNECT_SESSION_SECRET");
  if (!secret || secret.length < 32) throw new Error("NAVIGATION_CONNECT_SESSION_SECRET ausente ou fraco (mínimo 32 caracteres)");
  return secret;
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function signCapability(env: Env, tripId: string, expiresAt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(navigationSecret(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const payload = `${tripId}.${expiresAt}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64Url(signature);
}

export async function createNavigationConnectAccessKey(env: Env, tripId: string, expiresAt: string): Promise<string> {
  const expiry = base64Url(expiresAt);
  const signature = await signCapability(env, tripId, expiresAt);
  return `${expiry}.${signature}`;
}

export async function verifyNavigationConnectAccessKey(env: Env, tripId: string, accessKey: string): Promise<boolean> {
  const separator = accessKey.indexOf(".");
  if (separator <= 0) return false;
  try {
    const expiresAt = new TextDecoder().decode(decodeBase64Url(accessKey.slice(0, separator)));
    if (!expiresAt || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) return false;
    const expected = decodeBase64Url(await signCapability(env, tripId, expiresAt));
    const actual = decodeBase64Url(accessKey.slice(separator + 1));
    if (expected.length !== actual.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i += 1) diff |= (expected[i] ?? 0) ^ (actual[i] ?? 0);
    return diff === 0;
  } catch { return false; }
}
function navLaunchUrl(app: "maps" | "waze", destination: string, token: string): string {
  const encoded = encodeURIComponent(destination.trim());
  if (app === "waze") {
    return `https://waze.com/ul?q=${encoded}&navigate=yes&external_trip_token=${encodeURIComponent(token)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}&dir_action=navigate&action_token=${encodeURIComponent(token)}`;
}

export async function createTrackedTrip(
  env: Env,
  input: { app: "maps" | "waze"; destination: string },
): Promise<{ tripId: string; authToken: string; expiresAt: string; launchUrl: string }> {
  // Fail before creating a billable trip if its capability cannot be signed.
  navigationSecret(env);
  const account = readServiceAccount(env);
  const project = projectId(env, account);
  if (!project) throw new Error("GOOGLE_NAVIGATION_CONNECT_PROJECT_ID não configurado");
  if (!input.destination.trim()) throw new Error("Destino obrigatório");

  const accessToken = await createGoogleAccessToken(env);
  const tripId = crypto.randomUUID();
  const response = await fetch(`${tripUrl(project)}?tripId=${encodeURIComponent(tripId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      androidAppId: androidAppId(env),
      config: {
        enableRemainingRouteReporting: input.app === "waze",
        enableHighFrequencyUpdates: true,
      },
    }),
  });
  if (!response.ok) throw new Error(`Navigation Connect CreateTrip falhou (${response.status})`);
  const payload = await response.json() as TripResponse;
  const token = payload.authToken?.token;
  const expiresAt = payload.authToken?.expireTime;
  if (!token || !expiresAt) throw new Error("Navigation Connect não retornou token de viagem");
  return { tripId, authToken: token, expiresAt, launchUrl: navLaunchUrl(input.app, input.destination, token) };
}

function durationSeconds(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return undefined;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

export async function getTrackedTrip(env: Env, tripId: string): Promise<unknown> {
  const account = readServiceAccount(env);
  const project = projectId(env, account);
  if (!project) throw new Error("GOOGLE_NAVIGATION_CONNECT_PROJECT_ID não configurado");
  const accessToken = await createGoogleAccessToken(env);
  const response = await fetch(tripUrl(project, tripId), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Navigation Connect GetTrip falhou (${response.status})`);
  const payload = await response.json() as {
    name?: string;
    state?: string;
    execution?: {
      location?: { point?: { latitude?: number; longitude?: number } };
      remainingDistanceMeters?: number;
      remainingDuration?: string;
      remainingRoute?: { simplePolyline?: { points?: Array<{ latitude?: number; longitude?: number }> } };
    };
    updateTime?: string;
  };
  const execution = payload.execution;
  const location = execution?.location?.point;
  const remainingDurationSeconds = durationSeconds(execution?.remainingDuration);
  const remainingDistanceMeters = typeof execution?.remainingDistanceMeters === "number" &&
    Number.isFinite(execution.remainingDistanceMeters) && execution.remainingDistanceMeters >= 0
      ? execution.remainingDistanceMeters : undefined;
  const etaEpochMs = remainingDurationSeconds !== undefined ? Date.now() + remainingDurationSeconds * 1000 : undefined;
  const points = execution?.remainingRoute?.simplePolyline?.points
    ?.filter((point) => Number.isFinite(point.latitude) && Math.abs(Number(point.latitude)) <= 90 &&
      Number.isFinite(point.longitude) && Math.abs(Number(point.longitude)) <= 180)
    .map((point) => ({ latitude: Number(point.latitude), longitude: Number(point.longitude) })) ?? [];
  const terminalStates = new Set(["ARRIVED", "FAILED", "CLIENT_ERROR", "CANCELED"]);
  return {
    tripId,
    state: payload.state ?? "STATE_UNSPECIFIED",
    active: !terminalStates.has(payload.state ?? "STATE_UNSPECIFIED"),
    sourcePackage: null,
    latitude: Number.isFinite(location?.latitude) && Math.abs(Number(location?.latitude)) <= 90 ? location?.latitude : undefined,
    longitude: Number.isFinite(location?.longitude) && Math.abs(Number(location?.longitude)) <= 180 ? location?.longitude : undefined,
    etaEpochMs,
    remainingDistanceMeters,
    remainingDurationSeconds,
    route: points.length || remainingDistanceMeters !== undefined || remainingDurationSeconds !== undefined ? {
      points,
      remainingDistanceMeters,
      remainingDurationSeconds,
      etaEpochMs,
    } : undefined,
    updatedAt: payload.updateTime,
  };
}
