export class BodyLimitError extends Error {
  constructor() { super("body_too_large"); this.name = "BodyLimitError"; }
}

/** Enforce the actual byte limit, including chunked and compressed responses. */
export async function readBoundedText(body: Pick<Request, "body" | "headers">, limit: number, timeoutMs = 10_000): Promise<string> {
  const announced = Number(body.headers.get("content-length"));
  if (Number.isFinite(announced) && announced > limit) {
    void body.body?.cancel().catch(() => undefined);
    throw new BodyLimitError();
  }
  const reader = body.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("body_timeout")), timeoutMs);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) return text + decoder.decode();
      total += value.byteLength;
      if (total > limit) throw new BodyLimitError();
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => undefined);
  }
}
