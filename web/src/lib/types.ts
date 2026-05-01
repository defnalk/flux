export type GenerationRow = {
  country_iso3: string;
  year: number;
  fuel: string;
  twh: number | null;
};

export type EmissionsRow = {
  year: number;
  sector: string;
  verified_emissions_mt_co2e: number;
  free_allocation_mt: number;
  allowance_price_eur: number;
  note: string | null;
};

export type GenerationMix = {
  country: string;
  iso3: string;
  year: number;
  total_twh: number | null;
  by_fuel: Array<{ fuel: string; twh: number | null; share_pct: number | null }>;
};

export type Citation = {
  source: "EMBER" | "EU ETS";
  url: string;
  detail: string;
};

export type LineSeries = {
  name: string;
  data: Array<{ x: number | string; y: number }>;
};

export type ChartSpec =
  | {
      kind: "line";
      title: string;
      x_label: string;
      y_label: string;
      series: LineSeries[];
    }
  | {
      kind: "stacked-area";
      title: string;
      x_label: string;
      y_label: string;
      series: LineSeries[];
    }
  | {
      kind: "bar";
      title: string;
      x_label: string;
      y_label: string;
      series: LineSeries[];
    };

export type AskRequest = {
  question: string;
  sessionId?: string;
};
