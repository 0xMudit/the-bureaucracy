"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Clock,
  Download,
  Eye,
  FileText,
  Flag,
  Globe,
  MessageSquare,
  Newspaper,
  Radio,
  Smartphone,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminAnalytics } from "@/lib/admin-analytics";
import { cn } from "@/lib/utils";

/* ─── Dummy data for demo panels ────────────────────────────────────────── */
const DAILY_TRAFFIC = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 8, 27 + index));
  const day = index + 1;
  return {
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    views: 980 + ((day * 173 + (day % 5) * 211) % 2500),
    visitors: 640 + ((day * 97 + (day % 6) * 131) % 1700),
  };
});

const BRIEF_FUNNEL = [
  { label: "Mon", open: 142, complete: 98  },
  { label: "Tue", open: 168, complete: 112 },
  { label: "Wed", open: 155, complete: 104 },
  { label: "Thu", open: 189, complete: 138 },
  { label: "Fri", open: 201, complete: 156 },
  { label: "Sat", open: 178, complete: 124 },
  { label: "Sun", open: 134, complete: 89  },
];

const TOPIC_PERFORMANCE = [
  { topic: "Polity & Governance",  views: 4820, saves: 1240 },
  { topic: "Economy",              views: 3960, saves: 980  },
  { topic: "Environment",          views: 3240, saves: 842  },
  { topic: "International Affairs",views: 2980, saves: 720  },
  { topic: "Science & Tech",       views: 2640, saves: 680  },
  { topic: "Social Issues",        views: 2180, saves: 540  },
];

const TRAFFIC_SOURCES = [
  { label: "Direct",      value: 38, color: "var(--chart-1)" },
  { label: "Organic",     value: 27, color: "var(--chart-2)" },
  { label: "Social",      value: 18, color: "var(--chart-3)" },
  { label: "Referral",    value: 12, color: "var(--chart-4)" },
  { label: "Other",       value: 5,  color: "var(--chart-5)" },
];

const DEVICES = [
  { label: "Mobile",  value: 64, fill: "var(--chart-1)" },
  { label: "Desktop", value: 29, fill: "var(--chart-2)" },
  { label: "Tablet",  value: 7,  fill: "var(--chart-3)" },
];

const TOP_PAGES = [
  { path: "/",                     views: 8420 },
  { path: "/brief",                views: 3240 },
  { path: "/syllabus",             views: 1960 },
  { path: "/archive",              views: 1480 },
  { path: "/item/[id]",            views: 1240 },
  { path: "/about",                views: 620  },
  { path: "/optional",             views: 540  },
];

const TOP_STATES = [
  { state: "Delhi",          readers: 1842 },
  { state: "Maharashtra",    readers: 1240 },
  { state: "Karnataka",      readers: 980  },
  { state: "Uttar Pradesh",  readers: 862  },
  { state: "Tamil Nadu",     readers: 740  },
  { state: "Gujarat",        readers: 620  },
  { state: "West Bengal",    readers: 580  },
];

const RETENTION = [
  { name: "D1",  rate: 68, fill: "var(--chart-1)" },
  { name: "D7",  rate: 42, fill: "var(--chart-2)" },
  { name: "D30", rate: 28, fill: "var(--chart-3)" },
];

const ENGAGEMENT_WEEKLY = [
  { week: "W40", likes: 2140, saves: 840,  comments: 320 },
  { week: "W41", likes: 2580, saves: 960,  comments: 380 },
  { week: "W42", likes: 2280, saves: 880,  comments: 340 },
  { week: "W43", likes: 3120, saves: 1140, comments: 480 },
];

const PUSH_STATS = [
  { label: "Delivered",  value: 4820, pct: 100 },
  { label: "Opened",     value: 1486, pct: 30.8 },
  { label: "Clicked",    value: 624,  pct: 12.9 },
];

const LLM_PROVIDERS = [
  { name: "Gemini",     calls: 1240, success: 1198, pct: 96.6 },
  { name: "Groq",       calls: 186,  success: 174,  pct: 93.5 },
  { name: "OpenRouter", calls: 42,   success: 38,   pct: 90.5 },
];

type TrafficRange = 7 | 14 | 30;

