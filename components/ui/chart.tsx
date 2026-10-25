"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color?: string;
    icon?: React.ComponentType;
  }
>;

type ChartContextValue = { config: ChartConfig };

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart(): ChartContextValue {
  const value = React.useContext(ChartContext);
  if (!value) throw new Error("useChart must be used inside <ChartContainer>");
  return value;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  const style = Object.entries(config).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value.color) acc[`--color-${key}`] = value.color;
    return acc;
  }, {});

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        style={style}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

type TooltipItem = {
  dataKey?: string | number | ((obj: unknown) => unknown);
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
};

function formatValue(value: TooltipItem["value"]): string {
  if (Array.isArray(value)) return value.join(" – ");
  if (typeof value === "number") return value.toLocaleString();
  return value == null ? "" : String(value);
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  hideIndicator = false,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: React.ReactNode;
  className?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "grid min-w-32 gap-1.5 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg",
        className,
      )}
    >
      {!hideLabel && label ? <p className="font-medium">{String(label)}</p> : null}
      {payload.map((item, index) => {
        const rawKey = typeof item.dataKey === "string" || typeof item.dataKey === "number" ? item.dataKey : item.name;
        const key = String(rawKey ?? index);
        const itemConfig = config[key];
        return (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {!hideIndicator ? (
                <span
                  className="size-2 rounded-[2px]"
                  style={{ backgroundColor: item.color ?? itemConfig?.color ?? "var(--chart-1)" }}
                />
              ) : null}
              {itemConfig?.label ?? item.name}
            </span>
            <span className="font-mono font-medium tabular-nums">{formatValue(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

type LegendItem = { value?: string | number; color?: string; dataKey?: string | number };

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  payload,
}: {
  className?: string;
  payload?: LegendItem[];
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-3 pt-3", className)}>
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? item.value ?? index);
        return (
          <span key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-[2px]" style={{ backgroundColor: item.color ?? config[key]?.color }} />
            {config[key]?.label ?? item.value}
          </span>
        );
      })}
    </div>
  );
}

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  useChart,
};
