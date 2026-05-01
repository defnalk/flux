import { readFileSync } from "node:fs";
import path from "node:path";

import { getDb } from "@/lib/db";
import type { EmissionsRow, GenerationMix } from "@/lib/types";

export const COUNTRY_ALIASES: Record<string, string> = {
  germany: "DEU", deutschland: "DEU", de: "DEU",
  france: "FRA", francia: "FRA", fr: "FRA",
  spain: "ESP", españa: "ESP", espana: "ESP", es: "ESP",
  italy: "ITA", italia: "ITA", it: "ITA",
  poland: "POL", polska: "POL", pl: "POL",
  netherlands: "NLD", "the netherlands": "NLD", holland: "NLD", nl: "NLD",
  belgium: "BEL", be: "BEL",
  austria: "AUT", at: "AUT",
  sweden: "SWE", se: "SWE",
  denmark: "DNK", dk: "DNK",
  finland: "FIN", fi: "FIN",
  ireland: "IRL", ie: "IRL",
  portugal: "PRT", pt: "PRT",
  greece: "GRC", hellas: "GRC", gr: "GRC",
  czechia: "CZE", "czech republic": "CZE", cz: "CZE",
  hungary: "HUN", hu: "HUN",
  romania: "ROU", ro: "ROU",
  bulgaria: "BGR", bg: "BGR",
  croatia: "HRV", hr: "HRV",
  slovakia: "SVK", sk: "SVK",
  slovenia: "SVN", si: "SVN",
  estonia: "EST", ee: "EST",
  latvia: "LVA", lv: "LVA",
  lithuania: "LTU", lt: "LTU",
  luxembourg: "LUX", lu: "LUX",
  cyprus: "CYP", cy: "CYP",
  malta: "MLT", mt: "MLT",
  "united kingdom": "GBR", uk: "GBR", britain: "GBR", "great britain": "GBR", gb: "GBR",
  norway: "NOR", no: "NOR",
  switzerland: "CHE", ch: "CHE",
  iceland: "ISL", is: "ISL",
};

export function resolveCountry(input: string): { iso3: string; name: string } | null {
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();
  const db = getDb();

  if (/^[A-Z]{3}$/.test(upper)) {
    const row = db.prepare("SELECT iso3, name FROM countries WHERE iso3 = ?").get(upper) as
      | { iso3: string; name: string }
      | undefined;
    if (row) return row;
  }

  const aliased = COUNTRY_ALIASES[lower];
  if (aliased) {
    const row = db.prepare("SELECT iso3, name FROM countries WHERE iso3 = ?").get(aliased) as
      | { iso3: string; name: string }
      | undefined;
    if (row) return row;
  }

  const row = db
    .prepare("SELECT iso3, name FROM countries WHERE LOWER(name) = ?")
    .get(lower) as { iso3: string; name: string } | undefined;
  return row ?? null;
}

export function getGenerationMix(country: string, year: number): GenerationMix | null {
  const resolved = resolveCountry(country);
  if (!resolved) return null;
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT fuel, twh FROM generation
       WHERE country_iso3 = ? AND year = ?
       ORDER BY twh DESC`,
    )
    .all(resolved.iso3, year) as Array<{ fuel: string; twh: number | null }>;

  const totalRow = db
    .prepare("SELECT twh FROM generation_total WHERE country_iso3 = ? AND year = ?")
    .get(resolved.iso3, year) as { twh: number | null } | undefined;

  const total = totalRow?.twh ?? rows.reduce((acc, r) => acc + (r.twh ?? 0), 0);

  return {
    country: resolved.name,
    iso3: resolved.iso3,
    year,
    total_twh: total,
    by_fuel: rows.map((r) => ({
      fuel: r.fuel,
      twh: r.twh,
      share_pct: total && r.twh != null ? (r.twh / total) * 100 : null,
    })),
  };
}

export function getGenerationSeries(
  countries: string[],
  fuel: string,
  yearFrom: number,
  yearTo: number,
): Array<{ country: string; iso3: string; data: Array<{ year: number; twh: number | null }> }> {
  const db = getDb();
  const out: Array<{ country: string; iso3: string; data: Array<{ year: number; twh: number | null }> }> = [];
  for (const c of countries) {
    const resolved = resolveCountry(c);
    if (!resolved) continue;
    const rows = db
      .prepare(
        `SELECT year, twh FROM generation
         WHERE country_iso3 = ? AND fuel = ? AND year BETWEEN ? AND ?
         ORDER BY year`,
      )
      .all(resolved.iso3, fuel, yearFrom, yearTo) as Array<{ year: number; twh: number | null }>;
    out.push({ country: resolved.name, iso3: resolved.iso3, data: rows });
  }
  return out;
}

export function getCountryEmissionsTotal(country: string, year: number): { mt_co2: number | null } | null {
  const resolved = resolveCountry(country);
  if (!resolved) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT mt_co2 FROM emissions_total WHERE country_iso3 = ? AND year = ?")
    .get(resolved.iso3, year) as { mt_co2: number | null } | undefined;
  return row ?? null;
}

let _euEtsRows: EmissionsRow[] | null = null;

function loadEuEts(): EmissionsRow[] {
  if (_euEtsRows) return _euEtsRows;
  const csvPath = path.join(process.cwd(), "data", "eu_ets.csv");
  const txt = readFileSync(csvPath, "utf-8");
  const [headerLine, ...lines] = txt.trim().split("\n");
  const headers = headerLine.split(",");
  _euEtsRows = lines.map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return {
      year: Number(row.year),
      sector: row.sector,
      verified_emissions_mt_co2e: Number(row.verified_emissions_mt_co2e),
      free_allocation_mt: Number(row.free_allocation_mt),
      allowance_price_eur: Number(row.allowance_price_eur),
      note: row.note || null,
    } satisfies EmissionsRow;
  });
  return _euEtsRows;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

export function getSectorEmissions(sector: string, year: number): EmissionsRow | null {
  const rows = loadEuEts();
  const lower = sector.trim().toLowerCase();
  const found = rows.find(
    (r) => r.year === year && r.sector.toLowerCase() === lower,
  );
  if (found) return found;
  // Fuzzy: contains match
  return rows.find((r) => r.year === year && r.sector.toLowerCase().includes(lower)) ?? null;
}

export function listEtsSectors(): string[] {
  return Array.from(new Set(loadEuEts().map((r) => r.sector))).sort();
}

export function getSectorSeries(
  sector: string,
  yearFrom: number,
  yearTo: number,
): Array<{ year: number; mt: number; price: number }> {
  const rows = loadEuEts();
  const lower = sector.trim().toLowerCase();
  return rows
    .filter(
      (r) =>
        r.year >= yearFrom &&
        r.year <= yearTo &&
        (r.sector.toLowerCase() === lower || r.sector.toLowerCase().includes(lower)),
    )
    .map((r) => ({
      year: r.year,
      mt: r.verified_emissions_mt_co2e,
      price: r.allowance_price_eur,
    }))
    .sort((a, b) => a.year - b.year);
}

