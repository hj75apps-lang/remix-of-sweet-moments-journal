import { beforeEach, describe, expect, it } from "vitest";
import { readStored, writeStored } from "./storage";

describe("versioned storage", () => {
  beforeEach(() => localStorage.clear());

  const options = {
    schema: 2,
    validate: (value: unknown): value is { value: string } =>
      !!value && typeof value === "object" && typeof (value as { value?: unknown }).value === "string",
    migrateLegacy: (value: unknown) =>
      value && typeof value === "object" && typeof (value as { value?: unknown }).value === "string"
        ? { value: (value as { value: string }).value }
        : null,
  };

  it("writes an envelope and reads the same schema", () => {
    writeStored("x", { value: "ok" }, 2);
    expect(readStored("x", { value: "fallback" }, options)).toEqual({ value: "ok" });
  });

  it("migrates legacy raw values", () => {
    localStorage.setItem("x", JSON.stringify({ value: "legacy" }));
    expect(readStored("x", { value: "fallback" }, options)).toEqual({ value: "legacy" });
    expect(JSON.parse(localStorage.getItem("x") ?? "{}")).toEqual({ schema: 2, data: { value: "legacy" } });
  });

  it("rejects a newer schema", () => {
    localStorage.setItem("x", JSON.stringify({ schema: 3, data: { value: "new" } }));
    expect(readStored("x", { value: "fallback" }, options)).toEqual({ value: "fallback" });
  });
});
