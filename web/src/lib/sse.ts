export type SseEvent =
  | { type: "text"; delta: string }
  | { type: "tool_use"; name: string; input: unknown }
  | { type: "chart"; spec: unknown }
  | { type: "citation"; source: string; url: string; detail: string }
  | { type: "meta"; mode: "live" | "demo"; model?: string }
  | { type: "done" }
  | { type: "error"; message: string };

export function encodeSse(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function makeSseStream(
  produce: (send: (event: SseEvent) => void) => Promise<void>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(encodeSse(event)));
      };
      try {
        await produce(send);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;
