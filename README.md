# Flux

> Talk to the grid. Flux turns plain English questions about the EU power mix and emissions into live charts and policy explainers, grounded in EMBER and EU ETS data.

![status: M1 — landing page only](https://img.shields.io/badge/status-M1%20landing-5eead4?style=flat-square)

## Why

Public energy data is rich but hard to query. Flux lets anyone ask "how did Germany's coal share change since 2015?" and get a streamed answer with a chart and citations.

## Features

- Plain-English chat over EMBER yearly electricity and EU ETS sector data
- Tool-calling LLM (Claude) plans queries, picks charts, and cites sources
- Polished landing page with three example prompts, dark-mode by default

## Quickstart

```bash
cd web
npm install
npm run dev
```

Then open http://localhost:3000.

## Repo layout

```
flux/
├─ web/        Next.js 16 app (TypeScript, Tailwind 4, motion)
├─ etl/        Python data prep (uv-managed) — added in M2
└─ docs/       Demo script, screenshots, blog post — added in M5
```

## Roadmap

- [x] **M1** — Next.js scaffold, design system, landing page
- [ ] **M2** — ETL: SQLite snapshot of EMBER + EU ETS CSV
- [ ] **M3** — `/api/ask` with Claude tool calls and SSE streaming
- [ ] **M4** — Charts (Recharts), citations, mobile polish
- [ ] **M5** — Tests, CI, demo script, screenshots, release

## License

[MIT](./LICENSE) © Defne Ertugrul
