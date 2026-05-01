"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartSpec } from "@/lib/types";

const PALETTE = [
  "#5eead4",
  "#a78bfa",
  "#f472b6",
  "#fbbf24",
  "#60a5fa",
  "#34d399",
  "#f87171",
];

type RowMap = Record<string, number | string | null>;

function flattenSeries(spec: ChartSpec): { rows: RowMap[]; seriesNames: string[] } {
  const xs = new Set<number | string>();
  for (const s of spec.series) for (const p of s.data) xs.add(p.x);
  const sortedXs = [...xs].sort((a, b) => {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b));
  });
  const seriesNames = spec.series.map((s) => s.name);
  const rows = sortedXs.map((x) => {
    const row: RowMap = { x };
    for (const s of spec.series) {
      const found = s.data.find((p) => p.x === x);
      row[s.name] = found?.y ?? null;
    }
    return row;
  });
  return { rows, seriesNames };
}

function ChartFrame({
  title,
  yLabel,
  children,
}: {
  title: string;
  yLabel: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="rounded-card border border-border bg-surface/40 p-4 sm:p-5">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-2">
          {yLabel}
        </span>
      </figcaption>
      <div className="h-[280px] w-full sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

const tooltipStyle = {
  backgroundColor: "#0e1320",
  border: "1px solid #2a3247",
  borderRadius: "0.5rem",
  fontSize: "12px",
};

export function ChartView({ spec }: { spec: ChartSpec }) {
  const { rows, seriesNames } = flattenSeries(spec);

  if (spec.kind === "line") {
    return (
      <ChartFrame title={spec.title} yLabel={spec.y_label}>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="#1c2333" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="x" stroke="#5b6473" tick={{ fontSize: 11 }} />
          <YAxis stroke="#5b6473" tick={{ fontSize: 11 }} width={48} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#2a3247" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {seriesNames.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ChartFrame>
    );
  }

  if (spec.kind === "stacked-area") {
    return (
      <ChartFrame title={spec.title} yLabel={spec.y_label}>
        <AreaChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="#1c2333" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="x" stroke="#5b6473" tick={{ fontSize: 11 }} />
          <YAxis stroke="#5b6473" tick={{ fontSize: 11 }} width={48} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#2a3247" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {seriesNames.map((name, i) => (
            <Area
              key={name}
              type="monotone"
              dataKey={name}
              stackId="1"
              stroke={PALETTE[i % PALETTE.length]}
              fill={PALETTE[i % PALETTE.length]}
              fillOpacity={0.32}
            />
          ))}
        </AreaChart>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title={spec.title} yLabel={spec.y_label}>
      <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke="#1c2333" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="x" stroke="#5b6473" tick={{ fontSize: 11 }} />
        <YAxis stroke="#5b6473" tick={{ fontSize: 11 }} width={48} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#11182a" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {seriesNames.map((name, i) => (
          <Bar
            key={name}
            dataKey={name}
            fill={PALETTE[i % PALETTE.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}
