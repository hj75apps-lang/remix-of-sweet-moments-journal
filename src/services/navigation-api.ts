import { createTrackedTrip, getTrackedTrip, createNavigationConnectAccessKey, verifyNavigationConnectAccessKey } from "./navigation-connect-server";
import { BodyLimitError, readBoundedText } from "./bounded-body";
import { authenticateNavigationCreator, consumeNavigationQuota, NavigationGuardError } from "./navigation-request-guard";

export async function handleNavigationConnect(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/navigation/trips" && !url.pathname.startsWith("/api/navigation/trips/")) return null;
  const serverEnv = env && typeof env === "object" ? env as Record<string, unknown> : {};
  const allowedOrigin =
    typeof (env as { [key: string]: unknown })?.["NAVIGATION_CONNECT_ALLOWED_ORIGIN"] === "string"
      ? String((env as { [key: string]: unknown })["NAVIGATION_CONNECT_ALLOWED_ORIGIN"])
      : (typeof process !== "undefined" ? process.env?.["NAVIGATION_CONNECT_ALLOWED_ORIGIN"] : undefined);
  const requestOrigin = request.headers.get("origin");
  const cors: Record<string, string> = {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-navigation-connect-access-key",
    "access-control-expose-headers": "x-navigation-connect-access-key,retry-after",
    "x-content-type-options": "nosniff",
    "vary": "Origin",
  };
  if (allowedOrigin && requestOrigin === allowedOrigin) {
    cors["access-control-allow-origin"] = allowedOrigin;
    cors["access-control-allow-credentials"] = "true";
  }
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
      const creator = await authenticateNavigationCreator(request, serverEnv);
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
      await consumeNavigationQuota(serverEnv, "create", creator);
      const trip = await createTrackedTrip(serverEnv, {
        app: body.app,
        destination: body.destination.trim(),
      }, request.signal);
      const accessKey = await createNavigationConnectAccessKey(serverEnv, trip.tripId, trip.expiresAt);
      return new Response(JSON.stringify(trip), {
        status: 200,
        headers: { ...cors, "x-navigation-connect-access-key": accessKey },
      });
    }

    const match = url.pathname.match(/^\/api\/navigation\/trips\/([^/]+)$/);
    if (request.method === "GET" && match?.[1]) {
      let tripId: string;
      try { tripId = decodeURIComponent(match[1]); } catch { return new Response(JSON.stringify({ error: "invalid_trip_id" }), { status: 400, headers: cors }); }
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(tripId)) return new Response(JSON.stringify({ error: "invalid_trip_id" }), { status: 400, headers: cors });
      const accessKey = request.headers.get("x-navigation-connect-access-key");
      if (!accessKey || accessKey.length > 512 || !(await verifyNavigationConnectAccessKey(serverEnv, tripId, accessKey))) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
      }
      await consumeNavigationQuota(serverEnv, "read", tripId);
      const telemetry = await getTrackedTrip(serverEnv, tripId, request.signal);
      return new Response(JSON.stringify(telemetry), { status: 200, headers: cors });
    }

    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: cors });
  } catch (error) {
    if (error instanceof NavigationGuardError) return new Response(JSON.stringify({ error: error.code }), {
      status: error.status, headers: { ...cors, ...(error.retryAfter ? { "retry-after": String(error.retryAfter) } : {}) },
    });
    // Do not log arbitrary upstream error objects, which may embed request credentials.
    console.error("navigation_service_unavailable");
    return new Response(JSON.stringify({ error: "navigation_service_unavailable" }), {
      status: 503,
      headers: cors,
    });
  }
}

