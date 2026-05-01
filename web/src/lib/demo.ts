/**
 * Canned demo responses used when ANTHROPIC_API_KEY is missing.
 * Each handler runs the real SQL/CSV queries and returns a chart spec
 * grounded in the actual data — only the prose is templated.
 */

import { getGenerationMix, getGenerationSeries, getSectorSeries, resolveCountry } from "@/lib/data";
import { getPolicySummary } from "@/lib/policy";
import type { SseEvent } from "@/lib/sse";
import type { ChartSpec, Citation } from "@/lib/types";

type Send = (event: SseEvent) => void;

const EMBER_CITE: Citation = {
  source: "EMBER",
  url: "https://ember-energy.org/data/yearly-electricity-data/",
  detail: "Yearly electricity data, public release.",
};
const ETS_CITE: Citation = {
  source: "EU ETS",
  url: "https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en",
  detail: "EU ETS verified emissions.",
};

export async function runDemo(question: string, send: Send): Promise<void> {
  send({ type: "meta", mode: "demo" });

  const lower = question.toLowerCase();

  if (lower.includes("germany") && (lower.includes("coal") || lower.includes("share"))) {
    await demoGermanCoal(send);
    return;
  }
  if (lower.includes("wind") && (lower.includes("france") || lower.includes("spain") || lower.includes("poland") || lower.includes("compare"))) {
    await demoWindCompare(send);
    return;
  }
  if (lower.includes("ets") || lower.includes("price reform") || lower.includes("steel")) {
    await demoEtsSteel(send);
    return;
  }

  await demoGeneric(question, send);
}

async function streamText(send: Send, text: string, chunkSize = 24): Promise<void> {
  for (let i = 0; i < text.length; i += chunkSize) {
    send({ type: "text", delta: text.slice(i, i + chunkSize) });
    await new Promise((r) => setTimeout(r, 14));
  }
}

async function demoGermanCoal(send: Send): Promise<void> {
  const series = getGenerationSeries(["Germany"], "Coal", 2015, 2024);
  const wind = getGenerationSeries(["Germany"], "Wind", 2015, 2024);
  const solar = getGenerationSeries(["Germany"], "Solar", 2015, 2024);

  const coal = series[0];
  const first = coal?.data[0];
  const last = coal?.data[coal.data.length - 1];
  const drop =
    first && last && first.twh != null && last.twh != null
      ? Math.round(((first.twh - last.twh) / first.twh) * 100)
      : null;

  const firstTwh = first?.twh ?? null;
  const lastTwh = last?.twh ?? null;
  await streamText(
    send,
    `Germany's coal-fired generation has roughly halved over the last decade. ` +
      (first && last && firstTwh != null && lastTwh != null
        ? `In ${first.year}, coal produced about ${firstTwh.toFixed(0)} TWh; by ${last.year} it was around ${lastTwh.toFixed(0)} TWh — a ${drop}% drop.\n\n`
        : "\n\n") +
      "Wind and solar absorbed most of that share. The Energiewende phase-out of nuclear is mostly complete; the remaining swing factor is gas, which spiked briefly in 2022 during the Russian gas crisis.\n\n" +
      "The chart below tracks the three fuels side-by-side, in TWh.",
  );

  const chart: ChartSpec = {
    kind: "line",
    title: "Germany power generation by fuel (2015–2024)",
    x_label: "Year",
    y_label: "Generation (TWh)",
    series: [
      {
        name: "Coal",
        data: (coal?.data ?? []).map((d) => ({ x: d.year, y: d.twh ?? 0 })),
      },
      {
        name: "Wind",
        data: (wind[0]?.data ?? []).map((d) => ({ x: d.year, y: d.twh ?? 0 })),
      },
      {
        name: "Solar",
        data: (solar[0]?.data ?? []).map((d) => ({ x: d.year, y: d.twh ?? 0 })),
      },
    ],
  };
  send({ type: "chart", spec: chart });
  send({ type: "citation", ...EMBER_CITE });
  send({ type: "done" });
}

