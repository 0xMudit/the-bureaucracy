import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import {
  ApiError,
  createCircle,
  getBrief,
  getCircles,
  getFeed,
  getStory,
  getTaxonomy,
  joinCircle,
  postReaction,
  subscribeDigest,
} from "./client";
import type { FeedFilters, FeedResponse, StoryResponse } from "./types";
import { getDeviceId } from "@/lib/device";
import { useAuth } from "@/lib/auth";
import { useDesk } from "@/lib/desk";
import { filterKey } from "@/lib/filters";

/** Read once, keep forever: the id only changes on reinstall. */
export function useDeviceId() {
  return useQuery({
    queryKey: ["device-id"],
    queryFn: getDeviceId,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}

export function useFeed(filters: FeedFilters, limit = 40) {
  const device = useDeviceId();
  const desk = useDesk();

  return useQuery({
    queryKey: ["feed", filterKey(filters), desk.signature, limit, device.data ?? "anonymous"],
    queryFn: () => getFeed(filters, device.data ?? null, limit, desk.param),
    // Allow feed to load even if device ID isn't ready yet
    enabled: true,
    // The wire turns over on a 15-minute ingest cycle, so a minute of staleness
    // is invisible to the reader and saves a round trip on every tab switch.
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    retry: (attempt, error) => error instanceof ApiError && error.retryable && attempt < 2,
  });
}

/**
 * Today's five, ranked for the desk. The server freezes the entries on first
 * sight; the tab also caches them locally so a restart cannot move the finish
 * line. One shared query means the wire hero and the brief tab agree.
 */
export function useBrief() {
  const desk = useDesk();

  return useQuery({
    queryKey: ["brief", desk.signature],
    queryFn: () => getBrief(desk.param),
    staleTime: 5 * 60_000,
    gcTime: 6 * 60 * 60_000,
    retry: (attempt, error) => error instanceof ApiError && error.retryable && attempt < 2,
  });
}

export function useCircles(enabled = true) {
  return useQuery({
    queryKey: ["circles"],
    queryFn: () => getCircles(),
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: (attempt, error) => error instanceof ApiError && error.retryable && attempt < 1,
  });
}

export function useCreateCircle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCircle(name),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["circles"] });
    },
  });
}

export function useJoinCircle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => joinCircle(code),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["circles"] });
    },
  });
}

export function useSubscribeDigest() {
  return useMutation({
    mutationFn: (email: string) => subscribeDigest(email),
  });
}

export function useStory(id: string | undefined) {
  const device = useDeviceId();
  const { session } = useAuth();
  const viewer = session?.user.id ?? "anonymous";

  return useQuery({
    // The key carries the account so signing in refetches the story: the
    // premium pack is resolved on the server from the bearer token, and a
    // cached anonymous response would keep showing the locked teaser.
    queryKey: ["story", id, device.data ?? "anonymous", viewer],
    queryFn: () => getStory(id as string, device.data),
    enabled: Boolean(id && device.data),
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    // A 404 or a 410 is a final answer: the story has left the wire.
    retry: (attempt, error) => error instanceof ApiError && error.retryable && attempt < 2,
  });
}

export function useTaxonomy() {
  return useQuery({
    queryKey: ["taxonomy"],
    queryFn: getTaxonomy,
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: 2,
  });
}

/**
 * Story queries are keyed `["story", id, deviceId]`, so an exact
 * `setQueryData(["story", id])` would never match. Every helper below works on
 * the prefix instead, which keeps the detail screen in step with the feed.
 */
function storyQueries(client: QueryClient, itemId: string) {
  return client.getQueriesData<StoryResponse>({ queryKey: ["story", itemId] });
}

function setStoryQueries(
  client: QueryClient,
  itemId: string,
  update: (story: StoryResponse) => StoryResponse,
) {
  client.setQueriesData<StoryResponse>({ queryKey: ["story", itemId] }, (story) =>
    story ? update(story) : story,
  );
}

interface ReactionContext {
  feeds: [readonly unknown[], FeedResponse | undefined][];
  stories: [readonly unknown[], StoryResponse | undefined][];
}

type ReactionKind = "like" | "dislike";

function nextCounts(
  item: { reaction?: ReactionKind | null; likeCount?: number; dislikeCount?: number },
  kind: ReactionKind,
) {
  const current = item.reaction ?? null;
  const next = current === kind ? null : kind;
  let likes = item.likeCount ?? 0;
  let dislikes = item.dislikeCount ?? 0;
  if (current === "like") likes = Math.max(0, likes - 1);
  if (current === "dislike") dislikes = Math.max(0, dislikes - 1);
  if (next === "like") likes += 1;
  if (next === "dislike") dislikes += 1;
  return { reaction: next, likes, dislikes };
}

/**
 * Optimistic like/dislike. Like and dislike are mutually exclusive; tapping
 * the active one removes it. The tap must feel instant on a phone.
 */
export function useReact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, kind }: { itemId: string; kind: ReactionKind }) => {
      const deviceId = await getDeviceId();
      return postReaction(itemId, kind, deviceId);
    },

    onMutate: async ({ itemId, kind }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      await queryClient.cancelQueries({ queryKey: ["feed"] });
      await queryClient.cancelQueries({ queryKey: ["story", itemId] });

      const feeds = queryClient.getQueriesData<FeedResponse>({ queryKey: ["feed"] });
      const stories = storyQueries(queryClient, itemId);

      queryClient.setQueriesData<FeedResponse>({ queryKey: ["feed"] }, (data) => {
        if (!data) return data;
        return {
          ...data,
          items: data.items.map((item) => {
            if (item.id !== itemId) return item;
            const counts = nextCounts(item, kind);
            return { ...item, likeCount: counts.likes, dislikeCount: counts.dislikes, reaction: counts.reaction };
          }),
        };
      });

      setStoryQueries(queryClient, itemId, (story) => {
        const counts = nextCounts(story.item, kind);
        return {
          ...story,
          item: {
            ...story.item,
            likeCount: counts.likes,
            dislikeCount: counts.dislikes,
            reaction: counts.reaction,
          },
        };
      });

      return { feeds, stories } satisfies ReactionContext;
    },

    onError: (_error, _input, context) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      if (!context) return;
      for (const [key, data] of context.feeds) {
        queryClient.setQueryData(key, data);
      }
      for (const [key, data] of context.stories) {
        queryClient.setQueryData(key, data);
      }
    },

    onSuccess: (result) => {
      // Reconcile with the server's tally so concurrent readers do not drift.
      queryClient.setQueriesData<FeedResponse>({ queryKey: ["feed"] }, (data) => {
        if (!data) return data;
        return {
          ...data,
          items: data.items.map((item) =>
            item.id === result.itemId
              ? {
                  ...item,
                  likeCount: result.likes,
                  dislikeCount: result.dislikes,
                  reaction: result.reaction,
                }
              : item,
          ),
        };
      });

      setStoryQueries(queryClient, result.itemId, (story) => ({
        ...story,
        item: {
          ...story.item,
          likeCount: result.likes,
          dislikeCount: result.dislikes,
          reaction: result.reaction,
        },
      }));
    },
  });
}
