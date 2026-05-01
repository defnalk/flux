import {
  getGenerationMix,
  getSectorEmissions,
  listEtsSectors,
} from "@/lib/data";
import { getPolicySummary } from "@/lib/policy";
import type { ChartSpec, Citation } from "@/lib/types";

export const TOOL_NAMES = [
  "get_generation_mix",
  "get_emissions",
  "get_policy_summary",
  "make_chart",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export type ToolDefinition = {
  name: ToolName;
  description: string;
  input_schema: Record<string, unknown>;
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "get_generation_mix",
    description:
      "Get the electricity generation mix (TWh by fuel) for a single European country and year. Use this when the user asks about a country's power mix in a specific year, what share renewables had, or how much coal it generated. Year must be between 2000 and the latest available year (typically last calendar year - 1).",
    input_schema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Country name (e.g. 'Germany') or ISO 3-letter code (e.g. 'DEU').",
        },
        year: { type: "integer", minimum: 2000, maximum: 2030 },
      },
      required: ["country", "year"],
    },
  },
  {
    name: "get_emissions",
    description:
      "Get verified EU ETS emissions for a sector and year, plus that year's average allowance price. Sectors include 'Power and heat', 'Iron and steel', 'Cement and lime', 'Refineries', 'Chemicals', 'Aviation (intra-EEA)'. Use this when the user asks about ETS coverage, how much a sector emitted, or what the price did.",
    input_schema: {
      type: "object",
      properties: {
        sector: { type: "string", description: "ETS sector name." },
        year: { type: "integer", minimum: 2013, maximum: 2030 },
      },
      required: ["sector", "year"],
    },
  },
  {
    name: "get_policy_summary",
    description:
      "Get a short factual summary of an EU energy or climate policy with citations. Topics: 'EU ETS', 'CBAM', 'REPowerEU', 'MSR', 'Fit for 55', 'Ember'.",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Policy or institution name." },
      },
      required: ["topic"],
    },
  },
  {
    name: "make_chart",
    description:
      "Render a chart from data you've already retrieved with the other tools. Call this once you have enough numbers to plot. Always include 'kind' (line, stacked-area, or bar), title, x_label, y_label, and 1+ series. Each series has a name and an array of {x, y} points where x is a year (number) or label (string) and y is a number.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["line", "stacked-area", "bar"] },
        title: { type: "string" },
        x_label: { type: "string" },
        y_label: { type: "string" },
        series: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    x: {},
                    y: { type: "number" },
                  },
                  required: ["x", "y"],
                },
              },
            },
            required: ["name", "data"],
          },
        },
      },
      required: ["kind", "title", "x_label", "y_label", "series"],
    },
  },
];

export type ToolResult = {
  content: string;
  chart?: ChartSpec;
  citation?: Citation;
};

export function runTool(name: string, input: unknown): ToolResult {
  const args = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case "get_generation_mix":
      return runGenerationMix(args);
    case "get_emissions":
      return runEmissions(args);
    case "get_policy_summary":
      return runPolicySummary(args);
    case "make_chart":
      return runMakeChart(args);
    default:
      return { content: JSON.stringify({ error: `unknown tool ${name}` }) };
  }
}

function runGenerationMix(args: Record<string, unknown>): ToolResult {
  const country = String(args.country ?? "");
  const year = Number(args.year ?? NaN);
  if (!country || !Number.isFinite(year)) {
    return { content: JSON.stringify({ error: "country and year are required" }) };
  }
  const mix = getGenerationMix(country, year);
  if (!mix) {
    return {
      content: JSON.stringify({
        error: `no data for ${country} in ${year}. Try one of the 31 European countries (ISO3 or English name) and a year between 2000 and the latest release.`,
      }),
    };
  }
  return {
    content: JSON.stringify(mix),
    citation: {
      source: "EMBER",
      url: "https://ember-energy.org/data/yearly-electricity-data/",
      detail: `Yearly electricity data — ${mix.country}, ${mix.year}.`,
    },
  };
}

function runEmissions(args: Record<string, unknown>): ToolResult {
  const sector = String(args.sector ?? "");
  const year = Number(args.year ?? NaN);
  if (!sector || !Number.isFinite(year)) {
    return { content: JSON.stringify({ error: "sector and year are required" }) };
  }
  const row = getSectorEmissions(sector, year);
  if (!row) {
    return {
      content: JSON.stringify({
        error: `no ETS data for sector '${sector}' in ${year}.`,
        valid_sectors: listEtsSectors(),
      }),
    };
  }
  return {
    content: JSON.stringify(row),
    citation: {
      source: "EU ETS",
      url: "https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en",
      detail: `EU ETS verified emissions — ${row.sector}, ${row.year}.`,
    },
  };
}

function runPolicySummary(args: Record<string, unknown>): ToolResult {
  const topic = String(args.topic ?? "");
  const summary = getPolicySummary(topic);
  if (!summary) {
    return {
      content: JSON.stringify({
        error: `no canned summary for '${topic}'. Try EU ETS, CBAM, REPowerEU, MSR, Fit for 55, Ember.`,
      }),
    };
  }
  return {
    content: JSON.stringify({
      topic: summary.topic,
      title: summary.title,
      summary: summary.summary,
      sources: summary.sources,
    }),
    citation: {
      source: "EU ETS",
      url: summary.sources[0]?.url ?? "",
      detail: summary.title,
    },
  };
}

function runMakeChart(args: Record<string, unknown>): ToolResult {
  const kind = args.kind as ChartSpec["kind"] | undefined;
  if (!kind || !["line", "stacked-area", "bar"].includes(kind)) {
    return { content: JSON.stringify({ error: "invalid chart kind" }) };
  }
  const spec: ChartSpec = {
    kind,
    title: String(args.title ?? "Chart"),
    x_label: String(args.x_label ?? ""),
    y_label: String(args.y_label ?? ""),
    series: Array.isArray(args.series) ? (args.series as ChartSpec["series"]) : [],
  };
  return {
    content: JSON.stringify({ ok: true, rendered: true }),
    chart: spec,
  };
}

