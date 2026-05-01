# Contributing to Flux

Thanks for taking a look. Flux is a small project but PRs are welcome.

## Setup

```bash
git clone https://github.com/defnalk/flux.git
cd flux
make data                # build SQLite + CSV from EMBER (~50MB download, cached)
cd web && npm install && npm run dev
```

You'll need:

- Node 22+ (Node 25 also works locally; Vercel and CI are pinned to 22).
- [uv](https://docs.astral.sh/uv/) for the Python ETL.
- Optionally an `ANTHROPIC_API_KEY` in `web/.env.local` for live Claude calls.
  Without it, `/api/ask` returns a fully-grounded canned answer.

## Development loop

```bash
cd web
npm run dev          # Next.js
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests
npm run test:e2e     # Playwright smoke (starts its own dev server)
```

```bash
cd etl
uv run pytest        # pytest
uv run python build.py --force --verbose   # refresh data
```

## Style

- TypeScript strict, no `any` in committed code.
- Components live under `src/components/{ui,chat,landing,brand}`. Library code under `src/lib`.
- Server-side data access stays in `src/lib/data.ts`; tool handlers in `src/lib/tools.ts`.
- Streaming events flow through `src/lib/sse.ts` (server) and `src/lib/sse-client.ts` (browser).

## PR checklist

- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.
- [ ] If you touched the ETL, `uv run pytest` passes.
- [ ] New behaviour has a test.
- [ ] Screenshots updated in `docs/screenshots/` if the UI changed.

## Reporting bugs

Please open an issue with:

- The question you asked Flux
- What you expected
- What you got (paste the streamed text + chart spec if relevant)
- Browser, OS, and whether you were in `live` or `demo` mode

## Code of Conduct

By participating you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).
