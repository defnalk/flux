export type PolicySummary = {
  topic: string;
  title: string;
  summary: string;
  sources: Array<{ label: string; url: string }>;
};

const POLICIES: PolicySummary[] = [
  {
    topic: "eu ets",
    title: "EU Emissions Trading System (EU ETS)",
    summary:
      "The world's first and largest carbon market, covering ~40% of EU greenhouse gas emissions across power, heavy industry, and intra-EEA aviation. Phase IV (2021-2030) tightens the cap by 4.3-4.4% per year and introduces the Market Stability Reserve (MSR) to absorb surplus allowances. The 2023 reform extended coverage to maritime and accelerated the cap reduction.",
    sources: [
      {
        label: "European Commission — EU ETS",
        url: "https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en",
      },
      {
        label: "EEA — ETS dashboard",
        url: "https://www.eea.europa.eu/en/datahub/datahubitem-view/4f55a9ee-b9be-4c5d-8e8d-90e6c66e02c1",
      },
    ],
  },
  {
    topic: "cbam",
    title: "Carbon Border Adjustment Mechanism (CBAM)",
    summary:
      "An EU import levy that mirrors the ETS price for carbon-intensive goods (cement, iron and steel, aluminium, fertilisers, hydrogen, electricity). The transitional phase started October 2023 (reporting only); full financial obligations begin January 2026 alongside the phase-out of free ETS allocations to EU producers in the same sectors.",
    sources: [
      {
        label: "European Commission — CBAM",
        url: "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en",
      },
    ],
  },
  {
    topic: "repowereu",
    title: "REPowerEU",
    summary:
      "The Commission's response to the 2022 energy crisis: speed up renewables, boost energy savings, and diversify supply away from Russian fossil fuels. Headline targets include raising the 2030 renewables share to 45%, doubling solar capacity to 320 GW by 2025 and 600 GW by 2030, and 10 Mt of domestic green hydrogen production by 2030.",
    sources: [
      {
        label: "European Commission — REPowerEU",
        url: "https://commission.europa.eu/strategy-and-policy/priorities-2019-2024/european-green-deal/repowereu-affordable-secure-and-sustainable-energy-europe_en",
      },
    ],
  },
  {
    topic: "msr",
    title: "Market Stability Reserve (MSR)",
    summary:
      "A rule-based mechanism, live since 2019, that automatically removes allowances from auctions when the surplus exceeds 833 Mt and re-injects them when it falls below 400 Mt. The 2023 reform raised the absorption rate to 24% through 2030 and introduced an invalidation cap to prevent indefinite hoarding of allowances.",
    sources: [
      {
        label: "European Commission — MSR",
        url: "https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets/market-stability-reserve_en",
      },
    ],
  },
  {
    topic: "fit for 55",
    title: "Fit for 55 package",
    summary:
      "The legislative bundle aligning EU policy with the binding 55% net-emissions cut by 2030 vs. 1990. Components include the ETS revision (steeper cap, MSR upgrade, maritime + buildings/transport ETS2), CBAM, the Renewable Energy Directive III (42.5% RES target), Effort Sharing, LULUCF, and the Social Climate Fund.",
    sources: [
      {
        label: "European Council — Fit for 55",
        url: "https://www.consilium.europa.eu/en/policies/fit-for-55/",
      },
    ],
  },
  {
    topic: "ember",
    title: "Ember (data provider)",
    summary:
      "An independent energy think tank publishing the open Yearly Electricity Data covering generation, capacity, demand, and power-sector emissions for over 200 countries. Released under CC BY 4.0 and updated annually. Flux uses the long-format release as its grounding data for power-mix questions.",
    sources: [
      {
        label: "Ember — Yearly Electricity Data",
        url: "https://ember-energy.org/data/yearly-electricity-data/",
      },
    ],
  },
];

export function getPolicySummary(topic: string): PolicySummary | null {
  const lower = topic.trim().toLowerCase();
  const exact = POLICIES.find((p) => p.topic === lower);
  if (exact) return exact;
  return POLICIES.find((p) => lower.includes(p.topic) || p.topic.includes(lower)) ?? null;
}

export function listPolicyTopics(): string[] {
  return POLICIES.map((p) => p.topic);
}
