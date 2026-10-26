import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, ArrowUpRight, Clock, ExternalLink, Gavel, Layers, Rss, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleImage } from "@/components/article-image";
import { BulletList } from "@/components/rich-text";
import { ReactionBar } from "@/components/reaction-bar";
import { CommentForm } from "@/components/comment-form";
import { DiscussionLive } from "@/components/discussion-live";
import { BriefNext } from "@/components/brief-next";
import { ReadButton, ReadingProgress } from "@/components/reading-loop";
import { PrelimsReveal } from "@/components/prelims-reveal";
import { PremiumPack } from "@/components/premium-pack";
import { ShareButton } from "@/components/share-button";
import { buildCommentTree } from "@/lib/comments";
import { getSessionUser } from "@/lib/auth";
import { entitlementOf } from "@/lib/entitlements";
import { NEWS_WINDOW_MS, SITE } from "@/lib/config";
import { buildFeed } from "@/lib/rank";
import { briefFromItems } from "@/lib/brief";
import { premiumView } from "@/lib/premium";
import { quizFor } from "@/lib/quiz";
import { matchPyq } from "@/lib/pyq";
import { DESK_COOKIE, parseDesk } from "@/lib/desk";
import { istDateKey } from "@/lib/progress";
import { PAPER_LABEL, priorityLabel } from "@/lib/taxonomy-extras";
import { OPTIONALS, TOPICS } from "@/lib/taxonomy";
import { cachedComments, cachedItem, cachedItems } from "@/lib/cached";
import { canWrite } from "@/lib/store";
import { getCommentLikeStates, getReactionStates, viewerActor } from "@/lib/social";
import type { FeedItem } from "@/lib/types";
import { formatDate, timeAgo, timeUntil } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function loadItem(id: string): Promise<FeedItem | null> {
  const item = await cachedItem(id);
  if (!item) return null;
  if (Date.now() - new Date(item.publishedAt).getTime() > NEWS_WINDOW_MS) return null;
  return item;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await loadItem(id);
  if (!item) return { title: "Story not found" };
  const topic = item.primaryTopic ? TOPICS[item.primaryTopic] : null;
  const description = (
    item.summary ||
    `${topic?.label ?? "Current affairs"} story on the 24-hour wire, ranked for UPSC and state PSC aspirants.`
  ).slice(0, 160);
  return {
    title: item.title,
    description,
    keywords: item.keywords,
    alternates: { canonical: `/item/${item.id}` },
    openGraph: {
      type: "article",
      title: item.title,
      description,
      url: `/item/${item.id}`,
      siteName: SITE.name,
      publishedTime: item.publishedAt,
    },
    twitter: { card: "summary", title: item.title, description },
  };
}

