"""Tests for the Flux ETL.

These run against a small synthetic EMBER-shaped DataFrame so they exercise the
filtering and reshaping logic without depending on a 50MB network download.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd
import pytest

import build


@pytest.fixture
def synthetic_ember() -> pd.DataFrame:
    rows = []
    fuels = ["Coal", "Gas", "Wind", "Solar", "Nuclear", "Hydro", "Bioenergy", "Other Fossil", "Other Renewables"]
    for iso3, name, eu in [
        ("DEU", "Germany", 1.0),
        ("FRA", "France", 1.0),
        ("GBR", "United Kingdom", 0.0),
        ("USA", "United States", 0.0),
        ("AFG", "Afghanistan", 0.0),
    ]:
        for year in (2015, 2020, 2024):
            for fuel in fuels:
                rows.append({
                    "country": name, "iso3": iso3, "year": year, "eu": eu,
                    "category": "Electricity generation", "subcategory": "Fuel",
                    "variable": fuel, "unit": "TWh",
                    "value": float(year - 2000 + len(fuel)),
                })
                rows.append({
                    "country": name, "iso3": iso3, "year": year, "eu": eu,
                    "category": "Power sector emissions", "subcategory": "Fuel",
                    "variable": fuel, "unit": "mtCO2",
                    "value": float(year - 2000) / 2,
                })
            rows.append({
                "country": name, "iso3": iso3, "year": year, "eu": eu,
                "category": "Electricity generation", "subcategory": "Total",
                "variable": "Total Generation", "unit": "TWh",
                "value": 500.0,
            })
            rows.append({
                "country": name, "iso3": iso3, "year": year, "eu": eu,
                "category": "Power sector emissions", "subcategory": "Total",
                "variable": "Total emissions", "unit": "mtCO2",
                "value": 100.0,
            })
            rows.append({
                "country": name, "iso3": iso3, "year": year, "eu": eu,
                "category": "Power sector emissions", "subcategory": "CO2 intensity",
                "variable": "CO2 intensity", "unit": "gCO2/kWh",
                "value": 250.0,
            })
            rows.append({
                "country": name, "iso3": iso3, "year": year, "eu": eu,
                "category": "Capacity", "subcategory": "Fuel",
                "variable": "Wind", "unit": "GW",
                "value": 10.0,
            })
    return pd.DataFrame(rows).astype({"year": "Int64"})


def test_slice_europe_drops_non_european(synthetic_ember: pd.DataFrame) -> None:
    europe = build.slice_europe(synthetic_ember)
    iso3s = set(europe["iso3"].unique())
    assert "DEU" in iso3s
    assert "FRA" in iso3s
    assert "GBR" in iso3s
    assert "USA" not in iso3s
    assert "AFG" not in iso3s


def test_build_countries_marks_eu_membership(synthetic_ember: pd.DataFrame) -> None:
    europe = build.slice_europe(synthetic_ember)
    countries = build.build_countries(europe)
    deu = countries.set_index("iso3").loc["DEU"]
    gbr = countries.set_index("iso3").loc["GBR"]
    assert deu["eu_member"] == 1
    assert gbr["eu_member"] == 0
    assert (countries["european"] == 1).all()


def test_build_generation_only_keeps_known_fuels(synthetic_ember: pd.DataFrame) -> None:
    europe = build.slice_europe(synthetic_ember)
    gen = build.build_generation(europe)
    assert set(gen["fuel"].unique()) <= build.GEN_FUELS
    assert (gen["twh"] > 0).all()


def test_build_emissions_total_one_row_per_country_year(synthetic_ember: pd.DataFrame) -> None:
    europe = build.slice_europe(synthetic_ember)
    et = build.build_emissions_total(europe)
    assert et.duplicated(subset=["country_iso3", "year"]).sum() == 0


def test_write_sqlite_roundtrip(tmp_path: Path, synthetic_ember: pd.DataFrame) -> None:
    europe = build.slice_europe(synthetic_ember)
    out = tmp_path / "flux.sqlite"
    build.write_sqlite(
        out,
        countries=build.build_countries(europe),
        generation=build.build_generation(europe),
        generation_total=build.build_generation_total(europe),
        emissions_by_fuel=build.build_emissions_by_fuel(europe),
        emissions_total=build.build_emissions_total(europe),
        co2_intensity=build.build_co2_intensity(europe),
        capacity=build.build_capacity(europe),
        meta={"generated_at": "test", "ember_url": "test", "rows": "0", "countries": "3"},
    )
    assert out.exists()
    with sqlite3.connect(out) as conn:
        cur = conn.execute("SELECT iso3 FROM countries WHERE eu_member = 1")
        eu_iso3s = {row[0] for row in cur.fetchall()}
        assert {"DEU", "FRA"}.issubset(eu_iso3s)
        cur = conn.execute("SELECT COUNT(*) FROM generation")
        assert cur.fetchone()[0] > 0
        cur = conn.execute("SELECT value FROM meta WHERE key = 'countries'")
        assert cur.fetchone()[0] == "3"


def test_write_eu_ets_normalises_and_copies(tmp_path: Path) -> None:
    seed = tmp_path / "seed.csv"
    seed.write_text(
        "year,sector,verified_emissions_mt_co2e,free_allocation_mt,allowance_price_eur,note\n"
        "2020,Power and heat,572,440,24.74,COVID\n"
        "2019,Power and heat,705,455,24.84,switching\n"
    )
    out = tmp_path / "eu_ets.csv"
    df = build.write_eu_ets(seed, out)
    assert out.exists()
    assert list(df["year"]) == [2019, 2020]
