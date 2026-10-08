import { createTrackedTrip, getTrackedTrip, createNavigationConnectAccessKey, verifyNavigationConnectAccessKey } from "./navigation-connect-server";
import { BodyLimitError, readBoundedText } from "./bounded-body";

const navigationRateLimits = new Map<string, { windowStart: number; count: number }>();
const NAVIGATION_RATE_WINDOW_MS = 60_000;
const NAVIGATION_RATE_MAX = 5;

function navigationClientKey(request: Request): string {
  return request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
}

function allowNavigationCreate(request: Request): boolean {
  const now = Date.now();
  for (const [storedKey, entry] of navigationRateLimits) {
    if (now - entry.windowStart >= NAVIGATION_RATE_WINDOW_MS) navigationRateLimits.delete(storedKey);
  }
  while (navigationRateLimits.size >= 2000) {
    const oldest = navigationRateLimits.keys().next().value as string | undefined;
    if (!oldest) break;
    navigationRateLimits.delete(oldest);
  }
  const key = navigationClientKey(request);
  const current = navigationRateLimits.get(key);
  if (!current || now - current.windowStart >= NAVIGATION_RATE_WINDOW_MS) {
    navigationRateLimits.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (current.count >= NAVIGATION_RATE_MAX) return false;
  current.count += 1;
  return true;
}

export async function handleNavigationConnect(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/navigation/trips")) return null;
  const allowedOrigin =
    typeof (env as { [key: string]: unknown })?.["NAVIGATION_CONNECT_ALLOWED_ORIGIN"] === "string"
      ? String((env as { [key: string]: unknown })["NAVIGATION_CONNECT_ALLOWED_ORIGIN"])
      : (typeof process !== "undefined" ? process.env?.["NAVIGATION_CONNECT_ALLOWED_ORIGIN"] : undefined);
  const requestOrigin = request.headers.get("origin");
  const cors: Record<string, string> = {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-navigation-connect-access-key",
    "access-control-expose-headers": "x-navigation-connect-access-key",
    "vary": "Origin",
  };
  if (allowedOrigin && requestOrigin === allowedOrigin) cors["access-control-allow-origin"] = allowedOrigin;
  const expectedOrigin = allowedOrigin || url.origin;
  if ((request.method === "POST" || request.method === "OPTIONS") &&
      (allowedOrigin ? requestOrigin !== expectedOrigin : requestOrigin && requestOrigin !== expectedOrigin)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), { status: 403, headers: cors });
  }
  try {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method === "POST" && url.pathname === "/api/navigation/trips") {
      let body: unknown;
      try { body = JSON.parse(await readBoundedText(request, 4096)); } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof BodyLimitError ? "request_too_large" : "invalid_json" }), {
          status: error instanceof BodyLimitError ? 413 : 400, headers: cors,
        });
      }
      if (!body || typeof body !== "object" || !("app" in body) || (body.app !== "maps" && body.app !== "waze") ||
          !("destination" in body) || typeof body.destination !== "string" ||
          !body.destination.trim() || body.destination.trim().length > 200) {
        return new Response(JSON.stringify({ error: "invalid_trip_input" }), { status: 400, headers: cors });
      }
      if (!allowNavigationCreate(request)) return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...cors, "retry-after": "60" },
      });
      const trip = await createTrackedTrip(env as Record<string, unknown>, {
        app: body.app,
        destination: body.destination.trim(),
      });
      const accessKey = await createNavigationConnectAccessKey(env as Record<string, unknown>, trip.tripId, trip.expiresAt);
      return new Response(JSON.stringify(trip), {
        status: 200,
        headers: { ...cors, "x-navigation-connect-access-key": accessKey },
      });
    }

    const match = url.pathname.match(/^\/api\/navigation\/trips\/([^/]+)$/);
    if (request.method === "GET" && match?.[1]) {
      const tripId = decodeURIComponent(match[1]);
      const accessKey = request.headers.get("x-navigation-connect-access-key");
      if (!accessKey || !(await verifyNavigationConnectAccessKey(env as Record<string, unknown>, tripId, accessKey))) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
      }
      const telemetry = await getTrackedTrip(env as Record<string, unknown>, tripId);
      return new Response(JSON.stringify(telemetry), { status: 200, headers: cors });
    }

    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: cors });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "navigation_service_unavailable" }), {
      status: 503,
      headers: cors,
    });
  }
}

