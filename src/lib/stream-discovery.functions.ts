import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { discoverWebsite, isPublicHttps } from "@/services/stream-discovery";
export type { DiscoveredStation } from "@/services/stream-discovery";

const UA =
  "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";
async function get(url: string, ms = 8000): Promise<Response | null> {
  if (!isPublicHttps(url)) return null;
  try {
    const response = await fetch(url, {
      headers: { "user-agent": UA, accept: "*/*" },
      redirect: "manual",
      signal: AbortSignal.timeout(ms),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      const redirected = new URL(location, url).href;
      if (!isPublicHttps(redirected)) return null;
      return fetch(redirected, {
        headers: { "user-agent": UA, accept: "*/*" },
        redirect: "error",
        signal: AbortSignal.timeout(ms),
      });
    }
    return response;
  } catch {
    return null;
  }
}

export const discoverStream = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().trim().min(4).max(300) }).parse(d))
  .handler(({ data }) => discoverWebsite(data.url, get));
