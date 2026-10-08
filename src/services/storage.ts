export interface StorageOptions<T> {
  schema: number;
  validate: (value: unknown) => value is T;
  migrateLegacy?: (value: unknown) => T | null;
}

interface Envelope<T> {
  schema: number;
  data: T;
}

function parse(raw: string | null): unknown {
  if (raw == null) return null;
  try { return JSON.parse(raw) as unknown; } catch { return null; }
}

export function readStored<T>(key: string, fallback: T, options: StorageOptions<T>): T {
  if (typeof localStorage === "undefined") return fallback;
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch { return fallback; }
  const value = parse(raw);
  if (value && typeof value === "object" && "schema" in value && "data" in value) {
    const envelope = value as Partial<Envelope<unknown>>;
    if (envelope.schema === options.schema && options.validate(envelope.data)) return envelope.data;
    // New optional fields can invalidate an older envelope. Migrate its data
    // rather than silently resetting every saved preference to defaults.
    if (envelope.schema === options.schema && options.migrateLegacy) {
      const migrated = options.migrateLegacy(envelope.data);
      if (migrated !== null && migrated !== undefined && options.validate(migrated)) {
        writeStored(key, migrated, options.schema);
        return migrated;
      }
    }
    return fallback;
  }
  const migrated = options.migrateLegacy?.(value);
  if (migrated !== null && migrated !== undefined && options.validate(migrated)) {
    writeStored(key, migrated, options.schema);
    return migrated;
  }
  return fallback;
}

export function writeStored<T>(key: string, data: T, schema: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ schema, data } satisfies Envelope<T>));
  } catch {
    /* Storage is an optional cache; callers retain in-memory state. */
  }
}

export function removeStored(key: string): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.removeItem(key); } catch { /* optional cache */ }
}