/* ─── Chart configs ─────────────────────────────────────────────────────── */
const trafficConfig = {
  views:    { label: "Page views", color: "var(--chart-1)" },
  visitors: { label: "Visitors",   color: "var(--chart-2)" },
} satisfies ChartConfig;

const briefConfig = {
  open:     { label: "Brief opened",   color: "var(--chart-2)" },
  complete: { label: "Brief finished", color: "var(--chart-4)" },
} satisfies ChartConfig;

const engageConfig = {
  likes:    { label: "Likes",    color: "var(--chart-1)" },
  saves:    { label: "Saves",    color: "var(--chart-2)" },
  comments: { label: "Comments", color: "var(--chart-3)" },
} satisfies ChartConfig;

const topicConfig = {
  views: { label: "Views", color: "var(--chart-1)" },
  saves: { label: "Saves", color: "var(--chart-2)" },
} satisfies ChartConfig;

/* ─── Sub-components ────────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  hint,
  trend,
  trendUp,
  icon: Icon,
  accent,
  demo = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  demo?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
              {demo ? <Badge variant="outline" className="h-4 px-1 font-mono text-[8px]">Demo</Badge> : null}
            </div>
            <p className={cn("mt-1 text-2xl font-semibold tabular-nums leading-none", accent ? "text-primary" : "")}>
              {value}
            </p>
            {hint ? (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{hint}</p>
            ) : null}
          </div>
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            <Icon className="size-4" />
          </div>
        </div>
        {trend ? (
          <div className={cn("mt-3 flex items-center gap-1 font-mono text-[10px]", trendUp ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
            {trendUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {trend}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, meta, demo, action }: {
  title: string;
  meta?: string;
  demo?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <h3 className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em]">{title}</h3>
        {demo ? (
          <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[9px] uppercase tracking-[0.08em]">
            Demo
          </Badge>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {meta ? <span className="font-mono text-[10px] text-muted-foreground">{meta}</span> : null}
        {action}
      </div>
    </div>
  );
}

function BarList({
  rows,
  color = "bg-primary/60",
}: {
  rows: { label: string; value: number; suffix?: string; sub?: string }[];
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="divide-y divide-border/40">
      {rows.map((row) => (
        <li key={row.label} className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="truncate text-[13px] font-medium">{row.label}</span>
              {row.sub ? <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{row.sub}</span> : null}
            </div>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
              {row.value.toLocaleString("en-IN")}{row.suffix ?? ""}
            </span>
          </div>
          <div className="mt-1.5 h-1 w-full rounded-full bg-muted">
            <div
              className={cn("h-1 rounded-full transition-all", color)}
              style={{ width: `${Math.max(4, Math.round((row.value / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
      {rows.length === 0 && (
        <li className="px-4 py-8 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          No data yet
        </li>
      )}
    </ul>
  );
}

/* ─── Main Dashboard ────────────────────────────────────────────────────── */
export function AnalyticsDashboard({ data }: { data: AdminAnalytics }) {
  const totals = data.totals;
  const router = useRouter();
  const [range, setRange] = useState<TrafficRange>(30);
  const chartSeries = (data.series.length ? data.series : data.hasDatabase ? [] : DAILY_TRAFFIC).slice(-range);
  const chartViews = chartSeries.reduce((sum, point) => sum + point.views, 0);

  function exportTraffic() {
    const csv = [
      ["date", "page_views", "visitors"],
      ...chartSeries.map((point) => [point.label, point.views, point.visitors]),
    ]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bureaucracy-traffic-${range}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Admin · Analytics · Live
            </span>
          </div>
          <h1 className="display mt-1.5 text-3xl font-semibold leading-none sm:text-4xl">
            The Desk
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acquisition, engagement and retention · traffic trend, {range} days
            {data.hasDatabase
              ? ` · ${totals.realtime} reader${totals.realtime === 1 ? "" : "s"} online now`
              : " · Connect Supabase for live data"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={data.hasDatabase ? "secondary" : "outline"} className="gap-1.5">
            <Radio className="size-3 text-emerald-500" />
            {data.hasDatabase ? `${totals.realtime} live` : "Demo preview"}
          </Badge>
          <Button variant="outline" size="sm" className="gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em]" asChild>
            <Link href="/admin/comments">
              Moderation <ArrowUpRight className="size-3" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em]" onClick={exportTraffic}>
            <Download className="size-3" /> Export CSV
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Refresh dashboard" title="Refresh dashboard" onClick={() => router.refresh()}>
            <Activity className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Daily active users"
          value={data.hasDatabase ? totals.dau.toLocaleString("en-IN") : "3,450"}
          hint={data.hasDatabase ? `${totals.viewsToday.toLocaleString("en-IN")} page views` : "8,420 page views"}
          trend={data.hasDatabase ? undefined : "+12.1% from last week"}
          trendUp={!data.hasDatabase}
          demo={!data.hasDatabase}
          icon={Users}
          accent
        />
        <KpiCard
          label="Weekly active users"
          value={data.hasDatabase ? totals.wau.toLocaleString("en-IN") : "1,342"}
          hint="unique readers · 7 days"
          trend={data.hasDatabase ? undefined : "-9.8% from last week"}
          trendUp={false}
          demo={!data.hasDatabase}
          icon={Activity}
        />
        <KpiCard
          label="Avg. session"
          value={`${Math.floor(totals.avgSessionSeconds / 60)}m ${totals.avgSessionSeconds % 60}s`}
          hint="time on site · estimated"
          demo
          icon={Clock}
        />
        <KpiCard
          label="Brief finish rate"
          value={`${data.hasDatabase ? totals.finishRate : 74}%`}
          hint={data.hasDatabase ? `${data.finish.complete}/${data.finish.open} tracked opens` : "156/201 tracked opens"}
          trend={data.hasDatabase ? undefined : "+4.3% from last week"}
          trendUp={!data.hasDatabase}
          demo={!data.hasDatabase}
          icon={BookOpen}
        />
      </div>

      {/* ── Secondary KPIs ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="MAU" value={data.hasDatabase ? totals.mau.toLocaleString("en-IN") : "24,800"} hint="monthly active" demo={!data.hasDatabase} icon={Users} />
        <KpiCard label="Bounce rate" value={`${data.hasDatabase ? totals.bounceRate : 38}%`} hint="single-page" demo={!data.hasDatabase} icon={Eye} />
        <KpiCard label="Open reports" value={data.hasDatabase ? totals.openReports : 3} hint={`${data.hasDatabase ? totals.comments : 842} comments`} demo={!data.hasDatabase} icon={Flag} />
        <KpiCard label="Push subscribers" value="4,820" hint="VAPID active" demo icon={Bell} />
      </div>

      {/* ── Main tabs ────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="h-9">
          <TabsTrigger value="overview"    className="font-mono text-[10px] uppercase tracking-[0.08em]">Overview</TabsTrigger>
          <TabsTrigger value="engagement"  className="font-mono text-[10px] uppercase tracking-[0.08em]">Engagement</TabsTrigger>
          <TabsTrigger value="acquisition" className="font-mono text-[10px] uppercase tracking-[0.08em]">Acquisition</TabsTrigger>
          <TabsTrigger value="retention"   className="font-mono text-[10px] uppercase tracking-[0.08em]">Retention</TabsTrigger>
          <TabsTrigger value="operations" className="font-mono text-[10px] uppercase tracking-[0.08em]">Operations</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 space-y-4">

          {/* Traffic area chart */}
          <Card>
            <SectionHeader title={`Traffic · ${range} days`} meta={`${chartViews.toLocaleString("en-IN")} views`} demo={!data.hasDatabase} />
            <CardContent className="p-4">
              <div className="mb-3 flex justify-end gap-1" role="group" aria-label="Traffic chart range">
                {([7, 14, 30] as const).map((days) => (
                  <Button
                    key={days}
                    size="xs"
                    variant={range === days ? "secondary" : "ghost"}
                    aria-pressed={range === days}
                    onClick={() => setRange(days)}
                    className="font-mono text-[10px]"
                  >
                    {days}d
                  </Button>
                ))}
              </div>
              <ChartContainer config={trafficConfig} className="h-64 w-full">
                <AreaChart data={chartSeries} margin={{ left: 0, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="grad-views" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="var(--color-views)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-views)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="grad-visitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="var(--color-visitors)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--color-visitors)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} className="stroke-border/40" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} className="font-mono text-[9px]" />
                  <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} className="font-mono text-[9px]" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area type="monotone" dataKey="views"    stroke="var(--color-views)"    fill="url(#grad-views)"    strokeWidth={2} />
                  <Area type="monotone" dataKey="visitors" stroke="var(--color-visitors)" fill="url(#grad-visitors)" strokeWidth={2} strokeDasharray="4 3" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top pages */}
            <Card>
              <SectionHeader title="Top pages" meta="last 30 days" demo={!data.hasDatabase} />
              <BarList
                rows={data.topPages.length
                  ? data.topPages.map((p) => ({ label: p.path, value: p.views }))
                  : data.hasDatabase
                    ? []
                    : TOP_PAGES.map((p) => ({ label: p.path, value: p.views }))}
                color="bg-chart-1/70"
              />
            </Card>

            {/* Readers by state */}
            <Card>
              <SectionHeader title="Readers by state" meta="profile opt-in" demo={!data.hasDatabase} />
              <BarList
                rows={data.states.length
                  ? data.states.map((s) => ({ label: s.state, value: s.readers }))
                  : data.hasDatabase
                    ? []
                    : TOP_STATES.map((s) => ({ label: s.state, value: s.readers }))}
                color="bg-chart-2/70"
              />
            </Card>
          </div>
        </TabsContent>

        {/* ── ENGAGEMENT ───────────────────────────────────────────── */}
        <TabsContent value="engagement" className="mt-4 space-y-4">

          {/* Brief funnel */}
          <Card>
            <SectionHeader title="Brief funnel · 7 days" meta="first-party events" demo={!data.hasDatabase} />
            <CardContent className="p-4">
              <ChartContainer config={briefConfig} className="h-52 w-full">
                <BarChart data={data.finish.byDay.slice(-7).length ? data.finish.byDay.slice(-7) : data.hasDatabase ? [] : BRIEF_FUNNEL} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} className="stroke-border/40" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} className="font-mono text-[9px]" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="open"     fill="var(--color-open)"     radius={[4, 4, 0, 0]} />
                  <Bar dataKey="complete" fill="var(--color-complete)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Engagement weekly */}
            <Card>
              <SectionHeader title="Engagement · 4 weeks" demo />
              <CardContent className="p-4">
                <ChartContainer config={engageConfig} className="h-52 w-full">
                  <BarChart data={ENGAGEMENT_WEEKLY} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} className="stroke-border/40" />
                    <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} className="font-mono text-[9px]" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="likes"    fill="var(--color-likes)"    radius={[3, 3, 0, 0]} />
                    <Bar dataKey="saves"    fill="var(--color-saves)"    radius={[3, 3, 0, 0]} />
                    <Bar dataKey="comments" fill="var(--color-comments)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Topic performance */}
            <Card>
              <SectionHeader title="Topic performance" meta="views + saves" demo />
              <CardContent className="p-4">
                <ChartContainer config={topicConfig} className="h-52 w-full">
                  <BarChart
                    data={TOPIC_PERFORMANCE}
                    layout="vertical"
                    margin={{ left: 0, right: 8, top: 4 }}
                  >
                    <XAxis type="number" tickLine={false} axisLine={false} className="font-mono text-[9px]" />
                    <YAxis type="category" dataKey="topic" width={140} tickLine={false} axisLine={false} className="font-mono text-[8px]" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="views" fill="var(--color-views)" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="saves" fill="var(--color-saves)" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Push campaign stats */}
          <Card>
            <SectionHeader title="Push campaign stats" meta="last campaign" demo />
            <CardContent className="p-5">
              <div className="grid gap-5 sm:grid-cols-3">
                {PUSH_STATS.map((stat) => (
                  <div key={stat.label}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value.toLocaleString("en-IN")}</p>
                    <Progress value={stat.pct} className="mt-2 h-1" />
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">{stat.pct}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACQUISITION ──────────────────────────────────────────── */}
        <TabsContent value="acquisition" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Traffic sources pie */}
            <Card>
                <SectionHeader title="Traffic sources" demo />
              <CardContent className="p-4">
                <ChartContainer
                  config={{ visits: { label: "Share", color: "var(--chart-1)" } }}
                  className="mx-auto h-52 w-full max-w-xs"
                >
                  <PieChart>
                    <Tooltip
                      formatter={(value, name) => [`${String(value ?? 0)}%`, String(name)]}
                      contentStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                    />
                    <Pie
                      data={data.hasDatabase ? data.sources.map((source) => ({ label: source.source, value: source.share })) : TRAFFIC_SOURCES}
                      dataKey="value"
                      nameKey="label"
                      innerRadius="50%"
                      outerRadius="78%"
                      paddingAngle={2}
                    >
                      {(data.hasDatabase ? data.sources.map((source) => ({ label: source.source, value: source.share })) : TRAFFIC_SOURCES).map((entry, index) => (
                        <Cell key={entry.label} fill={`var(--chart-${index + 1})`} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {(data.hasDatabase ? data.sources.map((source) => ({ label: source.source, value: source.share })) : TRAFFIC_SOURCES).map((src, i) => (
                    <span key={src.label} className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                      <span className="size-2 rounded-sm" style={{ background: `var(--chart-${i + 1})` }} />
                      {src.label} · {src.value}%
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Devices */}
            <Card>
              <SectionHeader title="Devices" demo />
              <CardContent className="p-4">
                <ChartContainer
                  config={{ value: { label: "Share", color: "var(--chart-1)" } }}
                  className="mx-auto h-52 w-full max-w-xs"
                >
                  <RadialBarChart
                    data={DEVICES}
                    innerRadius="30%"
                    outerRadius="90%"
                    barSize={18}
                  >
                    <RadialBar dataKey="value" label={{ position: "insideStart", fill: "#fff", fontSize: 10 }} />
                    <Legend
                      iconSize={10}
                      formatter={(v) => <span className="font-mono text-[10px] text-muted-foreground">{v}</span>}
                    />
                    <Tooltip
                      formatter={(value) => [`${String(value ?? 0)}%`]}
                      contentStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                    />
                  </RadialBarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Referrer detail */}
          <Card>
            <SectionHeader title="Referrer detail" meta={data.hasDatabase ? "first-party visits" : "sample referrers"} demo={!data.hasDatabase} />
            <BarList
                rows={(data.sources.length
                ? data.sources.map((s) => ({ label: s.source, value: s.share, suffix: "%" }))
                : data.hasDatabase ? [] : [
                    { label: "google.com",    value: 27, suffix: "%" },
                    { label: "twitter.com",   value: 14, suffix: "%" },
                    { label: "reddit.com",    value: 9,  suffix: "%" },
                    { label: "telegram.org",  value: 6,  suffix: "%" },
                    { label: "whatsapp.com",  value: 4,  suffix: "%" },
                  ])}
              color="bg-chart-3/70"
            />
          </Card>
        </TabsContent>

        {/* ── RETENTION ────────────────────────────────────────────── */}
        <TabsContent value="retention" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="DAU" value={data.hasDatabase ? totals.dau.toLocaleString("en-IN") : "3,450"} hint="today" demo={!data.hasDatabase} icon={Users} accent />
            <KpiCard label="WAU" value={data.hasDatabase ? totals.wau.toLocaleString("en-IN") : "18,240"} hint="7 days" demo={!data.hasDatabase} icon={Users} />
            <KpiCard label="MAU" value={data.hasDatabase ? totals.mau.toLocaleString("en-IN") : "24,800"} hint="30 days" demo={!data.hasDatabase} icon={Users} />
            <KpiCard
              label="DAU / MAU"
              value={`${data.hasDatabase ? (totals.mau ? Math.round((totals.dau / totals.mau) * 100) : 0) : 14}%`}
              hint="stickiness"
              demo={!data.hasDatabase}
              icon={Activity}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Cohort retention radial */}
            <Card>
              <SectionHeader title="Cohort retention" demo />
              <CardContent className="p-4">
                <ChartContainer
                  config={{ rate: { label: "Retention %", color: "var(--chart-1)" } }}
                  className="mx-auto h-52 w-full max-w-xs"
                >
                  <RadialBarChart data={RETENTION} innerRadius="30%" outerRadius="90%" barSize={20}>
                    <RadialBar dataKey="rate" label={{ position: "insideStart", fill: "#fff", fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [`${String(value ?? 0)}%`]}
                      contentStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                    />
                    <Legend
                      iconSize={10}
                      formatter={(v) => <span className="font-mono text-[10px] text-muted-foreground">{v}</span>}
                    />
                  </RadialBarChart>
                </ChartContainer>
                <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
                  D1 {totals.d1 || 68}% · D7 {totals.d7 || 42}% · D30 {totals.d30 || 28}%
                </p>
              </CardContent>
            </Card>

            {/* Streak overview */}
            <Card>
              <SectionHeader title="Streak distribution" demo />
              <CardContent className="p-5">
                <div className="space-y-3">
                  {[
                    { label: "7+ day streak",   value: 1240, pct: 36 },
                    { label: "3–6 day streak",  value: 840,  pct: 24 },
                    { label: "1–2 day streak",  value: 980,  pct: 28 },
                    { label: "No streak",        value: 420,  pct: 12 },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium">{row.label}</span>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {row.value.toLocaleString("en-IN")} · {row.pct}%
                        </span>
                      </div>
                      <Progress value={row.pct} className="mt-1.5 h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── OPERATIONS ───────────────────────────────────────────── */}
        <TabsContent value="operations" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">

            {/* LLM provider stats */}
            <Card>
              <SectionHeader title="LLM providers" meta="last 24h" demo />
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {LLM_PROVIDERS.map((p) => (
                    <div key={p.name} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                        <Zap className="size-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{p.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {p.calls} calls · {p.success} ok
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[12px] font-medium text-emerald-500">{p.pct}%</p>
                        <Progress value={p.pct} className="mt-1 h-1 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ingestion health */}
            <Card>
              <SectionHeader title="Ingestion health" meta="last 6 runs" demo />
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {[
                    { time: "09:15 AM", articles: 48, errors: 0,  status: "ok" },
                    { time: "09:00 AM", articles: 52, errors: 1,  status: "warn" },
                    { time: "08:45 AM", articles: 44, errors: 0,  status: "ok" },
                    { time: "08:30 AM", articles: 61, errors: 0,  status: "ok" },
                    { time: "08:15 AM", articles: 39, errors: 2,  status: "warn" },
                    { time: "08:00 AM", articles: 55, errors: 0,  status: "ok" },
                  ].map((run) => (
                    <div key={run.time} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-md",
                        run.status === "ok" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        <Rss className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{run.time}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {run.articles} articles · {run.errors} error{run.errors !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge
                        variant={run.status === "ok" ? "secondary" : "destructive"}
                        className="font-mono text-[9px] uppercase"
                      >
                        {run.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comment moderation queue */}
          <Card>
            <SectionHeader
              title="Moderation queue"
              meta={`${data.hasDatabase ? totals.openReports : 3} open reports`}
              demo={!data.hasDatabase}
              action={
                <Button size="sm" variant="outline" className="gap-1 font-mono text-[9px] uppercase tracking-[0.1em]" asChild>
                  <Link href="/admin/comments">View all <ArrowUpRight className="size-3" /></Link>
                </Button>
              }
            />
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {[
                  { user: "aspirant_42",    comment: "This source is unreliable...", reports: 2, age: "2h ago" },
                  { user: "upsc_2027",      comment: "Wrong syllabus mapping here", reports: 1, age: "4h ago" },
                  { user: "delhi_reader",   comment: "Duplicate of earlier story",  reports: 1, age: "6h ago" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] font-medium uppercase">
                      {item.user[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-foreground">{item.user}</p>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">"{item.comment}"</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant="destructive" className="font-mono text-[9px]">{item.reports} report{item.reports > 1 ? "s" : ""}</Badge>
                      <p className="mt-1 font-mono text-[9px] text-muted-foreground">{item.age}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Footer note ──────────────────────────────────────────────── */}
      <p className="font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
        Real data: page views, visitors, sessions, bounce rate, top pages, referrers, brief events, state opt-ins.{" "}
        <span className="text-foreground">Demo</span> panels need a richer event stream and can be replaced without touching the layout.
      </p>
    </div>
  );
}

/* ── Inline Rss icon import (avoid adding lucide import line) ──────────── */
function Rss({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  );
}
