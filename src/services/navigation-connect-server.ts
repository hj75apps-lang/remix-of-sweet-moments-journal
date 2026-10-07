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

function navLaunchUrl(app: "maps" | "waze", destination: string, token: string): string {
  const encoded = encodeURIComponent(destination.trim());
  if (app === "waze") {
    return `https://waze.com/ul?q=${encoded}&navigate=yes&token=${encodeURIComponent(token)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving&dir_action=navigate&navconnect=${encodeURIComponent(token)}`;
}

export async function createTrackedTrip(
  env: Env,
  input: { app: "maps" | "waze"; destination: string },
): Promise<{ tripId: string; authToken: string; expiresAt: string; launchUrl: string }> {
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
        enableRouteDeviationReporting: input.app === "waze",
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
      currentLocation?: { latitude?: number; longitude?: number };
      eta?: string;
      remainingDistanceMeters?: number;
      remainingTimeSeconds?: number;
      remainingRoute?: { points?: Array<{ latitude?: number; longitude?: number }> };
    };
    updateTime?: string;
  };
  const location = payload.execution?.currentLocation;
  const points = payload.execution?.remainingRoute?.points
    ?.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .map((point) => ({ latitude: Number(point.latitude), longitude: Number(point.longitude) })) ?? [];
  return {
    tripId,
    state: payload.state ?? "UNKNOWN",
    active: !["COMPLETED", "CANCELLED", "FAILED", "UNKNOWN"].includes(payload.state ?? "UNKNOWN"),
    sourcePackage: null,
    latitude: location?.latitude,
    longitude: location?.longitude,
    etaEpochMs: payload.execution?.eta ? Date.parse(payload.execution.eta) : undefined,
    remainingDistanceMeters: payload.execution?.remainingDistanceMeters,
    remainingDurationSeconds: payload.execution?.remainingTimeSeconds,
    route: points.length ? { points, remainingDistanceMeters: payload.execution?.remainingDistanceMeters, remainingDurationSeconds: payload.execution?.remainingTimeSeconds, etaEpochMs: payload.execution?.eta ? Date.parse(payload.execution.eta) : undefined } : undefined,
    updatedAt: payload.updateTime,
  };
}
