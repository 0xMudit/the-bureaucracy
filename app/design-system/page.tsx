"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  Command,
  Inbox,
  LayoutDashboard,
  Moon,
  Newspaper,
  Sparkles,
  Sun,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CommandTrigger } from "@/components/command-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const chartConfig = {
  read: { label: "Stories read", color: "var(--chart-1)" },
  saved: { label: "Saved", color: "var(--chart-2)" },
} satisfies ChartConfig;

const chartData = [
  { day: "Mon", read: 12, saved: 4 },
  { day: "Tue", read: 18, saved: 6 },
  { day: "Wed", read: 15, saved: 3 },
  { day: "Thu", read: 24, saved: 8 },
  { day: "Fri", read: 21, saved: 7 },
  { day: "Sat", read: 9, saved: 2 },
  { day: "Sun", read: 14, saved: 5 },
];

const palette = [
  ["Background", "--background"],
  ["Card", "--card"],
  ["Foreground", "--foreground"],
  ["Primary", "--primary"],
  ["Secondary", "--secondary"],
  ["Muted", "--muted"],
  ["Accent", "--accent"],
  ["Border", "--border"],
  ["Success", "--success"],
  ["Warning", "--warning"],
  ["Info", "--info"],
  ["Destructive", "--destructive"],
] as const;

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-4 border-b border-border pb-3">
        <h2 className="display text-2xl leading-none">{title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [briefOn, setBriefOn] = React.useState(true);
  const [progress, setProgress] = React.useState(62);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">The wire</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Design system</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="kicker">Interface ledger / v1</p>
          <h1 className="display mt-2 max-w-3xl text-[clamp(2.8rem,7vw,5.4rem)] leading-[0.9] tracking-[-0.04em]">
            A quiet desk for loud news.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            The shared visual language behind The Bureaucracy: warm paper, ink, a single vermilion accent,
            and components that stay legible at 360, 768 and 1280 pixels.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CommandTrigger className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm shadow-xs hover:bg-muted" label="Open command palette" />
          <Button onClick={() => toast.success("The desk is listening.", { description: "Toasts use semantic tokens in both schemes." })}>
            <Bell /> Test toast
          </Button>
        </div>
      </div>

      <div className="mt-12 grid gap-12">
        <Section
          title="Colour"
          description="Every surface is a CSS variable. Light and dark are first-class palettes, not a filter. Toggle the reading mode in the header to inspect both."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {palette.map(([label, token]) => (
              <div key={token} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="h-16 border-b border-border" style={{ background: `var(${token})` }} />
                <div className="p-2.5">
                  <p className="text-xs font-medium">{label}</p>
                  <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{token}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="surface p-4">
              <p className="kicker">Scheduling</p>
              <p className="mt-2 text-sm leading-relaxed">The <span className="text-success">success</span> token marks a source that is live and fresh.</p>
            </div>
            <div className="surface p-4">
              <p className="kicker">Caution</p>
              <p className="mt-2 text-sm leading-relaxed">The <span className="text-warning">warning</span> token marks a stale feed or a retry.</p>
            </div>
            <div className="surface p-4">
              <p className="kicker">Context</p>
              <p className="mt-2 text-sm leading-relaxed">The <span className="text-info">info</span> token explains a classification decision.</p>
            </div>
          </div>
        </Section>

        <Section title="Type & actions" description="Instrument Serif for the front page, Inter for reading, IBM Plex Mono for the marginalia. Buttons use one radius scale and visible focus rings.">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="surface p-5 sm:p-7">
              <p className="kicker">The lead</p>
              <h3 className="display mt-2 text-[clamp(2rem,4.5vw,3.4rem)] leading-[0.95] tracking-[-0.03em]">
                Parliament clears the data bill after a seven-hour debate.
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                A short, bold summary is the unit of the desk. Five bullets, one exam angle, and a link to the primary
                source. No infinite scroll after midnight.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button>Read the brief <ArrowRight /></Button>
                <Button variant="secondary">Save for later</Button>
                <Button variant="outline">Open source</Button>
                <Button variant="ghost">Dismiss</Button>
                <Button variant="destructive">Report</Button>
                <Button variant="link">Why this matters</Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Badge>Polity</Badge>
                <Badge variant="secondary">GS-II</Badge>
                <Badge variant="outline">Official</Badge>
                <Badge variant="destructive">Stale source</Badge>
              </div>
            </div>
            <div className="surface p-5">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-primary font-mono text-[10px] text-primary-foreground">AM</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Ananya Mehta</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Prelims · 41-day streak</p>
                </div>
                <Badge variant="outline" className="ml-auto">Reader</Badge>
              </div>
              <div className="mt-5 space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="ds-name">Display name</FieldLabel>
                    <Input id="ds-name" defaultValue="Ananya Mehta" />
                    <FieldDescription>Visible on public comments and your profile.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ds-note">A note for the desk</FieldLabel>
                    <Textarea id="ds-note" rows={2} placeholder="Optional — keep it short." />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ds-exam">Target exam</FieldLabel>
                    <Select defaultValue="upsc">
                      <SelectTrigger id="ds-exam"><SelectValue placeholder="Choose exam" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upsc">UPSC CSE</SelectItem>
                        <SelectItem value="state">State PSC</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
                  <div>
                    <p className="text-xs font-medium">Morning brief</p>
                    <p className="text-[10px] text-muted-foreground">Delivered at 07:00 IST</p>
                  </div>
                  <Switch checked={briefOn} onCheckedChange={setBriefOn} aria-label="Morning brief" />
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>Brief completion</span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                  <Progress value={progress} aria-label={`Brief completion ${progress}%`} />
                </div>
                <Button variant="outline" className="w-full" onClick={() => setProgress((value) => Math.min(100, value + 10))}>
                  <Check /> Mark one more read
                </Button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Primitives & loading"
          description="Cards group a reading decision, separators keep dense lists breathable, skeletons mirror the finished layout, and tooltips explain icon-only controls without stealing focus."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s five</CardTitle>
                <CardDescription>Finite by design: five stories, eight minutes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/3" />
                <Separator />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>07:00 IST</span>
                  <Badge variant="secondary">Queued</Badge>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Desk copy</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Brief delivery details">
                        <Bell />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">One push per morning, two at most per day.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardFooter>
            </Card>

            <div className="surface p-5">
              <p className="kicker">Skeleton rhythm</p>
              <div className="mt-4 space-y-4" aria-hidden>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Skeletons reuse the same borders and radii, so the page never jumps when the wire lands.
              </p>
            </div>

            <div className="surface p-5">
              <p className="kicker">Overflow</p>
              <ScrollArea className="mt-3 h-56 rounded-lg border border-border">
                <div className="space-y-0 p-4">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index}>
                      <p className="text-sm font-medium">Filed under GS-{["I", "II", "III", "IV"][index % 4]}</p>
                      <p className="text-xs text-muted-foreground">A scrollable list keeps the page height honest.</p>
                      <Separator className="my-2.5" />
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </div>
          </div>
        </Section>

        <Section title="Overlays" description="Dialog, popover and command palette share the same focus, elevation and backdrop behaviour. Escape always closes.">
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Publish the morning brief?</DialogTitle>
                  <DialogDescription>
                    Five stories will be frozen for today and pushed to subscribers at 07:00 IST. You can still edit
                    the copy before the send.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Keep editing</Button>
                  <Button onClick={() => toast.success("Brief queued for 07:00 IST")}>Queue brief</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"><CalendarDays /> Calendar</Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"><Command /> Commands</Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <p className="text-sm font-medium">Keyboard shortcuts</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  ⌘K opens the palette. <kbd className="rounded border border-border bg-muted px-1 font-mono">L</kbd> likes,
                  {" "}<kbd className="rounded border border-border bg-muted px-1 font-mono">S</kbd> saves.
                </p>
              </PopoverContent>
            </Popover>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="surface p-5">
              <p className="kicker">The empty state</p>
              <Empty className="mt-3 border-0 bg-background/40">
                <EmptyHeader>
                  <EmptyMedia><Inbox /></EmptyMedia>
                  <EmptyTitle>No saved stories yet</EmptyTitle>
                  <EmptyDescription>Press S on any headline to keep it for revision. Saved stories are private by default.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent><Button size="sm">Browse the wire</Button></EmptyContent>
              </Empty>
            </div>
            <div className="surface p-5">
              <Tabs defaultValue="brief">
                <TabsList>
                  <TabsTrigger value="brief"><Sun /> Brief</TabsTrigger>
                  <TabsTrigger value="wire"><Newspaper /> Wire</TabsTrigger>
                  <TabsTrigger value="saved"><Bookmark /> Saved</TabsTrigger>
                </TabsList>
                <TabsContent value="brief" className="pt-3 text-sm leading-relaxed text-muted-foreground">
                  The daily five, frozen and ranked for the syllabus.
                </TabsContent>
                <TabsContent value="wire" className="pt-3 text-sm leading-relaxed text-muted-foreground">
                  Everything published in the last 24 hours, with source health shown.
                </TabsContent>
                <TabsContent value="saved" className="pt-3 text-sm leading-relaxed text-muted-foreground">
                  Your private revision shelf.
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </Section>

        <Section title="Data & rhythm" description="Charts, tables and progress components use semantic tokens and tabular numerals. The calendar follows the same surface language.">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="kicker">Reading week</p>
                  <p className="mt-1 text-sm text-muted-foreground">Seven days, no leaderboard.</p>
                </div>
                <Badge variant="secondary">Demo data</Badge>
              </div>
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <BarChart data={chartData} margin={{ left: 0, right: 0, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="read" fill="var(--color-read)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saved" fill="var(--color-saved)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="surface p-5">
              <p className="kicker">Agenda</p>
              <Calendar mode="single" selected={date} onSelect={setDate} className="mt-2 flex justify-center" />
            </div>
          </div>

          <div className="mt-6 surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Source health</p>
                <p className="text-xs text-muted-foreground">Service-role reads only.</p>
              </div>
              <Badge variant="outline">Live</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Last fetch</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["PIB", "2 min ago", "12", "Healthy"],
                  ["The Hindu", "8 min ago", "9", "Healthy"],
                  ["Indian Express", "22 min ago", "7", "Retrying"],
                  ["LiveLaw", "41 min ago", "3", "Healthy"],
                ].map(([source, fetched, items, status]) => (
                  <TableRow key={source}>
                    <TableCell className="font-medium">{source}</TableCell>
                    <TableCell className="text-muted-foreground">{fetched}</TableCell>
                    <TableCell className="font-mono tabular-nums">{items}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={status === "Healthy" ? "secondary" : "outline"} className={status === "Healthy" ? "text-success" : "text-warning"}>
                        {status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Navigation" description="The sidebar is for the editor's desk; the reading surface keeps a single sticky header and a command palette. Mobile uses the same actions inside a sheet.">
          <div className="overflow-hidden rounded-xl border border-border">
            <SidebarProvider>
              <div className="flex min-h-72 bg-background">
                <Sidebar>
                  <SidebarHeader>
                    <div className="flex items-center gap-2 px-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><LayoutDashboard className="size-3.5" /></span>
                      <span className="font-display text-lg group-data-[state=collapsed]/sidebar:hidden">The desk</span>
                    </div>
                  </SidebarHeader>
                  <SidebarContent>
                    <SidebarGroup>
                      <SidebarGroupLabel>Operations</SidebarGroupLabel>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton href="#" isActive>
                            <Sparkles /> Today’s brief
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton href="#">
                            <Newspaper /> The wire
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton href="#">
                            <LayoutDashboard /> Admin
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroup>
                    <SidebarGroup>
                      <SidebarGroupLabel>Preferences</SidebarGroupLabel>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton href="#">
                            <Moon /> Appearance
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroup>
                  </SidebarContent>
                </Sidebar>
                <div className="flex-1 p-6">
                  <p className="kicker">Preview</p>
                  <p className="display mt-2 text-3xl">A quieter operations surface.</p>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    The sidebar is intentionally desktop-only. On smaller screens the same routes live in the header
                    and the command palette.
                  </p>
                  <div className="mt-4 text-xs text-muted-foreground">
                    Use the panel control to collapse the rail. Data tables, charts and dialogs sit inside this frame.
                  </div>
                </div>
              </div>
            </SidebarProvider>
          </div>
        </Section>

        <Section title="Editorial rules" description="The visual system follows the product rules, not the other way around.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["24 hours", "The wire forgets. Old stories are archived, never silently deleted."],
              ["Five", "The brief is finite. No personalised infinite scroll after it."],
              ["Accessible", "AA contrast at 360px, visible focus, keyboard-first actions."],
              ["Quiet", "One accent. Motion lasts a second, then gets out of the way."],
            ].map(([title, copy]) => (
              <div key={title} className="surface p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <footer className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground">
        <p>Design system · The Bureaucracy</p>
        <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground">
          Back to the wire <ArrowRight className="size-3" />
        </Link>
      </footer>
    </div>
  );
}
