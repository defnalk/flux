import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 mt-auto border-t border-border/60 px-6 py-6 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-muted-2 sm:flex-row">
        <p>
          Built with public data from{" "}
          <a
            href="https://ember-energy.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            EMBER
          </a>{" "}
          and the{" "}
          <a
            href="https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            EU ETS
          </a>
          .
        </p>
        <div className="flex items-center gap-4">
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <a
            href="https://github.com/defnalk/flux"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
