import { Activity, BarChart3, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Activity,
    title: "Grounded answers",
    body: "Every response cites EMBER yearly electricity data and EU ETS sector emissions. No vibes, just numbers.",
  },
  {
    icon: BarChart3,
    title: "Auto-generated charts",
    body: "Flux picks the right chart for your question — line, stacked area, bar — and renders it inline.",
  },
  {
    icon: BookOpen,
    title: "Policy explainers",
    body: "Ask why the price collapsed in 2013 or what CBAM does. Flux summarises with sources, not slogans.",
  },
] as const;

export function FeatureGrid() {
  return (
    <section
      aria-labelledby="features-heading"
      className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24 pt-8 sm:px-10"
    >
      <h2
        id="features-heading"
        className="sr-only"
      >
        What Flux does
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className={cn(
              "group rounded-card border border-border bg-surface/40 p-6",
              "transition-colors hover:border-border-strong hover:bg-surface/70",
            )}
          >
            <Icon
              aria-hidden
              className="mb-4 h-5 w-5 text-primary transition-transform group-hover:scale-110"
              strokeWidth={2}
            />
            <h3 className="mb-1.5 text-sm font-medium text-foreground">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-muted">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
