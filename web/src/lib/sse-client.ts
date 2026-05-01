"use client";

import type { SseEvent } from "@/lib/sse";

export type AskStreamHandler = (event: SseEvent) => void;

export async function streamAsk(
  question: string,
  handler: AskStreamHandler,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  });

  if (!response.ok || !response.body) {
    handler({ type: "error", message: `request failed (${response.status})` });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separator: number;
    while ((separator = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const dataLine = raw.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      const json = dataLine.slice(6);
      try {
        const parsed = JSON.parse(json) as SseEvent;
        handler(parsed);
      } catch {
        // skip malformed
      }
    }
  }
}
