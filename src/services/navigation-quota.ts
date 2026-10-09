import { readBoundedText } from "./bounded-body";

interface Counter { count: number; expiresAt: number }
type Counters = Record<string, Counter>;
export interface QuotaTransaction {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}
export interface QuotaStorage extends QuotaTransaction {
  transaction<T>(callback: (transaction: QuotaTransaction) => Promise<T>): Promise<T>;
}

/** Legacy fetch-compatible Durable Object, with SQLite storage configured in Wrangler. */
export class NavigationQuota {
  private readonly storage: QuotaStorage;
  private readonly hourlyLimit: number;

  constructor(state: { storage: QuotaStorage }, env: Record<string, unknown>) {
    this.storage = state.storage;
    const value = Number(env["NAVIGATION_CREATE_HOURLY_LIMIT"] ?? 100);
    if (!Number.isInteger(value) || value < 1 || value > 10_000) throw new Error("invalid_hourly_quota");
    this.hourlyLimit = value;
  }

  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname !== "/consume" || request.method !== "POST") return new Response(null, { status: 404 });
    let input: unknown;
    try { input = JSON.parse(await readBoundedText(request, 1024, 2_000)); } catch { return new Response(null, { status: 400 }); }
    if (!input || typeof input !== "object" || !("operation" in input) || !("subject" in input) ||
      (input.operation !== "create" && input.operation !== "read") || typeof input.subject !== "string" ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(input.subject)) return new Response(null, { status: 400 });
    const operation = input.operation;
    const subject = input.subject;
    const result = await this.storage.transaction(async (transaction) => {
      const now = Date.now();
      const stored = await transaction.get<Counters>("counters") ?? {};
      const counters: Counters = Object.fromEntries(Object.entries(stored).filter(([, entry]) => entry.expiresAt > now));
      const minute = 60_000;
      const budgets = [{ key: `subject:${operation}:${subject}`, limit: operation === "create" ? 5 : 60, period: minute }];
      if (operation === "create") budgets.push({ key: "budget:create:global", limit: this.hourlyLimit, period: 3_600_000 });
      let retryAfter = 0;
      for (const budget of budgets) {
        const current = counters[budget.key];
        if (current && current.count >= budget.limit) retryAfter = Math.max(retryAfter, Math.ceil((current.expiresAt - now) / 1000));
      }
      if (retryAfter) return { allowed: false, retryAfter };
      for (const budget of budgets) {
        const current = counters[budget.key];
        counters[budget.key] = { count: (current?.count ?? 0) + 1, expiresAt: current?.expiresAt ?? now + budget.period };
      }
      await transaction.put("counters", counters);
      return { allowed: true, retryAfter: 0 };
    });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  }
}
