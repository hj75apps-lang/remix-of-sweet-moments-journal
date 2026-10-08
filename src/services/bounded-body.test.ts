import { describe, expect, it, vi } from "vitest";
import { BodyLimitError, readBoundedText } from "./bounded-body";

describe("bounded body reader", () => {
  it("counts UTF-8 bytes, not JavaScript characters", async () => {
    await expect(readBoundedText(new Response("ççç"), 5)).rejects.toBeInstanceOf(BodyLimitError);
    await expect(readBoundedText(new Response("çç"), 4)).resolves.toBe("çç");
  });
  it("cancels an oversized ongoing stream", async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(20)); }, cancel }));
    await expect(readBoundedText(response, 10)).rejects.toBeInstanceOf(BodyLimitError);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("times out a stream that never finishes", async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }));
    await expect(readBoundedText(response, 10, 20)).rejects.toThrow("body_timeout");
    expect(cancel).toHaveBeenCalledOnce();
  });
});
