"""Flux ETL: build SQLite + CSV snapshots from EMBER yearly electricity and EU ETS.

The Next.js app reads the produced files at request time, so this script is the
only place that touches the network. Run via `make data` or `python build.py`.

Outputs (relative to repo root):
  web/data/flux.sqlite   normalised European power data
  web/data/eu_ets.csv    cleaned EU ETS sector emissions
  web/data/meta.json     freshness metadata
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import os
import sqlite3
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import pandas as pd
import requests

LOG = logging.getLogger("flux.etl")

EMBER_URL = (
    "https://storage.googleapis.com/emb-prod-bkt-publicdata/"
    "public-downloads/yearly_full_release_long_format.csv"
)

# 27 EU member states (ISO 3-letter) plus UK / Norway / Switzerland / Iceland.
EU_ISO3 = {
    "AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA",
    "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD",
    "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE",
}
EXTRA_EUROPE = {"GBR", "NOR", "CHE", "ISL"}
EUROPE_ISO3 = EU_ISO3 | EXTRA_EUROPE

GEN_FUELS = {
    "Bioenergy", "Coal", "Gas", "Hydro", "Nuclear",
    "Other Fossil", "Other Renewables", "Solar", "Wind",
}


@dataclass(frozen=True)
class Paths:
    repo_root: Path
    cache_dir: Path
    out_dir: Path
    seed_csv: Path

    @classmethod
    def resolve(cls, repo_root: Path | None = None) -> "Paths":
        here = Path(__file__).resolve().parent
        root = repo_root or here.parent
        return cls(
            repo_root=root,
            cache_dir=root / "etl" / ".cache",
            out_dir=root / "web" / "data",
            seed_csv=here / "eu_ets_seed.csv",
        )


def _setup_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )


def fetch_ember(paths: Paths, *, force: bool = False) -> Path:
    """Download the EMBER yearly CSV, cached locally."""
    paths.cache_dir.mkdir(parents=True, exist_ok=True)
    target = paths.cache_dir / "ember_yearly.csv"
    if target.exists() and not force:
        age_h = (time.time() - target.stat().st_mtime) / 3600
        if age_h < 24 * 7:
            LOG.info("using cached EMBER CSV (%.1fh old) at %s", age_h, target)
            return target
        LOG.info("cache is %.1fh old, re-fetching", age_h)
    LOG.info("downloading EMBER yearly CSV → %s", target)
    response = requests.get(EMBER_URL, timeout=120, stream=True)
    response.raise_for_status()
    with target.open("wb") as fh:
        for chunk in response.iter_content(chunk_size=1 << 16):
            fh.write(chunk)
    return target


def load_ember(csv_path: Path) -> pd.DataFrame:
    """Read the EMBER CSV with the columns we care about."""
    df = pd.read_csv(
        csv_path,
        usecols=[
            "Area", "ISO 3 code", "Year", "EU",
            "Category", "Subcategory", "Variable", "Unit", "Value",
        ],
        dtype={"ISO 3 code": "string", "Area": "string"},
    )
    df = df.rename(columns={
        "Area": "country", "ISO 3 code": "iso3", "Year": "year",
        "EU": "eu", "Category": "category", "Subcategory": "subcategory",
        "Variable": "variable", "Unit": "unit", "Value": "value",
    })
    df["year"] = df["year"].astype("Int64")
    return df


def slice_europe(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["iso3"].isin(EUROPE_ISO3)].copy()


def build_countries(df: pd.DataFrame) -> pd.DataFrame:
    rows = (
        df[["iso3", "country", "eu"]]
        .dropna(subset=["iso3"])
        .drop_duplicates(subset=["iso3"])
        .rename(columns={"country": "name"})
    )
    rows["eu_member"] = rows["iso3"].isin(EU_ISO3).astype(int)
    rows["european"] = 1
    return rows[["iso3", "name", "eu_member", "european"]].sort_values("iso3")


def build_generation(df: pd.DataFrame) -> pd.DataFrame:
    sel = df[
        (df["category"] == "Electricity generation")
        & (df["subcategory"] == "Fuel")
        & (df["unit"] == "TWh")
        & (df["variable"].isin(GEN_FUELS))
    ]
    return (
        sel[["iso3", "year", "variable", "value"]]
        .rename(columns={"iso3": "country_iso3", "variable": "fuel", "value": "twh"})
        .sort_values(["country_iso3", "year", "fuel"])
        .reset_index(drop=True)
    )


def build_generation_total(df: pd.DataFrame) -> pd.DataFrame:
    sel = df[
        (df["category"] == "Electricity generation")
        & (df["variable"] == "Total Generation")
        & (df["unit"] == "TWh")
    ]
    return (
        sel[["iso3", "year", "value"]]
        .rename(columns={"iso3": "country_iso3", "value": "twh"})
        .sort_values(["country_iso3", "year"])
        .reset_index(drop=True)
    )


def build_emissions_by_fuel(df: pd.DataFrame) -> pd.DataFrame:
    sel = df[
        (df["category"] == "Power sector emissions")
        & (df["subcategory"] == "Fuel")
        & (df["unit"] == "mtCO2")
        & (df["variable"].isin(GEN_FUELS))
    ]
    return (
        sel[["iso3", "year", "variable", "value"]]
        .rename(columns={"iso3": "country_iso3", "variable": "fuel", "value": "mt_co2"})
        .sort_values(["country_iso3", "year", "fuel"])
        .reset_index(drop=True)
    )


def build_emissions_total(df: pd.DataFrame) -> pd.DataFrame:
    sel = df[
        (df["category"] == "Power sector emissions")
        & (df["variable"] == "Total emissions")
        & (df["unit"] == "mtCO2")
    ]
    return (
        sel[["iso3", "year", "value"]]
        .rename(columns={"iso3": "country_iso3", "value": "mt_co2"})
        .sort_values(["country_iso3", "year"])
        .reset_index(drop=True)
    )


def build_co2_intensity(df: pd.DataFrame) -> pd.DataFrame:
    sel = df[
        (df["category"] == "Power sector emissions")
        & (df["variable"] == "CO2 intensity")
    ]
    return (
        sel[["iso3", "year", "value"]]
        .rename(columns={"iso3": "country_iso3", "value": "g_co2_per_kwh"})
        .sort_values(["country_iso3", "year"])
        .reset_index(drop=True)
    )


def build_capacity(df: pd.DataFrame) -> pd.DataFrame:
    sel = df[
        (df["category"] == "Capacity")
        & (df["subcategory"] == "Fuel")
        & (df["unit"] == "GW")
        & (df["variable"].isin(GEN_FUELS))
    ]
    return (
        sel[["iso3", "year", "variable", "value"]]
        .rename(columns={"iso3": "country_iso3", "variable": "fuel", "value": "gw"})
        .sort_values(["country_iso3", "year", "fuel"])
        .reset_index(drop=True)
    )


SCHEMA = """
CREATE TABLE countries (
  iso3 TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  eu_member INTEGER NOT NULL,
  european INTEGER NOT NULL
);
CREATE TABLE generation (
  country_iso3 TEXT NOT NULL,
  year INTEGER NOT NULL,
  fuel TEXT NOT NULL,
  twh REAL,
  PRIMARY KEY (country_iso3, year, fuel),
  FOREIGN KEY (country_iso3) REFERENCES countries(iso3)
);
CREATE INDEX idx_gen_country_year ON generation(country_iso3, year);
CREATE INDEX idx_gen_fuel_year ON generation(fuel, year);

