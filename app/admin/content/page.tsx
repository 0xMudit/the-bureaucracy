import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowUpRight, Eye, EyeOff, FileText, Pin, PinOff, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSessionUser, userCan } from "@/lib/auth";
import { cachedItems } from "@/lib/cached";
import { serviceClient } from "@/lib/store";
import { TOPICS } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/utils";
import type { TopicId } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content · The desk",
  robots: { index: false, follow: false },
};

async function pinAction(formData: FormData) {
  "use server";
  const db = serviceClient();
  if (!db) return;
  const itemId = formData.get("itemId") as string;
  const pinned = formData.get("pinned") === "true";
  try {
    await db.from("items").update({ pinned: !pinned }).eq("id", itemId);
  } catch {
    // Non-fatal — ignore DB errors
  }
  revalidatePath("/admin/content");
  revalidatePath("/");
}

async function hideAction(formData: FormData) {
  "use server";
  const db = serviceClient();
  if (!db) return;
  const itemId = formData.get("itemId") as string;
  const hidden = formData.get("hidden") === "true";
  try {
    await db.from("items").update({ hidden: !hidden }).eq("id", itemId);
  } catch {
    // Non-fatal — ignore DB errors
  }
  revalidatePath("/admin/content");
  revalidatePath("/");
}

async function reclassifyAction(formData: FormData) {
  "use server";
  const db = serviceClient();
  if (!db) return;
  const itemId = formData.get("itemId") as string;
  const topic = formData.get("topic") as string;
  try {
    await db
      .from("items")
      .update({ primary_topic: topic || null })
      .eq("id", itemId);
  } catch {
    // Non-fatal — ignore DB errors
  }
  revalidatePath("/admin/content");
  revalidatePath("/");
}

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user || !userCan(user, "admin.dashboard")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Restricted</p>
          <h1 className="display mt-1 text-[2rem] leading-none">Not accessible.</h1>
          <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/admin">Back to the desk</Link>
          </Button>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const q = one(params.q).slice(0, 80);
  const filter = one(params.filter); // "pinned" | "hidden" | ""

  const all = await cachedItems();
  let items = all;
  if (q) {
    const lq = q.toLowerCase();
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(lq) ||
        i.source.toLowerCase().includes(lq) ||
        i.kicker.toLowerCase().includes(lq),
    );
  }
  if (filter === "pinned") items = items.filter((i) => i.pinned);
  if (filter === "hidden") items = items.filter((i) => i.hidden);

  const pinnedCount = all.filter((i) => i.pinned).length;
  const hiddenCount = all.filter((i) => i.hidden).length;
  const topicIds = Object.keys(TOPICS) as TopicId[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
          <FileText className="size-3.5" /> Content
        </p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          Wire management.
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Pin a story to keep it at the top of the wire. Hide it to remove it without deleting. Reclassify the
          topic to fix mismatches. {pinnedCount} pinned · {hiddenCount} hidden.
        </p>
      </div>

      {/* Filter bar */}
      <form className="mt-5 flex flex-wrap items-end gap-2 border border-border bg-card p-3">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Search
          </span>
          <Input
            name="q"
            defaultValue={q}
            placeholder="Title or source"
            className="h-9 rounded-sm bg-background text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Filter
          </span>
          <select
            name="filter"
            defaultValue={filter}
            className="h-9 rounded-sm border border-input bg-background px-2 text-sm"
          >
            <option value="">All stories</option>
            <option value="pinned">Pinned only</option>
            <option value="hidden">Hidden only</option>
          </select>
        </label>
        <Button type="submit" className="h-9 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          Filter
        </Button>
        <Button asChild variant="ghost" className="h-9 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          <Link href="/admin/content">Reset</Link>
        </Button>
      </form>

      <p className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
        {items.length} of {all.length} stories
      </p>

      {/* Story list */}
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => {
            const topic = item.primaryTopic ? TOPICS[item.primaryTopic] : null;
            return (
              <div key={item.id} className="border border-border bg-card p-3">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.pinned ? (
                        <Badge className="font-mono text-[7.5px] uppercase tracking-[0.08em]">Pinned</Badge>
                      ) : null}
                      {item.hidden ? (
                        <Badge variant="destructive" className="font-mono text-[7.5px] uppercase tracking-[0.08em]">
                          Hidden
                        </Badge>
                      ) : null}
                      {topic ? (
                        <Badge variant="outline" className="font-mono text-[7.5px] uppercase tracking-[0.08em]">
                          {topic.label}
                        </Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-1 text-[13.5px] font-medium leading-snug">
                      <Link href={`/item/${item.id}`} className="hover:text-primary">
                        {item.title}
                      </Link>
                    </h3>
                    <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">
                      {item.source} · {timeAgo(item.publishedAt)} · score {item.examScore}
                    </p>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open source"
                    className="shrink-0 text-muted-foreground hover:text-primary"
                  >
                    <ArrowUpRight className="size-4" />
                  </a>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* Pin / unpin */}
                  <form action={pinAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="pinned" value={String(!!item.pinned)} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-sm px-2 font-mono text-[8.5px] uppercase tracking-[0.08em]"
                    >
                      {item.pinned ? (
                        <>
                          <PinOff className="size-3" /> Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="size-3" /> Pin
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Hide / show */}
                  <form action={hideAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="hidden" value={String(!!item.hidden)} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-sm px-2 font-mono text-[8.5px] uppercase tracking-[0.08em]"
                    >
                      {item.hidden ? (
                        <>
                          <Eye className="size-3" /> Unhide
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3" /> Hide
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Reclassify */}
                  <form action={reclassifyAction} className="flex items-center gap-1">
                    <input type="hidden" name="itemId" value={item.id} />
                    <select
                      name="topic"
                      defaultValue={item.primaryTopic ?? ""}
                      aria-label="Reclassify topic"
                      className="h-7 rounded-sm border border-input bg-background px-1.5 font-mono text-[9px] uppercase"
                    >
                      <option value="">No topic</option>
                      {topicIds.map((id) => (
                        <option key={id} value={id}>
                          {TOPICS[id].label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-sm px-2 font-mono text-[8.5px] uppercase tracking-[0.08em]"
                    >
                      <RotateCw className="size-3" /> Reclassify
                    </Button>
                  </form>
                </div>
              </div>
            );
          })
        ) : (
          <div className="border border-dashed border-border px-4 py-8 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              No stories match that filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
