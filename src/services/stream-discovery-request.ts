import { readBoundedText } from "./bounded-body";
import { isPublicHttps, type DiscoveryRequest } from "./stream-discovery";

const UA = "SmartAutoLauncher/1.0 Radio Discovery";

/** Only page/playlist text is buffered; an audio probe never reads the stream. */
export const requestDiscovery: DiscoveryRequest = async (url, timeout = 8000, probe = false) => {
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      if (!isPublicHttps(url)) return null;
      const response = await fetch(url, {
        headers: { "user-agent": UA, accept: "*/*" },
        redirect: "manual",
        signal: AbortSignal.timeout(timeout),
      });
      if (response.status >= 300 && response.status < 400) {
        void response.body?.cancel().catch(() => undefined);
        const location = response.headers.get("location");
        if (!location || redirects === 3) return null;
        url = new URL(location, url).href;
        continue;
      }
      if (probe || !response.ok) {
        void response.body?.cancel().catch(() => undefined);
        return new Response(null, { status: response.status, headers: response.headers });
      }
      const text = await readBoundedText(response, 400_000, timeout);
      return new Response(text, { status: response.status, headers: response.headers });
    }
    return null;
  } catch { return null; }
};