export default async function ItemPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const item = await loadItem(id);
  if (!item) notFound();

  const jar = await cookies();
  const desk = parseDesk(jar.get(DESK_COOKIE)?.value);
  const user = await getSessionUser();
  const entitlement = entitlementOf(
    user
      ? {
          plan: user.plan,
          planExpiresAt: user.planExpiresAt,
          planSource: user.planSource,
          role: user.role,
        }
      : null,
  );
  const [premium, comments, all, viewer] = await Promise.all([
    premiumView(item, entitlement, { generate: true }),
    cachedComments(item.id),
    cachedItems(),
    viewerActor(),
  ]);
  const [reactions, commentLikes] = await Promise.all([
    getReactionStates(viewer, [item.id]),
    getCommentLikeStates(
      viewer,
      comments.map((comment) => comment.id),
    ),
  ]);
  const reaction = reactions[item.id] ?? {
    reaction: null,
    saved: false,
    likes: item.likeCount ?? 0,
    dislikes: item.dislikeCount ?? 0,
  };
  const tree = buildCommentTree(comments);
  const topic = item.primaryTopic ? TOPICS[item.primaryTopic] : null;
  const paper = topic ? PAPER_LABEL[topic.paper] : "Current affairs";
  const brief = briefFromItems(all, desk);
  const quiz = quizFor(item);
  const pyq = matchPyq(item);

  const related = buildFeed(
    all.filter((other) => other.id !== item.id && other.primaryTopic === item.primaryTopic),
    { sort: "best", limit: 3 },
  );

  const duplicate = query.duplicate === "1";
  const low = query.low === "1";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ReadingProgress itemId={item.id} topicId={item.primaryTopic ?? undefined} />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> All stories
        </Link>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {topic ? `${paper} · ${topic.label}` : "Current affairs"}
        </span>
      </div>

      {duplicate ? (
        <p className="mt-4 border-l-2 border-primary bg-primary/5 px-3 py-2 text-xs text-primary">
          This link was already on the wire. You are reading the existing discussion.
        </p>
      ) : null}
      {low ? (
        <p className="mt-4 border-l-2 border-warning bg-warning/10 px-3 py-2 text-xs text-warning">
          This submission scored low on syllabus relevance. It is visible here but will not rank on the front page.
        </p>
      ) : null}

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_296px]">
        <article className="min-w-0">
          <div className="flex gap-2 sm:gap-3">
            <ReactionBar itemId={item.id} initial={reaction} canWrite={canWrite()} size="md" />
            <div className="min-w-0">
              {item.kicker ? <p className="kicker">{item.kicker}</p> : null}
              <h1 className="display mt-1.5 text-[2rem] leading-[1.05] tracking-[-0.02em] sm:text-[2.7rem]">
                {item.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  {item.sourceTier === "official" ? <span className="size-1.5 rounded-full bg-primary" /> : null}
                  {item.source} <ExternalLink className="size-2.5" />
                </a>
                <span aria-hidden>·</span>
                <time dateTime={item.publishedAt}>{timeAgo(item.publishedAt)}</time>
                <span aria-hidden>·</span>
                <span>{formatDate(item.publishedAt)}</span>
                <span aria-hidden>·</span>
                <span className={item.priority === "high" ? "text-primary" : ""}>{priorityLabel(item.priority)}</span>
                <span aria-hidden>·</span>
                <span>{item.examScore}/100 relevance</span>
                {pyq ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="text-primary">PYQ {pyq.year}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <ArticleImage
            src={item.imageUrl}
            alt={item.title}
            topic={item.primaryTopic}
            source={item.source}
            priority
            className="mt-5 aspect-[16/9] w-full border border-border"
          />

          <div className="mt-5 border-l-2 border-border pl-4 sm:pl-5">
            {item.summaryBullets?.length ? (
              <>
                <p className="mb-2 font-mono text-[8.5px] uppercase tracking-[0.18em] text-primary">
                  The story in five lines
                </p>
                <BulletList bullets={item.summaryBullets} />
              </>
            ) : (
              <p className="text-[15px] leading-[1.75] text-foreground/90">
                {item.summary ||
                  "The publisher did not include an excerpt in its feed. Open the original for the full report."}
              </p>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
              {item.imageAttribution || item.source}
              {item.imageUrl ? <span aria-hidden>· image: {item.imageSource ?? "publisher"}</span> : null}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
                <a href={item.url} target="_blank" rel="noreferrer noopener">
                  Read at {item.source} <ArrowUpRight className="size-3.5" />
                </a>
              </Button>
              <ReadButton itemId={item.id} topicId={item.primaryTopic ?? undefined} />
              <ShareButton title={item.title} path={`/item/${item.id}`} source={item.source} />
              <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                Headline and excerpt remain the publisher&apos;s
              </span>
            </div>
          </div>

          <PremiumPack premium={premium} />

          <PrelimsReveal itemId={item.id} quiz={quiz} />

          <section aria-labelledby="why" className="mt-8 border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
              <h2 id="why" className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]">
                <Gavel className="size-3.5 text-primary" /> Why it matters
              </h2>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                {item.gsPaper ?? paper} · {topic?.label ?? "General"}
              </span>
            </div>
            <div className="px-4 py-4">
              <p className="text-[14px] leading-relaxed text-foreground/90">
                {item.examAngle ??
                  topic?.why ??
                  "A general current-affairs item. Place it against a syllabus theme before you commit it to memory."}
              </p>

              {(item.prelimsFact || item.mainsAngle || item.syllabusHint) && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {item.prelimsFact ? (
                    <div className="border border-border bg-background px-3 py-2">
                      <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-primary">
                        Likely Prelims fact
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/85">
                        {item.prelimsFact}
                      </p>
                    </div>
                  ) : null}
                  {item.mainsAngle ? (
                    <div className="border border-border bg-background px-3 py-2">
                      <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-primary">
                        Mains angle
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/85">
                        {item.mainsAngle}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {item.syllabusHint ? (
                <p className="mt-3 flex gap-2 border-l-2 border-primary/50 pl-2.5 text-[12px] leading-relaxed text-muted-foreground">
                  <span className="font-mono text-primary">→</span>
                  {item.syllabusHint}
                </p>
              ) : null}

              <h3 className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Answer hooks
              </h3>
              <ul className="mt-2 space-y-1.5">
                {(topic?.hooks ?? [
                  "What is the factual update, and which institution owns it?",
                  "Which part of the syllabus does it illuminate?",
                  "What is the counter-argument or implementation risk?",
                ]).map((hook) => (
                  <li key={hook} className="flex gap-2 text-[13px] leading-relaxed text-foreground/85">
                    <span className="font-mono text-primary">→</span>
                    <span>{hook}</span>
                  </li>
                ))}
              </ul>

              {item.keywords.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {item.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="border border-border bg-background px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <BriefNext currentId={item.id} entries={brief} dateKey={istDateKey()} />

          <section id="discussion" aria-labelledby="discussion-title" className="mt-10 scroll-mt-6">
            <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-2">
              <h2 id="discussion-title" className="display text-[1.8rem] leading-none">
                Discussion
              </h2>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                {comments.length} {comments.length === 1 ? "comment" : "comments"}
              </span>
            </div>

            <div className="mt-4 border border-border bg-card p-4">
              {canWrite() && user ? (
                <CommentForm itemId={item.id} authorName={user.name} />
              ) : canWrite() ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p>Log in to join the discussion. Likes and dislikes stay open to everyone.</p>
                  </div>
                  <Button asChild size="sm" className="h-8 shrink-0 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
                    <Link href={`/login?next=${encodeURIComponent(`/item/${item.id}#discussion`)}`}>Log in to comment</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p>
                    Discussions are read-only until a database is connected. See the{" "}
                    <Link href="/about" className="underline hover:text-foreground">
                      setup notes
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <DiscussionLive
                initialNodes={tree}
                itemId={item.id}
                authorName={user?.name}
                canComment={Boolean(user) && canWrite()}
                canReport={canWrite()}
                likes={commentLikes}
                viewerId={user?.id}
                loginHref={`/login?next=${encodeURIComponent(`/item/${item.id}#discussion`)}`}
              />
            </div>
          </section>
        </article>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className="border border-border bg-card">
            <div className="border-b border-border px-3 py-2">
              <h2 className="font-mono text-[9px] uppercase tracking-[0.18em]">Syllabus file</h2>
            </div>
            <div className="space-y-3 px-3 py-3">
              <div>
                <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">Paper</p>
                <p className="text-[13px] font-medium">{paper}</p>
              </div>
              <div>
                <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">Theme</p>
                <p className="text-[13px] font-medium">{topic?.label ?? "General current affairs"}</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
                    Relevance
                  </p>
                  <p className="font-mono text-[10px] text-primary">{item.examScore}/100</p>
                </div>
                <div className="mt-1 h-1.5 w-full bg-muted">
                  <div className="h-1.5 bg-primary" style={{ width: `${item.examScore}%` }} />
                </div>
              </div>
              {topic ? (
                <div className="flex flex-wrap gap-1">
                  {topic.cues.slice(0, 3).map((cue) => (
                    <span key={cue} className="bg-secondary px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-secondary-foreground">
                      {cue}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          {item.optionals.length && item.primaryOptional ? (
            <section className="border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <h2 className="font-mono text-[9px] uppercase tracking-[0.18em]">Optional fit</h2>
                <Link
                  href={`/?optional=${item.primaryOptional}`}
                  className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-primary hover:underline"
                >
                  Open feed
                </Link>
              </div>
              <div className="space-y-3 px-3 py-3">
                <div>
                  <p className="text-[13px] font-medium">{OPTIONALS[item.primaryOptional].label}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                    {OPTIONALS[item.primaryOptional].why}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.optionals.map((id) => (
                    <Link
                      key={id}
                      href={`/?optional=${id}`}
                      className="border border-border bg-background px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-muted-foreground hover:border-primary/40 hover:text-primary"
                    >
                      {OPTIONALS[id].short}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <section className="border border-border bg-card">
            <div className="border-b border-border px-3 py-2">
              <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em]">
                <Layers className="size-3" /> On the record
              </h2>
            </div>
            <div className="space-y-2 px-3 py-3 text-[12px]">
              <p className="flex items-center justify-between gap-3">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">Source</span>
                <span className="truncate text-right font-medium">{item.source}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">Tier</span>
                <span className="capitalize">{item.sourceTier}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">Published</span>
                <span>{formatDate(item.publishedAt)}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">Expires</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {timeUntil(new Date(new Date(item.publishedAt).getTime() + NEWS_WINDOW_MS).toISOString())}
                </span>
              </p>
            </div>
          </section>

          {related.length ? (
            <section className="border border-border bg-card">
              <div className="border-b border-border px-3 py-2">
                <h2 className="font-mono text-[9px] uppercase tracking-[0.18em]">Related on the wire</h2>
              </div>
              <ul className="divide-y divide-border/70">
                {related.map((rel) => (
                  <li key={rel.id} className="px-3 py-2.5">
                    <Link href={`/item/${rel.id}`} className="text-[12px] font-medium leading-snug hover:text-primary">
                      {rel.title}
                    </Link>
                    <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
                      {rel.source} · {timeAgo(rel.publishedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex items-center justify-between gap-2 border border-dashed border-border px-3 py-2">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
              Subscribe to the wire
            </span>
            <a href="/feed.xml" className="inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] hover:text-primary">
              <Rss className="size-3" /> RSS
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
