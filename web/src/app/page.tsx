import { ChatInput } from "@/components/landing/chat-input";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { Footer } from "@/components/landing/footer";
import { GridBackground } from "@/components/landing/grid-background";
import { Nav } from "@/components/landing/nav";

export default function HomePage() {
  return (
    <>
      <div className="relative flex flex-col">
        <GridBackground />
        <Nav />
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-12 sm:px-10 sm:pt-20">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted">
            <span className="relative inline-flex h-1.5 w-1.5 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary animate-pulse-soft" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Live on EMBER + EU ETS
          </span>
          <h1 className="text-balance text-center text-5xl font-semibold tracking-tight text-foreground sm:text-7xl">
            Talk to the grid.
          </h1>
          <p className="mt-5 max-w-xl text-balance text-center text-base text-muted sm:text-lg">
            Flux turns plain English questions about the EU power mix and emissions
            into live charts and policy explainers — grounded in the data, not the vibes.
          </p>
          <div className="mt-10 w-full max-w-2xl">
            <ChatInput />
          </div>
        </main>
        <FeatureGrid />
      </div>
      <Footer />
    </>
  );
}
