import type { QuotaStorage, QuotaTransaction } from "../services/navigation-quota";

/** Transactional test adapter shared across reconstructed quota instances. */
export function memoryQuotaStorage(): QuotaStorage {
  const values = new Map<string, unknown>();
  const transaction: QuotaTransaction = {
    async get<T>(key: string): Promise<T | undefined> { return structuredClone(values.get(key)) as T | undefined; },
    async put<T>(key: string, value: T): Promise<void> { values.set(key, structuredClone(value)); },
  };
  let previous = Promise.resolve();
  return {
    ...transaction,
    async transaction<T>(callback: (tx: QuotaTransaction) => Promise<T>): Promise<T> {
      const before = previous;
      let release!: () => void;
      previous = new Promise<void>((resolve) => { release = resolve; });
      await before;
      try { return await callback(transaction); } finally { release(); }
    },
  };
}
