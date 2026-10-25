import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MessageSquare, Users } from "lucide-react";
import { DiscussionCard } from "@/components/discussion-card";
import { FollowButton } from "@/components/follow-button";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { getProfileByUsername, listProfileDiscussions } from "@/lib/people";
import { isFollowing } from "@/lib/social";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const username = decodeURIComponent((await params).username);
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "Reader not found" };
  return {
    title: `${profile.name} (@${profile.username})`,
    description: profile.bio || `${profile.name}'s comments and replies on The Bureaucracy.`,
    alternates: { canonical: `/u/${profile.username}` },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const username = decodeURIComponent((await params).username);
  const [profile, viewer] = await Promise.all([getProfileByUsername(username), getSessionUser()]);
  if (!profile) notFound();

  const isSelf = viewer?.id === profile.id;
  const [following, discussions] = await Promise.all([
    viewer && !isSelf ? isFollowing(viewer.id, profile.id) : Promise.resolve(false),
    listProfileDiscussions(profile.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href={viewer ? "/following" : "/"}
        className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {viewer ? "Following" : "The wire"}
      </Link>

      <div className="mt-4 grid gap-5 border-b-2 border-foreground pb-6 sm:grid-cols-[auto_1fr] sm:items-start">
        <UserAvatar
          name={profile.name}
          id={profile.id}
          config={profile.avatar}
          size={92}
          className="mx-auto sm:mx-0"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Reader&apos;s desk</p>
              <h1 className="display mt-1 truncate text-[2.1rem] leading-none tracking-[-0.025em] sm:text-[2.5rem]">
                {profile.name}
              </h1>
              <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
                @{profile.username}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <FollowButton
                targetId={profile.id}
                targetUsername={profile.username}
                initialFollowing={following}
                initialFollowers={profile.followerCount}
                isAuthenticated={Boolean(viewer)}
                isSelf={isSelf}
              />
              {isSelf ? (
                <Button asChild size="sm" variant="ghost" className="h-7 rounded-sm font-mono text-[9px] uppercase tracking-[0.1em]">
                  <Link href="/account">Edit profile</Link>
                </Button>
              ) : null}
            </div>
          </div>

          {profile.bio ? (
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-foreground/85">{profile.bio}</p>
          ) : (
            <p className="mt-3 text-[12.5px] italic text-muted-foreground">No bio filed yet.</p>
          )}

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/70 pt-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              <Users className="size-3" />
              <strong className="text-foreground">{profile.followerCount}</strong> followers
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              <strong className="text-foreground">{profile.followingCount}</strong> following
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              <MessageSquare className="size-3" />
              <strong className="text-foreground">{discussions.length}</strong> recent
            </span>
            {profile.joinedAt ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                <CalendarDays className="size-3" /> Joined {formatDate(profile.joinedAt)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <section className="mt-7" aria-labelledby="profile-activity">
        <div className="flex items-baseline justify-between gap-2 border-b border-border pb-2">
          <h2 id="profile-activity" className="display text-[1.5rem] leading-none tracking-[-0.02em]">
            Recent from this desk
          </h2>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
            Live wire
          </span>
        </div>

        {discussions.length ? (
          <div className="mt-1">
            {discussions.map((entry) => (
              <DiscussionCard key={entry.id} entry={entry} showAuthor={false} />
            ))}
          </div>
        ) : (
          <div className="border-b border-border/70 py-10 text-center">
            <p className="font-display text-xl">A quiet desk.</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {isSelf
                ? "Join a discussion on a live story and it will appear here."
                : "This reader has not commented on a live story yet."}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4 h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.1em]">
              <Link href="/">Open today&apos;s wire</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