async function demoWindCompare(send: Send): Promise<void> {
  const series = getGenerationSeries(["France", "Spain", "Poland"], "Wind", 2015, 2024);

  await streamText(
    send,
    "Wind generation across France, Spain, and Poland has grown from very different starting points.\n\n" +
      "Spain has historically led — its wind buildout in the 2000s gave it an early lead. Poland accelerated hardest in the late 2010s after onshore restrictions were eased. France grew steadily but slower, partly because nuclear already supplies most of its low-carbon power.\n\n" +
      "The chart compares annual wind generation in TWh.",
  );

  const chart: ChartSpec = {
    kind: "line",
    title: "Wind generation: France vs Spain vs Poland (2015–2024)",
    x_label: "Year",
    y_label: "Wind generation (TWh)",
    series: series.map((s) => ({
      name: s.country,
      data: s.data.map((d) => ({ x: d.year, y: d.twh ?? 0 })),
    })),
  };
  send({ type: "chart", spec: chart });
  send({ type: "citation", ...EMBER_CITE });
  send({ type: "done" });
}

async function demoEtsSteel(send: Send): Promise<void> {
  const policy = getPolicySummary("EU ETS");
  const steelSeries = getSectorSeries("Iron and steel", 2013, 2024);
  const priceSeries = getSectorSeries("Power and heat", 2013, 2024);

  await streamText(
    send,
    `${policy?.summary ?? "The EU ETS is the bloc's flagship cap-and-trade system."}\n\n` +
      "For iron and steel specifically, free allocation kept verified emissions roughly in line with handouts through Phase III. The 2023 reform changed the trajectory: free allocation phases out from 2026 to 2034 in lockstep with CBAM ramping up at the border, so domestic mills face the full carbon price for the first time.\n\n" +
      "The chart shows the EUA price, which is the lever that forces the structural change.",
  );

  const chart: ChartSpec = {
    kind: "line",
    title: "EU ETS allowance price (€/t CO₂)",
    x_label: "Year",
    y_label: "EUA price (€/t)",
    series: [
      {
        name: "EUA price",
        data: priceSeries.map((p) => ({ x: p.year, y: p.price })),
      },
      {
        name: "Iron & steel verified Mt",
        data: steelSeries.map((p) => ({ x: p.year, y: p.mt })),
      },
    ],
  };
  send({ type: "chart", spec: chart });
  send({ type: "citation", ...ETS_CITE });
  send({ type: "done" });
}

async function demoGeneric(question: string, send: Send): Promise<void> {
  // Try to pick a country mentioned, fall back to Germany 2024.
  const words = question.split(/[\s,?.;:!]+/).filter(Boolean);
  let resolved = null as ReturnType<typeof resolveCountry>;
  for (const w of words) {
    const r = resolveCountry(w);
    if (r) {
      resolved = r;
      break;
    }
  }
  const country = resolved?.name ?? "Germany";
  const year = 2024;
  const mix = getGenerationMix(country, year);

  await streamText(
    send,
    `Without an Anthropic API key set I can't plan a tool call, but the data is still live. Here's the ${year} generation mix for ${country}.\n\n` +
      "Set ANTHROPIC_API_KEY in `.env.local` to enable the full tool-calling chat with follow-ups.\n\n",
  );

  if (mix) {
    const chart: ChartSpec = {
      kind: "bar",
      title: `${country} ${year} generation mix (TWh)`,
      x_label: "Fuel",
      y_label: "Generation (TWh)",
      series: [
        {
          name: country,
          data: mix.by_fuel
            .filter((f) => f.twh != null)
            .map((f) => ({ x: f.fuel, y: f.twh ?? 0 })),
        },
      ],
    };
    send({ type: "chart", spec: chart });
    send({ type: "citation", ...EMBER_CITE });
  }
  send({ type: "done" });
}
