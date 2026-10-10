// @vitest-environment node
import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync, verify, createHash } from "node:crypto";

it("packages an offline bundle and signs its exact hash without including the key", async () => {
  // Publisher runs exclusively outside the browser/Worker graph.
  const { publishOta } = await import("./package-ota.mjs");
  const root = await mkdtemp(join(tmpdir(), "launcher-ota-"));
  try {
    const input = join(root, "client"), output = join(root, "release"); await mkdir(input);
    await writeFile(join(input, "index.html"), "<html>Launcher</html>");
    const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const keyFile = join(root, "private.pem"); await writeFile(keyFile, keys.privateKey.export({ type: "pkcs8", format: "pem" }));
    const manifest = join(root, "metadata.json");
    await writeFile(manifest, JSON.stringify({ schema: 1, appId: "app.smartautolauncher", sequence: 2, version: "1.1.0", channel: "testing", kind: "ota", minNativeCode: 1, maxNativeCode: 1, minLauncherVersion: "1.0.0", bridgeRevision: 1, publishedAt: Date.now(), expiresAt: Date.now() + 86400000, notes: "Voice fixes", url: "https://updates.example.org/2-1.1.0.zip" }));
    const result = await publishOta({ input, output, manifest, keyFile });
    const envelope = JSON.parse(await readFile(join(output, "testing.json"), "utf8"));
    expect(verify("RSA-SHA256", Buffer.from(envelope.payload, "base64"), keys.publicKey, Buffer.from(envelope.signature, "base64"))).toBe(true);
    const zip = await readFile(join(output, "2-1.1.0.zip"));
    expect(result.sha256).toBe(createHash("sha256").update(zip).digest("hex"));
    expect(await readFile(join(output, "entries.txt"), "utf8")).toBe("index.html\n");
    const altered = Buffer.from(envelope.payload, "base64"); altered[0] = (altered[0] ?? 0) ^ 1;
    expect(verify("RSA-SHA256", altered, keys.publicKey, Buffer.from(envelope.signature, "base64"))).toBe(false);
    await writeFile(join(input, ".env"), "forbidden");
    await expect(publishOta({ input, output: join(root, "bad"), manifest, keyFile })).rejects.toThrow("Forbidden bundle entry");
  } finally { await rm(root, { recursive: true, force: true }); }
});