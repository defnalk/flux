"use client";

import * as React from "react";
import {
  ArrowUp,
  ChevronRight,
  Loader2,
  Sparkles,
  Wrench,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartView } from "@/components/chat/chart-view";
import { streamAsk } from "@/lib/sse-client";
import type { ChartSpec, Citation } from "@/lib/types";
import { cn } from "@/lib/utils";

type ToolEvent = { name: string; input: unknown };

type Mode = "live" | "demo" | null;

export function Conversation({ initialQuestion }: { initialQuestion: string }) {
  const [question, setQuestion] = React.useState(initialQuestion);
  const [followup, setFollowup] = React.useState("");
  const [text, setText] = React.useState("");
  const [charts, setCharts] = React.useState<ChartSpec[]>([]);
  const [citations, setCitations] = React.useState<Citation[]>([]);
  const [tools, setTools] = React.useState<ToolEvent[]>([]);
  const [mode, setMode] = React.useState<Mode>(null);
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const run = React.useCallback((q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setText("");
    setCharts([]);
    setCitations([]);
    setTools([]);
    setMode(null);
    setError(null);
    setStreaming(true);
    setQuestion(q);

    streamAsk(
      q,
      (event) => {
        switch (event.type) {
          case "meta":
            setMode(event.mode);
            break;
          case "text":
            setText((prev) => prev + event.delta);
            break;
          case "tool_use":
            setTools((prev) => [...prev, { name: event.name, input: event.input }]);
            break;
          case "chart":
            setCharts((prev) => [...prev, event.spec as ChartSpec]);
            break;
          case "citation":
            setCitations((prev) => [
              ...prev,
              { source: event.source as Citation["source"], url: event.url, detail: event.detail },
            ]);
            break;
          case "error":
            setError(event.message);
            break;
          case "done":
            setStreaming(false);
            break;
        }
      },
      controller.signal,
    ).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : String(err));
      setStreaming(false);
    });
  }, []);

  React.useEffect(() => {
    if (!initialQuestion) return;
    const timer = setTimeout(() => run(initialQuestion), 0);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [initialQuestion, run]);

  function handleFollowup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = followup.trim();
    if (!trimmed || streaming) return;
    setFollowup("");
    run(trimmed);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 pb-12 pt-6 sm:px-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-2">
          <span>You asked</span>
          {mode && <ModePill mode={mode} />}
        </div>
        <h1 className="text-balance text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
          {question}
        </h1>
      </header>

      <ToolStrip tools={tools} streaming={streaming} />

      <article className="prose prose-invert prose-zinc max-w-none rounded-card border border-border bg-surface/40 p-5 text-sm leading-relaxed text-foreground sm:p-7 sm:text-base">
        {text ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        ) : streaming ? (
          <p className="flex items-center gap-2 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking…
          </p>
        ) : (
          <p className="text-muted">No answer yet.</p>
        )}
        {streaming && text && (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-4 w-1.5 -translate-y-0.5 animate-pulse rounded-sm bg-primary"
          />
        )}
      </article>

      {charts.length > 0 && (
        <section className="flex flex-col gap-4">
          {charts.map((spec, i) => (
            <ChartView key={i} spec={spec} />
          ))}
        </section>
      )}

      {citations.length > 0 && (
        <section
          aria-labelledby="citations-heading"
          className="rounded-card border border-border bg-surface/40 p-5"
        >
          <h2
            id="citations-heading"
            className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-muted-2"
          >
            Sources
          </h2>
          <ul className="flex flex-col gap-2">
            {dedupeCitations(citations).map((c, i) => (
              <li key={`${c.url}-${i}`}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 text-sm transition-colors hover:text-primary"
                >
                  <span className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded-full border border-border bg-surface px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {c.source}
                  </span>
                  <span className="text-foreground">
                    {c.detail}{" "}
                    <ChevronRight className="inline h-3 w-3 -translate-y-0.5 text-muted-2 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <div className="rounded-card border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleFollowup}
        className={cn(
          "sticky bottom-4 z-10 mt-4 flex items-center gap-2 rounded-card border border-border bg-surface/80 px-3 py-2 backdrop-blur-md sm:px-4 sm:py-3",
          "shadow-[0_24px_60px_-30px_rgba(94,234,212,0.25)]",
          "focus-within:border-border-strong",
        )}
      >
        <Sparkles aria-hidden className="h-4 w-4 shrink-0 text-primary" />
        <Input
          value={followup}
          onChange={(e) => setFollowup(e.target.value)}
          placeholder="Ask a follow-up…"
          aria-label="Ask a follow-up"
          className="border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          disabled={streaming}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!followup.trim() || streaming}
          aria-label="Send follow-up"
        >
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

function ModePill({ mode }: { mode: NonNullable<Mode> }) {
  const live = mode === "live";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]",
        live
          ? "border-primary/40 text-primary"
          : "border-border text-muted",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          live ? "bg-primary" : "bg-muted-2",
        )}
      />
      {live ? "live" : "demo"}
    </span>
  );
}

function ToolStrip({ tools, streaming }: { tools: ToolEvent[]; streaming: boolean }) {
  if (tools.length === 0 && !streaming) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tools.map((t, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-2.5 py-1 font-mono text-[11px] text-muted"
        >
          <Wrench className="h-3 w-3 text-primary" />
          {t.name}
        </span>
      ))}
    </div>
  );
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of citations) {
    const key = `${c.source}|${c.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}
