# Flux ETL

uv-managed Python ETL that turns the public EMBER yearly electricity dataset
plus a curated EU ETS sector seed into the SQLite + CSV the Flux web app reads
at runtime.

## Run

```bash
cd etl
uv sync --extra dev
uv run python build.py            # uses cache if fresh
uv run python build.py --force    # re-download EMBER (~50MB)
uv run pytest                     # tests
```

Or from the repo root:

```bash
make data        # refresh
make test-etl    # tests
```

## Outputs

- `web/data/flux.sqlite` — countries, generation, emissions, capacity, intensity
- `web/data/eu_ets.csv` — EU ETS sector emissions
- `web/data/meta.json` — provenance + freshness metadata

## Schedule

`.github/workflows/etl-refresh.yml` runs the ETL on the 1st of every month and
opens a pull request if the data has changed.

## Sources

- **EMBER Yearly Electricity** — CC BY 4.0. `https://ember-energy.org/data/yearly-electricity-data/`
- **EU ETS** — verified emissions and free allocation, EEA / European Commission.
  Seeded from public reports; replace `eu_ets_seed.csv` to refresh.
