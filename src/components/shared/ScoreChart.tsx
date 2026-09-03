import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTheme } from "@/hooks/useTheme";

/**
 * Chart color system — validated with the dataviz palette validator in both
 * modes (lightness band, chroma floor, CVD separation, normal-vision floor,
 * contrast: ALL PASS). Categorical order is FIXED (green → persimmon →
 * blue → plum) and never cycled; charts with one measure across categories
 * use the single primary hue instead. Every chart renders a legend, axis
 * labels, and tooltips.
 */
export function useChartColors() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return useMemo(
    () => ({
      series: dark
        ? ["#3FA877", "#DD682B", "#5B8FD9", "#C9679E"]
        : ["#1F8A5D", "#D3541A", "#2F6FC2", "#B0437C"],
      primary: dark ? "#3FA877" : "#1F8A5D",
      grid: dark ? "rgba(214,205,180,0.12)" : "rgba(25,22,17,0.12)",
      axis: dark ? "#9C957F" : "#6B6555",
      status: {
        completed: dark ? "#3FA877" : "#1F8A5D",
        scheduled: dark ? "#5B8FD9" : "#2F6FC2",
        active: dark ? "#DD682B" : "#D3541A",
        cancelled: dark ? "#D95C4C" : "#A3392B",
        draft: dark ? "#8A8471" : "#958E79",
      } as Record<string, string>,
    }),
    [dark],
  );
}

interface TooltipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  unit = "%",
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      {label != null && label !== "" && <p className="mb-1 font-medium text-muted-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} aria-hidden="true" />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="score-mono ml-auto pl-3 font-semibold text-foreground">
              {typeof entry.value === "number" ? Math.round(entry.value) : entry.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-2">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export interface SeriesPoint {
  label: string;
  [series: string]: string | number | null;
}

interface ProgressLineChartProps {
  data: SeriesPoint[];
  /** Series keys in display order (colors follow the fixed categorical order). */
  series: Array<{ key: string; label: string }>;
  height?: number;
  yDomain?: [number, number];
}

/** Multi-series score progress over time. */
export function ProgressLineChart({ data, series, height = 260, yDomain = [0, 100] }: ProgressLineChartProps) {
  const colors = useChartColors();
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: colors.grid }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={yDomain}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: colors.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: colors.grid, strokeWidth: 1 }} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colors.series[i % colors.series.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {series.length >= 2 && (
        <SimpleLegend
          items={series.map((s, i) => ({ label: s.label, color: colors.series[i % colors.series.length] }))}
        />
      )}
    </div>
  );
}

interface ScoreBarChartProps {
  data: Array<{ label: string; value: number | null }>;
  height?: number;
  /** Single measure across categories → single hue (not categorical). */
  color?: string;
  unit?: string;
  /** When true the y-axis auto-scales for counts instead of the 0–100 score band. */
  counts?: boolean;
}

export function ScoreBarChart({ data, height = 240, color, unit = "%", counts = false }: ScoreBarChartProps) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }} barCategoryGap="28%">
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: colors.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: colors.grid }}
        />
        {counts ? (
          <YAxis allowDecimals={false} tick={{ fill: colors.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
        ) : (
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: colors.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
        )}
        <Tooltip content={<ChartTooltip unit={counts ? "" : unit} />} cursor={{ fill: colors.grid }} />
        <Bar
          dataKey="value"
          name={counts ? "Count" : "Score"}
          fill={color ?? colors.primary}
          radius={[4, 4, 0, 0]}
          maxBarSize={44}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface StatusBarChartProps {
  data: Array<{ label: string; value: number; statusKey: string }>;
  height?: number;
}

/** Counts by interview status — reserved status palette, labeled bars. */
export function StatusBarChart({ data, height = 240 }: StatusBarChartProps) {
  const colors = useChartColors();
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -22 }} barCategoryGap="30%">
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: colors.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: colors.grid }} />
          <YAxis allowDecimals={false} tick={{ fill: colors.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip unit="" />} cursor={{ fill: colors.grid }} />
          <Bar dataKey="value" name="Interviews" radius={[4, 4, 0, 0]} maxBarSize={44}>
            {data.map((entry) => (
              <Cell key={entry.statusKey} fill={colors.status[entry.statusKey] ?? colors.primary} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CompetencyRadarProps {
  data: Array<{ label: string; value: number | null }>;
  height?: number;
  seriesLabel?: string;
}

export function CompetencyRadar({ data, height = 280, seriesLabel = "Score" }: CompetencyRadarProps) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={colors.grid} />
        <PolarAngleAxis dataKey="label" tick={{ fill: colors.axis, fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Radar
          name={seriesLabel}
          dataKey="value"
          stroke={colors.primary}
          strokeWidth={2}
          fill={colors.primary}
          fillOpacity={0.18}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
