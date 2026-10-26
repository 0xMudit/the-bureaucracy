"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Clock,
  Eye,
  Flag,
  Radio,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminAnalytics } from "@/lib/admin-analytics";
import { cn } from "@/lib/utils";

const trafficConfig = {
  views: { label: "Page views", color: "var(--chart-1)" },
  visitors: { label: "Visitors", color: "var(--chart-3)" },
} satisfies ChartConfig;

const finishConfig = {
  open: { label: "Brief opened", color: "var(--chart-2)" },
  complete: { label: "Brief finished", color: "var(--chart-4)" },
} satisfies ChartConfig;

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="border border-border bg-card px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <Icon className={cn("size-3.5", accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <p className={cn("mt-1 font-display text-[1.8rem] leading-none", accent ? "text-primary" : "text-foreground")}>
        {value}
      </p>
      {hint ? <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center">
      <p className="max-w-xs font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

function Panel({
  title,
  meta,
  children,
  demo,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  demo?: boolean;
}) {
  return (
    <section className="border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.18em]">{title}</h2>
        <div className="flex items-center gap-2">
          {demo ? <Badge variant="outline" className="font-normal text-[8px] uppercase tracking-[0.1em]">Demo data</Badge> : null}
          {meta ? <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">{meta}</span> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function BarList({
  rows,
  accent = false,
}: {
  rows: { label: string; value: number; suffix?: string }[];
  accent?: boolean;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="divide-y divide-border/60">
      {rows.map((row) => (
        <li key={row.label} className="px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-mono text-[10.5px] text-foreground/90">{row.label}</span>
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
              {row.value.toLocaleString("en-IN")}
              {row.suffix ?? ""}
            </span>
          </div>
          <div className="mt-1 h-1 w-full bg-muted">
            <div
              className={cn("h-1", accent ? "bg-chart-2" : "bg-primary/70")}
              style={{ width: `${Math.max(3, Math.round((row.value / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
      {!rows.length ? (
        <li className="px-3 py-6 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
          No data yet
        </li>
      ) : null}
    </ul>
  );
}

export function AnalyticsDashboard({ data }: { data: AdminAnalytics }) {
  const totals = data.totals;
  const trafficRows = Object.entries(data.traffic)
    .filter(([key]) => key !== "demo")
    .map(([key, value]) => ({ label: key, value: Number(value), suffix: "%" }));

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            Private · live
          </p>
          <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
            The desk.
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            Acquisition, engagement and retention for the last thirty days.{" "}
            {data.hasDatabase ? `${totals.realtime} reader${totals.realtime === 1 ? "" : "s"} in the last five minutes.` : "Connect Supabase to see live data."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            <Radio className="size-3 text-primary" /> {totals.realtime} live
          </Badge>
          <Link href="/admin/comments" className="inline-flex h-8 items-center gap-1 border border-border bg-card px-2.5 font-mono text-[9px] uppercase tracking-[0.1em] hover:bg-muted">
            Moderation queue <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="Visitors today" value={totals.visitorsToday} hint={`${totals.viewsToday} page views`} icon={Users} accent />
        <Stat label="Sessions today" value={totals.sessionsToday} hint="30-minute buckets" icon={Activity} />
        <Stat label="Bounce rate" value={`${totals.bounceRate}%`} hint="single-page sessions" icon={Eye} />
        <Stat label="Brief finish rate" value={`${totals.finishRate}%`} hint={`${data.finish.complete}/${data.finish.open} today`} icon={BarChart3} />
        <Stat label="DAU" value={totals.dau} hint="unique readers" icon={Users} />
        <Stat label="WAU / MAU" value={`${totals.wau}/${totals.mau}`} hint="rolling windows" icon={Users} />
        <Stat label="Avg session" value={`${Math.floor(totals.avgSessionSeconds / 60)}m ${totals.avgSessionSeconds % 60}s`} hint="demo estimate" icon={Clock} />
        <Stat label="Open reports" value={totals.openReports} hint={`${totals.comments} comments live`} icon={Flag} />
      </div>

      <Tabs defaultValue="overview" className="mt-5">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 space-y-4">
          <Panel title="Traffic · 14 days" meta={`${totals.views30.toLocaleString("en-IN")} views in 30d`}>
            <div className="relative px-3 py-4">
              {!data.hasDatabase ? <ChartEmpty>Connect Supabase to start recording page views.</ChartEmpty> : null}
              <ChartContainer config={trafficConfig} className="h-64 w-full">
                <AreaChart data={data.series} margin={{ left: 0, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="tb-views" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-views)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-views)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
                  <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area type="monotone" dataKey="views" stroke="var(--color-views)" fill="url(#tb-views)" strokeWidth={2} />
                  <Area type="monotone" dataKey="visitors" stroke="var(--color-visitors)" fill="transparent" strokeWidth={2} strokeDasharray="4 3" />
                </AreaChart>
              </ChartContainer>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Brief funnel · 7 days" meta="first-party events">
              <div className="relative px-3 py-4">
                {!data.hasDatabase ? <ChartEmpty>Brief events appear here once the database is connected.</ChartEmpty> : null}
                <ChartContainer config={finishConfig} className="h-52 w-full">
                  <BarChart data={data.finish.byDay.slice(-7)} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="open" fill="var(--color-open)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="complete" fill="var(--color-complete)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </Panel>

            <Panel title="Top pages" meta="last 30 days">
              <BarList rows={data.topPages.map((page) => ({ label: page.path, value: page.views }))} />
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="acquisition" className="mt-3 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Traffic sources" meta="referrer host" demo>
              <div className="px-3 py-4">
                <ChartContainer config={{ visits: { label: "Share", color: "var(--chart-2)" } }} className="mx-auto h-52 w-full max-w-sm">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={trafficRows} dataKey="value" nameKey="label" innerRadius="52%" outerRadius="82%" paddingAngle={2}>
                      {trafficRows.map((row, index) => (
                        <Cell key={row.label} fill={`var(--chart-${(index % 5) + 1})`} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {trafficRows.map((row, index) => (
                    <span key={row.label} className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                      <span className="size-2" style={{ background: `var(--chart-${(index % 5) + 1})` }} />
                      {row.label} · {row.value}%
                    </span>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel title="Referrer detail" meta="real first-party">
              <BarList rows={data.sources.map((source) => ({ label: source.source, value: source.share, suffix: "%" }))} />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Devices" demo>
              <BarList rows={data.devices.map((row) => ({ label: row.label, value: row.value, suffix: "%" }))} accent />
            </Panel>
            <Panel title="Browsers" demo>
              <BarList rows={data.browsers.map((row) => ({ label: row.label, value: row.value, suffix: "%" }))} accent />
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="retention" className="mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat label="DAU" value={totals.dau} hint="today" icon={Users} />
            <Stat label="WAU" value={totals.wau} hint="7 days" icon={Users} />
            <Stat label="MAU" value={totals.mau} hint="30 days" icon={Users} />
            <Stat label="DAU / MAU" value={`${totals.mau ? Math.round((totals.dau / totals.mau) * 100) : 0}%`} hint="stickiness" icon={Activity} accent />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Cohort retention" demo>
              <BarList
                rows={[
                  { label: "D1", value: data.totals.d1, suffix: "%" },
                  { label: "D7", value: data.totals.d7, suffix: "%" },
                  { label: "D30", value: data.totals.d30, suffix: "%" },
                ]}
              />
              <p className="border-t border-border px-3 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
                Cohorts need an install/account event stream. These values are demo data so the layout is ready for it.
              </p>
            </Panel>
            <Panel title="Readers by state" meta="profile opt-in">
              <BarList rows={data.states.map((state) => ({ label: state.state, value: state.readers }))} accent />
            </Panel>
          </div>
        </TabsContent>
      </Tabs>

      <p className="mt-4 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
        Real data: page views, visitors, sessions (30-minute buckets), bounce rate, top pages, referrer hosts,
        brief events and state opt-ins. Blocks marked <span className="text-foreground">Demo data</span> are shaped
        for a richer event stream and can be replaced without touching the layout.
      </p>
    </div>
  );
}
