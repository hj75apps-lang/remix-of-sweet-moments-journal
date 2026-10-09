import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const runtimeDirectory = process.env["SAL_QUOTA_RUNTIME_DIR"];
const bundle = process.env["SAL_QUOTA_WORKER_BUNDLE"];
const storage = process.env["SAL_QUOTA_STORAGE_DIR"];
assert.ok(runtimeDirectory && bundle && storage, "Configure the backend test directories");
const require = createRequire(path.join(runtimeDirectory, "package.json"));
const { Miniflare } = require("miniflare");
const credential = "a".repeat(48); // Test fixture, unrelated to a production key.
const runtime = new Miniflare({
  durableObjectsPersist: `${storage}-backend`,
  workers: [
    {
      name: "sal-built-launcher", modules: true, rootPath: path.resolve(".output/server"),
      scriptPath: path.resolve(".output/server/index.mjs"), compatibilityDate: "2026-07-06",
      compatibilityFlags: ["nodejs_compat"],
      bindings: {
        NAVIGATION_CONNECT_CREATOR_KEYS_JSON: JSON.stringify({ device: createHash("sha256").update(credential).digest("hex") }),
        NAVIGATION_CONNECT_ALLOWED_ORIGIN: "https://localhost",
      },
      serviceBindings: { NAVIGATION_CONNECT_QUOTA: "sal-quota-for-launcher" },
    },
    {
      name: "sal-quota-for-launcher", modules: true, script: await readFile(bundle, "utf8"),
      compatibilityDate: "2026-07-06",
      bindings: { NAVIGATION_CREATE_HOURLY_LIMIT: "1" },
      durableObjects: { NAVIGATION_QUOTA_STATE: { className: "NavigationQuota", useSQLite: true } },
    },
  ],
});
try {
  const quota = await runtime.getWorker("sal-quota-for-launcher");
  const seed = await quota.fetch("https://quota.internal/consume", { method: "POST", body: JSON.stringify({ operation: "create", subject: "seed" }) });
  assert.equal((await seed.json()).allowed, true);
  const post = (token) => runtime.dispatchFetch("https://launcher.example/api/navigation/trips", {
    method: "POST", headers: { origin: "https://localhost", "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ app: "maps", destination: "Casa" }),
  });
  const denied = await post(credential);
  assert.equal(denied.status, 429, "Built Nitro worker must read its binding and refuse the exhausted quota");
  assert.equal((await denied.json()).error, "rate_limited");
  assert.equal(denied.headers.get("access-control-allow-origin"), "https://localhost");
  assert.ok(Number(denied.headers.get("retry-after")) > 0);
  assert.equal((await post()).status, 401, "An origin alone must not authorize creation");
  assert.equal((await post("b".repeat(48))).status, 401, "An unknown credential must be refused");
  console.log("Built backend PASS: Nitro runtime binding, authenticated quota denial, CORS and anonymous/unknown-key refusal.");
} finally { await runtime.dispose(); }
