import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { createTrackedTrip, getTrackedTrip } from "./services/navigation-connect-server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function handleNavigationConnect(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/navigation/trips")) return null;
  const allowedOrigin =
    typeof (env as { [key: string]: unknown })?.["NAVIGATION_CONNECT_ALLOWED_ORIGIN"] === "string"
      ? String((env as { [key: string]: unknown })["NAVIGATION_CONNECT_ALLOWED_ORIGIN"])
      : (typeof process !== "undefined" ? process.env?.NAVIGATION_CONNECT_ALLOWED_ORIGIN : undefined);
  const requestOrigin = request.headers.get("origin");
  const cors: Record<string, string> = {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
  if (allowedOrigin && requestOrigin === allowedOrigin) cors["access-control-allow-origin"] = allowedOrigin;
  try {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method === "POST" && url.pathname === "/api/navigation/trips") {
      const body = await request.json() as { app?: string; destination?: string };
      if (body.app !== "maps" && body.app !== "waze") {
        return new Response(JSON.stringify({ error: "app must be maps or waze" }), { status: 400, headers: cors });
      }
      const trip = await createTrackedTrip(env as Record<string, unknown>, {
        app: body.app,
        destination: String(body.destination ?? "").slice(0, 200),
      });
      return new Response(JSON.stringify(trip), { status: 200, headers: cors });
    }

    const match = url.pathname.match(/^\/api\/navigation\/trips\/([^/]+)$/);
    if (request.method === "GET" && match?.[1]) {
      const telemetry = await getTrackedTrip(env as Record<string, unknown>, decodeURIComponent(match[1]));
      return new Response(JSON.stringify(telemetry), { status: 200, headers: cors });
    }

    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: cors });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Navigation Connect error";
    return new Response(JSON.stringify({ error: message }), { status: 503, headers: cors });
  }
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const navigationResponse = await handleNavigationConnect(request, env);
      if (navigationResponse) return navigationResponse;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
