import { describe, expect, it } from "vitest";

import { encodeSse, makeSseStream } from "./sse";

describe("encodeSse", () => {
  it("emits an event line and a JSON data line", () => {
    const out = encodeSse({ type: "text", delta: "hello" });
    expect(out).toContain("event: text\n");
    expect(out).toContain('"type":"text"');
    expect(out.endsWith("\n\n")).toBe(true);
  });
});

describe("makeSseStream", () => {
  it("produces events from the producer and closes cleanly", async () => {
    const stream = makeSseStream(async (send) => {
      send({ type: "meta", mode: "demo" });
      send({ type: "text", delta: "hi" });
      send({ type: "done" });
    });
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value);
    }
    expect(buf).toContain("event: meta");
    expect(buf).toContain("event: text");
    expect(buf).toContain("event: done");
  });

  it("emits an error event when the producer throws", async () => {
    const stream = makeSseStream(async () => {
      throw new Error("boom");
    });
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value);
    }
    expect(buf).toContain("event: error");
    expect(buf).toContain("boom");
  });
});
