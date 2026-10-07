import { describe, expect, it } from "vitest";
import { isPublicHttps } from "./stream-discovery";

describe("stream discovery URL policy", () => {
  it("accepts public HTTPS hosts", () => {
    expect(isPublicHttps("https://radio.example/live")).toBe(true);
  });

  it("rejects HTTP, credentials and local names", () => {
    expect(isPublicHttps("http://radio.example/live")).toBe(false);
    expect(isPublicHttps("https://user:pass@radio.example/live")).toBe(false);
    expect(isPublicHttps("https://radio.local/live")).toBe(false);
    expect(isPublicHttps("https://localhost/live")).toBe(false);
  });

  it("rejects private, loopback, link-local and multicast IPv4", () => {
    for (const host of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.10", "169.254.1.1", "224.0.0.1"]) {
      expect(isPublicHttps(`https://${host}/stream`).toBe(false);
    }
  });

  it("rejects invalid IPv4 values", () => {
    expect(isPublicHttps("https://999.1.1.1/stream")).toBe(false);
  });
});
