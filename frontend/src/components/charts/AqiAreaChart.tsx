"use client";

import React from "react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { AqiTimePoint } from "@/types";
import { Chip, SourceStamp } from "@/components/ui-aeriq";

interface ChartRow {
  label: string;
  observed: number | null;
  forecast: number | null;
  raw: AqiTimePoint;
}

export function AqiAreaChart({
  data,
  height = 280,
}: {
  data: AqiTimePoint[];
  height?: number;
}) {
  const firstForecastIdx = data.findIndex((d) => d.isForecast);
  const rows: ChartRow[] = data.map((d, i) => ({
    label: d.label,
    observed: !d.isForecast ? d.aqi : null,
    // Connect forecast line from the last observed point
    forecast:
      d.isForecast || (firstForecastIdx > 0 && i === firstForecastIdx - 1)
        ? d.aqi
        : null,
    raw: d,
  }));

  return (
    <div className="relative w-full">
      {firstForecastIdx >= 0 && (
        <div className="flex justify-end mb-2">
          <Chip variant="ghost">Forecast</Chip>
        </div>
      )}

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
          >
            {/* AQI category bands at 8% opacity */}
            <ReferenceArea y1={0} y2={50} fill="#4f8a12" fillOpacity={0.08} />
            <ReferenceArea y1={50} y2={100} fill="#a9dd3a" fillOpacity={0.08} />
            <ReferenceArea y1={100} y2={200} fill="#e2c044" fillOpacity={0.08} />
            <ReferenceArea y1={200} y2={300} fill="#e38a3c" fillOpacity={0.08} />
            <ReferenceArea y1={300} y2={400} fill="#d1493b" fillOpacity={0.08} />

            <CartesianGrid
              vertical={false}
              stroke="rgba(16,41,26,0.1)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#6a7a6f",
                fontSize: 10,
                fontFamily: "var(--mono)",
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              domain={[0, 320]}
              tick={{
                fill: "#6a7a6f",
                fontSize: 10,
                fontFamily: "var(--mono)",
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as ChartRow;
                const d = row.raw;
                return (
                  <div className="rounded-[10px] bg-[var(--glass-dark)] border border-white/22 backdrop-blur-[16px] text-white p-3 shadow-lg max-w-[260px]">
                    <div className="font-mono text-[13px] font-medium">
                      AQI {d.aqi ?? "Unavailable"} · {d.category}
                    </div>
                    <div className="mt-1.5">
                      <SourceStamp
                        provider={d.provider}
                        station={d.station}
                        observedAt={d.timestamp}
                        isForecast={d.isForecast}
                        className="text-white/75"
                      />
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="observed"
              stroke="var(--ink)"
              strokeWidth={1.6}
              fill="var(--lime)"
              fillOpacity={0.18}
              animationDuration={900}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="var(--ink2)"
              strokeWidth={1.6}
              strokeDasharray="4 4"
              dot={{ r: 2.5, fill: "var(--ink2)" }}
              animationDuration={900}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Visually hidden accessible table fallback */}
      <table className="sr-only">
        <caption>AQI history and forecast</caption>
        <thead>
          <tr>
            <th>Time</th>
            <th>AQI</th>
            <th>Category</th>
            <th>Type</th>
            <th>Provider</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{d.aqi ?? "Unavailable"}</td>
              <td>{d.category}</td>
              <td>{d.isForecast ? "Forecast" : "Observation"}</td>
              <td>{d.provider}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