CREATE TABLE generation_total (
  country_iso3 TEXT NOT NULL,
  year INTEGER NOT NULL,
  twh REAL,
  PRIMARY KEY (country_iso3, year),
  FOREIGN KEY (country_iso3) REFERENCES countries(iso3)
);

CREATE TABLE emissions_by_fuel (
  country_iso3 TEXT NOT NULL,
  year INTEGER NOT NULL,
  fuel TEXT NOT NULL,
  mt_co2 REAL,
  PRIMARY KEY (country_iso3, year, fuel),
  FOREIGN KEY (country_iso3) REFERENCES countries(iso3)
);

CREATE TABLE emissions_total (
  country_iso3 TEXT NOT NULL,
  year INTEGER NOT NULL,
  mt_co2 REAL,
  PRIMARY KEY (country_iso3, year),
  FOREIGN KEY (country_iso3) REFERENCES countries(iso3)
);

CREATE TABLE co2_intensity (
  country_iso3 TEXT NOT NULL,
  year INTEGER NOT NULL,
  g_co2_per_kwh REAL,
  PRIMARY KEY (country_iso3, year),
  FOREIGN KEY (country_iso3) REFERENCES countries(iso3)
);

CREATE TABLE capacity (
  country_iso3 TEXT NOT NULL,
  year INTEGER NOT NULL,
  fuel TEXT NOT NULL,
  gw REAL,
  PRIMARY KEY (country_iso3, year, fuel),
  FOREIGN KEY (country_iso3) REFERENCES countries(iso3)
);

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
"""


def write_sqlite(
    out_path: Path,
    *,
    countries: pd.DataFrame,
    generation: pd.DataFrame,
    generation_total: pd.DataFrame,
    emissions_by_fuel: pd.DataFrame,
    emissions_total: pd.DataFrame,
    co2_intensity: pd.DataFrame,
    capacity: pd.DataFrame,
    meta: dict[str, str],
) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.exists():
        out_path.unlink()
    conn = sqlite3.connect(out_path)
    try:
        conn.executescript(SCHEMA)
        countries.to_sql("countries", conn, if_exists="append", index=False)
        generation.to_sql("generation", conn, if_exists="append", index=False)
        generation_total.to_sql("generation_total", conn, if_exists="append", index=False)
        emissions_by_fuel.to_sql("emissions_by_fuel", conn, if_exists="append", index=False)
        emissions_total.to_sql("emissions_total", conn, if_exists="append", index=False)
        co2_intensity.to_sql("co2_intensity", conn, if_exists="append", index=False)
        capacity.to_sql("capacity", conn, if_exists="append", index=False)
        conn.executemany(
            "INSERT INTO meta(key, value) VALUES (?, ?)",
            list(meta.items()),
        )
        conn.commit()
        conn.execute("VACUUM")
    finally:
        conn.close()


def write_eu_ets(seed_path: Path, out_path: Path) -> pd.DataFrame:
    df = pd.read_csv(seed_path)
    df = df.sort_values(["sector", "year"]).reset_index(drop=True)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    return df


def write_meta_json(
    out_path: Path,
    *,
    ember_rows: int,
    countries: int,
    eu_ets_rows: int,
) -> None:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "ember": {
                "url": EMBER_URL,
                "rows_after_filter": ember_rows,
                "license": "CC BY 4.0",
                "citation": "Ember (2025). Yearly Electricity Data.",
            },
            "eu_ets": {
                "url": "https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en",
                "rows": eu_ets_rows,
                "note": "Curated sector totals from EEA / EU ETS verified emissions reports.",
            },
        },
        "countries_covered": countries,
    }
    out_path.write_text(json.dumps(payload, indent=2) + "\n")


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="re-fetch EMBER even if cached")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--repo-root", type=Path, default=None)
    args = parser.parse_args(list(argv) if argv is not None else None)

    _setup_logging(args.verbose)
    paths = Paths.resolve(args.repo_root)

    LOG.info("flux ETL starting; outputs → %s", paths.out_dir)

    csv_path = fetch_ember(paths, force=args.force)
    raw = load_ember(csv_path)
    LOG.info("loaded %s rows from EMBER", f"{len(raw):,}")

    europe = slice_europe(raw)
    LOG.info("filtered to Europe: %s rows", f"{len(europe):,}")

    countries = build_countries(europe)
    generation = build_generation(europe)
    generation_total = build_generation_total(europe)
    emissions_by_fuel = build_emissions_by_fuel(europe)
    emissions_total = build_emissions_total(europe)
    co2_intensity = build_co2_intensity(europe)
    capacity = build_capacity(europe)

    LOG.info(
        "tables: countries=%d gen=%d gen_total=%d emis_by_fuel=%d emis_total=%d intensity=%d capacity=%d",
        len(countries), len(generation), len(generation_total),
        len(emissions_by_fuel), len(emissions_total),
        len(co2_intensity), len(capacity),
    )

    sqlite_out = paths.out_dir / "flux.sqlite"
    eu_ets_out = paths.out_dir / "eu_ets.csv"
    meta_out = paths.out_dir / "meta.json"

    eu_ets = write_eu_ets(paths.seed_csv, eu_ets_out)

    write_sqlite(
        sqlite_out,
        countries=countries,
        generation=generation,
        generation_total=generation_total,
        emissions_by_fuel=emissions_by_fuel,
        emissions_total=emissions_total,
        co2_intensity=co2_intensity,
        capacity=capacity,
        meta={
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "ember_url": EMBER_URL,
            "rows": str(len(generation) + len(emissions_by_fuel)),
            "countries": str(len(countries)),
        },
    )

    write_meta_json(
        meta_out,
        ember_rows=len(europe),
        countries=len(countries),
        eu_ets_rows=len(eu_ets),
    )

    LOG.info("done. sqlite=%s eu_ets=%s meta=%s", sqlite_out, eu_ets_out, meta_out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
