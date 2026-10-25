import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquare, UserPlus, Users } from "lucide-react";
import { DiscussionCard } from "@/components/discussion-card";
import { FollowButton } from "@/components/follow-button";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import {
  listFollowingDiscussions,
  listFollowingProfiles,
  listSuggestedReaders,
} from "@/lib/people";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Following",
  description: "Discussion activity from the readers you follow.",
  robots: { index: false, follow: false },
};

export default async function FollowingPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Following</p>
          <h1 className="display mt-1 text-[2rem] leading-none">Your reading circle.</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Follow other aspirants to see their arguments in one place. Sign in to build the list.
          </p>
          <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/login?next=/following">
              <Users className="size-3.5" /> Log in to follow
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const [discussions, following, suggested] = await Promise.all([
    listFollowingDiscussions(user.id),
    listFollowingProfiles(user.id),
    listSuggestedReaders(user.id, 6),
  ]);

  const followingIds = new Set(following.map((profile) => profile.id));
  const suggestions = suggested.filter((profile) => !followingIds.has(profile.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back to the wire
      </Link>

      <div className="mt-4 border-b-2 border-foreground pb-4">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
          <Users className="size-3.5" /> Your circle
        </p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          Following.
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Discussion activity from the readers you follow, newest first. Only work on live stories
          appears here; archived threads keep their comments.
        </p>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-labelledby="activity">
          <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
            <h2 id="activity" className="display text-[1.5rem] leading-none tracking-[-0.02em]">
              Recent arguments
            </h2>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
              {discussions.length} {discussions.length === 1 ? "comment" : "comments"}
            </span>
          </div>

          {discussions.length ? (
            <div>
              {discussions.map((entry) => (
                <DiscussionCard key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="border-b border-border/70 py-12 text-center">
              <MessageSquare className="mx-auto size-5 text-muted-foreground" />
              <p className="display mt-3 text-2xl">Nothing from your circle yet.</p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
                {following.length
                  ? "The readers you follow have not commented on a live story in the last day. The wire turns over every 24 hours."
                  : "Follow a reader below. Their comments on live stories will appear here."}
              </p>
              {suggestions.length ? (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {suggestions.slice(0, 3).map((profile) => (
                    <FollowButton
                      key={profile.id}
                      targetId={profile.id}
                      targetUsername={profile.username}
                      initialFollowing={false}
                      initialFollowers={profile.followerCount}
                      isAuthenticated
                      isSelf={false}
                      size="sm"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className="border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <h2 className="font-mono text-[9px] uppercase tracking-[0.18em]">You follow</h2>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                {following.length}
              </span>
            </div>
            {following.length ? (
              <ul className="divide-y divide-border/60">
                {following.map((profile) => (
                  <li key={profile.id} className="flex items-center gap-2.5 px-3 py-2.5">
                    <Link href={`/u/${profile.username}`} aria-label={`Open ${profile.name}'s desk`}>
                      <UserAvatar
                        name={profile.name}
                        id={profile.id}
                        config={profile.avatar}
                        size={28}
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/u/${profile.username}`}
                        className="block truncate text-[12px] font-medium hover:text-primary"
                      >
                        {profile.name}
                      </Link>
                      <p className="truncate font-mono text-[8.5px] tracking-[0.04em] text-muted-foreground">
                        @{profile.username} · {profile.followerCount} followers
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-4 text-[11.5px] leading-relaxed text-muted-foreground">
                You are not following anyone yet.
              </p>
            )}
          </section>

          <section className="border border-border bg-card">
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
              <UserPlus className="size-3 text-primary" />
              <h2 className="font-mono text-[9px] uppercase tracking-[0.18em]">Readers to follow</h2>
            </div>
            {suggestions.length ? (
              <ul className="divide-y divide-border/60">
                {suggestions.map((profile) => (
                  <li key={profile.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        name={profile.name}
                        id={profile.id}
                        config={profile.avatar}
                        size={26}
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/u/${profile.username}`}
                          className="block truncate text-[12px] font-medium hover:text-primary"
                        >
                          {profile.name}
                        </Link>
                        <p className="truncate font-mono text-[8.5px] text-muted-foreground">
                          @{profile.username}
                        </p>
                      </div>
                    </div>
                    <div className="mt-1.5">
                      <FollowButton
                        targetId={profile.id}
                        targetUsername={profile.username}
                        initialFollowing={false}
                        initialFollowers={profile.followerCount}
                        isAuthenticated
                        isSelf={false}
                        size="sm"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-4 text-[11.5px] leading-relaxed text-muted-foreground">
                No other readers yet. When someone joins and comments, they will appear here.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
