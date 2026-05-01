import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "About — Flux",
  description:
    "Flux is a chat-first lens on European power and emissions, by Defne Ertugrul.",
};

const LINKS = [
  { label: "GitHub", href: "https://github.com/defnalk" },
  { label: "Portfolio", href: "https://github.com/defnalk" },
  { label: "Email", href: "mailto:defnertugrul@gmail.com" },
] as const;

const CREDITS = [
  {
    name: "EMBER",
    blurb:
      "Yearly electricity data covering generation, capacity, and emissions across Europe.",
    href: "https://ember-energy.org",
  },
  {
    name: "EU ETS",
    blurb:
      "European Commission emissions trading dataset — sector-level CO₂ and free allocation.",
    href: "https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en",
  },
  {
    name: "Anthropic",
    blurb:
      "Claude (claude-sonnet-4-6) for tool planning and grounded explanation.",
    href: "https://www.anthropic.com",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="px-6 py-5 sm:px-10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <Logo />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-16 pt-8 sm:px-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          About Flux
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Flux is a chat-first lens on European power and emissions. Ask in
          plain English, get a streamed answer, a chart, and citations — backed
          by EMBER yearly electricity data and the EU ETS dataset.
        </p>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
          Built by{" "}
          <a
            href="https://github.com/defnalk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-primary"
          >
            Defne Ertugrul
          </a>
          {" "}— Chemical Engineering at Imperial, focused on energy and
          decarbonisation tooling.
        </p>

        <section className="mt-10">
          <h2 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-2">
            Find me
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {LINKS.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-card border border-border bg-surface/40 px-4 py-3 text-sm transition-colors hover:border-border-strong hover:bg-surface/70"
                >
                  <span className="text-foreground">{label}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-2 transition-colors group-hover:text-primary" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-2">
            Credits
          </h2>
          <ul className="mt-3 space-y-2">
            {CREDITS.map(({ name, blurb, href }) => (
              <li
                key={name}
                className="rounded-card border border-border bg-surface/40 px-4 py-3"
              >
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                >
                  {name}
                </a>
                <p className="mt-1 text-sm text-muted">{blurb}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}
