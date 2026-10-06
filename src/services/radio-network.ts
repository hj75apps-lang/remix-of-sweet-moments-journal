import { Capacitor, registerPlugin } from "@capacitor/core";
import { discoverWebsite, isPublicHttps, type DiscoveredStation } from "./stream-discovery";

interface NativeResponse {
  status: number;
  contentType: string;
  body: string;
}
interface RadioNetworkPlugin {
  request(options: { url: string; timeout: number; probe: boolean }): Promise<NativeResponse>;
}
const network = registerPlugin<RadioNetworkPlugin>("RadioNetwork");

export const isRadioNative = () => Capacitor.isNativePlatform();

export async function nativeRadioRequest(
  url: string,
  timeout = 8000,
  probe = false,
): Promise<Response | null> {
  if (!isPublicHttps(url)) return null;
  try {
    const result = await network.request({ url, timeout, probe });
    return new Response(result.status === 204 || result.status === 304 ? null : result.body, {
      status: result.status,
      headers: { "content-type": result.contentType },
    });
  } catch {
    return null;
  }
}

/** Native reads avoid CORS and the server RPC that isn't packaged in the APK. */
export async function discoverRadioWebsite(url: string): Promise<DiscoveredStation> {
  if (isRadioNative()) return discoverWebsite(url, nativeRadioRequest);
  const { discoverStream } = await import("@/lib/stream-discovery.functions");
  return discoverStream({ data: { url } });
}

export async function fetchRadioPlaylist(url: string): Promise<Response> {
  if (!isRadioNative()) return fetch(url);
  const response = await nativeRadioRequest(url);
  if (!response) throw new Error("Playlist indisponível");
  return response;
}