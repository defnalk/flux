"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPTS = [
  "How did Germany's coal share change between 2015 and 2024?",
  "Compare wind generation across France, Spain, and Poland.",
  "Summarise the EU ETS price reform and what it means for steel.",
] as const;

export function ChatInput() {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    setPending(true);
    router.push(`/chat?q=${encodeURIComponent(trimmed)}`);
  }

  function pickExample(prompt: string) {
    setValue(prompt);
    inputRef.current?.focus();
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "group relative w-full max-w-2xl rounded-card border border-border bg-surface/70 backdrop-blur-md",
          "shadow-[0_24px_60px_-30px_rgba(94,234,212,0.25)] transition-colors",
          "focus-within:border-border-strong focus-within:shadow-[0_24px_80px_-30px_rgba(94,234,212,0.4)]",
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <Sparkles
            aria-hidden
            className="h-4 w-4 shrink-0 text-primary"
            strokeWidth={2}
          />
          <Input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ask about Europe's electricity mix, emissions, or policy…"
            aria-label="Ask Flux a question about European power"
            className="border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!value.trim() || pending}
            aria-label="Ask Flux"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => pickExample(prompt)}
            className={cn(
              "rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted",
              "transition-colors hover:border-border-strong hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {prompt}
          </button>
        ))}
      </div>

    </div>
  );
}
