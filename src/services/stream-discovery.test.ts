import { describe, expect, it } from "vitest";
import { isPublicHttps } from "./stream-discovery";

describe("stream discovery URL policy", () => {
  it("accepts public HTTPS hosts", () => {
    expect(isPublicHttps("https://radio.example/live")).toBe(true);
    expect(isPublicHttps("https://fdradio.example/live")).toBe(true);
    expect(isPublicHttps("https://fcradio.example/live")).toBe(true);
  });

  it("rejects HTTP, credentials and local names", () => {
    expect(isPublicHttps("http://radio.example/live")).toBe(false);
    expect(isPublicHttps("https://user:pass@radio.example/live")).toBe(false);
    expect(isPublicHttps("https://radio.local/live")).toBe(false);
    expect(isPublicHttps("https://localhost/live")).toBe(false);
  });

  it("rejects private, loopback, link-local and multicast IPv4", () => {
    for (const host of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.10", "169.254.1.1", "224.0.0.1"]) {
      expect(isPublicHttps(`https://${host}/stream`)).toBe(false);
    }
  });

  it("rejects invalid IPv4 values", () => {
    expect(isPublicHttps("https://999.1.1.1/stream")).toBe(false);
  });
  it("rejects reserved address ranges and local names with a trailing dot", () => {
    for (const host of ["localhost.", "radio.local.", "device.home.arpa", "service.internal", "192.0.0.1", "192.0.2.1", "198.18.0.1", "198.19.1.1", "198.51.100.1", "203.0.113.1", "100.64.0.1"]) {
      expect(isPublicHttps(`https://${host}/live`), host).toBe(false);
    }
    expect(isPublicHttps("https://radio.example./live")).toBe(true);
    expect(isPublicHttps("https://8.8.8.8/live")).toBe(true);
  });
});
