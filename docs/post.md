# Flux: a chat-first lens on European power

A weekend project I shipped while procrastinating on a fluid mechanics problem set.

## The itch

I keep ending up on EMBER's website. They publish the cleanest open dataset on European electricity — generation by fuel, capacity, emissions, intensity — and they've been doing it for years. Every time I've tried to use it for a piece of writing or a class problem, I've ended up doing the same dance: download the CSV, open it in Pandas, write five lines of `groupby` to find the one number I needed, and then forget where I put the file.

That's a lot of friction for a question like *"how did Germany's coal share change between 2015 and 2024?"* — a question with a precise, public answer that anyone curious about energy policy ought to be able to ask without writing code.

So I built Flux: a chat box that takes plain English, plans tool calls against a SQLite snapshot of EMBER, returns a streamed answer with a chart and citations, and ships in under fifty milliseconds of cold start. I gave it a tagline ("Talk to the grid"), a deep-blue dark theme, and a 60-second demo script, because if I'm going to write throwaway weekend tools at least they should look like real software.

## How it works

The pipeline is short:

1. A Python ETL (uv-managed) downloads the 49MB EMBER CSV, filters to 31 European countries — the 27 EU members plus the UK, Norway, Switzerland, and Iceland — and reshapes it into a 1.4MB SQLite with seven tables: countries, generation, generation totals, emissions by fuel, emissions totals, CO2 intensity, capacity. A small curated CSV holds EU ETS sector emissions and the year's allowance price.
2. A Next.js 16 route handler accepts a question and runs Claude Sonnet 4.6 through a tool-use loop. The tools are: `get_generation_mix(country, year)`, `get_emissions(sector, year)`, `get_policy_summary(topic)`, and `make_chart(spec)`. The first two are SQL queries; the third is a small dictionary of canned summaries with sources; the last just returns a typed chart spec the UI knows how to render.
3. Server-Sent Events stream every text delta, every tool call, every chart spec, and every source pill back to the browser. The chat page displays them as they arrive — markdown text with a blinking caret, tool pills as they fire, a Recharts line/area/bar chart inline, and a deduplicated sources panel at the bottom.
4. If there's no `ANTHROPIC_API_KEY` in the environment, the route falls back to a templated responder that runs the same SQL and returns a real chart with templated prose. So you can clone the repo and demo it without signing up for anything.

The whole thing is dark by default with a teal-mint accent (`#5eead4`) and a violet aurora that drifts behind the hero. I'm not a designer; I just liked the colours.

## What surprised me

Three things.

**`node:sqlite` is great.** I started with `better-sqlite3` and immediately hit a `node-gyp` failure on Node 25. Switching to the stdlib `node:sqlite` (stable since Node 24) took two minutes and removed all native build steps. It's not as feature-rich as better-sqlite3 but for "read this file and answer questions" it's perfect.

**Claude's tool-use loop is more pleasant when you stream.** The first version returned a single non-streaming response. It worked but felt slow because Claude often takes 2-3 seconds to plan and call the first tool. With `messages.stream()` the user sees text immediately as Claude reasons aloud about which tool to call — even if the actual data hasn't arrived yet, the page feels alive. Prompt caching the system prompt + tool definitions means follow-ups in the same session are a clean 80% cheaper.

**Hand-written shadcn beats the registry CLI.** Node 25 + the shadcn CLI hit a TLS issue on my machine and I gave up after one attempt. Writing Button, Input, and the rest by hand took twenty minutes and gave me one less moving part. The shadcn philosophy is "this is your code now," so the CLI is honestly optional once you've internalised it.

## What's next

Multi-turn memory (right now each follow-up is a fresh tool-use loop), more datasets (Eurostat, ENTSO-E hourly), a "compare countries" canonical view that doesn't need a chat at all. Maybe a small forecasting tool that wraps a tiny ARIMA or Prophet model — but only if I can ground it in the same source pills, because the appeal of Flux is *"the numbers are real."*

If you want to play with it: [github.com/defnalk/flux](https://github.com/defnalk/flux). Star it if you like it, open an issue if it breaks. The whole repo is MIT.

— Defne
