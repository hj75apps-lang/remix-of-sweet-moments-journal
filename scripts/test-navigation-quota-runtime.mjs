import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";

const runtimeDirectory = process.env["SAL_QUOTA_RUNTIME_DIR"];
const bundle = process.env["SAL_QUOTA_WORKER_BUNDLE"];
const storage = process.env["SAL_QUOTA_STORAGE_DIR"];
assert.ok(runtimeDirectory && bundle && storage, "Configure the quota test directories");
const require = createRequire(path.join(runtimeDirectory, "package.json"));
const { Miniflare } = require("miniflare");
const options = {
  name: "sal-private-quota-test", modules: true, scriptPath: bundle,
  compatibilityDate: "2026-07-06", durableObjectsPersist: storage,
  durableObjects: { NAVIGATION_QUOTA_STATE: { className: "NavigationQuota", useSQLite: true } },
  bindings: { NAVIGATION_CREATE_HOURLY_LIMIT: "6" },
};
let runtime = new Miniflare(options);
const consume = async (subject) => {
  const response = await runtime.dispatchFetch("https://quota.internal/consume", {
    method: "POST", body: JSON.stringify({ operation: "create", subject }),
  });
  assert.equal(response.status, 200);
  return response.json();
};
try {
  const results = await Promise.all(Array.from({ length: 20 }, () => consume("device")));
  assert.equal(results.filter((result) => result.allowed).length, 5, "Concurrent requests must not exceed the per-device budget");
  assert.equal((await consume("other-device")).allowed, true);
  assert.equal((await consume("third-device")).allowed, false, "The shared hourly budget must span devices");
  await runtime.dispose();
  runtime = new Miniflare(options);
  assert.equal((await consume("new-device")).allowed, false, "SQLite quota must survive a runtime restart");
  console.log("Quota runtime PASS: 20 concurrent calls, shared hourly budget and SQLite persistence after restart.");
} finally { await runtime.dispose(); }
