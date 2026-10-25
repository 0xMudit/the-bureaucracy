import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ApiError, getFeed, getStory, getTaxonomy, postVote } from "./client";
import type { FeedFilters, FeedResponse, StoryResponse } from "./types";
import { getDeviceId } from "@/lib/device";
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

  return useQuery({
    queryKey: ["feed", filterKey(filters), limit, device.data ?? "anonymous"],
    queryFn: () => getFeed(filters, device.data ?? null, limit),
    // Allow feed to load even if device ID isn't ready yet
    enabled: true,
    // The wire turns over on a 15-minute ingest cycle, so a minute of staleness
    // is invisible to the reader and saves a round trip on every tab switch.
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    retry: (attempt, error) => error instanceof ApiError && error.retryable && attempt < 2,
  });
}

export function useStory(id: string | undefined) {
  const device = useDeviceId();

  return useQuery({
    queryKey: ["story", id, device.data ?? "anonymous"],
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

interface VoteContext {
  feeds: [readonly unknown[], FeedResponse | undefined][];
  stories: [readonly unknown[], StoryResponse | undefined][];
}

/**
 * Optimistic vote toggle. The tap has to feel instant — the story is ranked by
 * points, so a spinner under the arrow would undercut the whole product.
 */
export function useVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const deviceId = await getDeviceId();
      return postVote(itemId, deviceId);
    },

    onMutate: async (itemId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      await queryClient.cancelQueries({ queryKey: ["feed"] });
      await queryClient.cancelQueries({ queryKey: ["story", itemId] });

      const feeds = queryClient.getQueriesData<FeedResponse>({ queryKey: ["feed"] });
      const stories = storyQueries(queryClient, itemId);

      queryClient.setQueriesData<FeedResponse>({ queryKey: ["feed"] }, (data) => {
        if (!data) return data;
        const voted = data.votedIds.includes(itemId);
        return {
          ...data,
          votedIds: voted
            ? data.votedIds.filter((id) => id !== itemId)
            : [...data.votedIds, itemId],
          items: data.items.map((item) =>
            item.id === itemId
              ? { ...item, points: Math.max(0, item.points + (voted ? -1 : 1)) }
              : item,
          ),
        };
      });

      setStoryQueries(queryClient, itemId, (story) => ({
        ...story,
        voted: !story.voted,
        item: {
          ...story.item,
          points: Math.max(0, story.item.points + (story.voted ? -1 : 1)),
        },
      }));

      return { feeds, stories } satisfies VoteContext;
    },

    onError: (_error, _itemId, context) => {
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
      // Reconcile with the server's tally so concurrent voters do not drift.
      queryClient.setQueriesData<FeedResponse>({ queryKey: ["feed"] }, (data) => {
        if (!data) return data;
        return {
          ...data,
          votedIds: result.voted
            ? data.votedIds.includes(result.itemId)
              ? data.votedIds
              : [...data.votedIds, result.itemId]
            : data.votedIds.filter((id) => id !== result.itemId),
          items: data.items.map((item) =>
            item.id === result.itemId ? { ...item, points: result.points } : item,
          ),
        };
      });

      setStoryQueries(queryClient, result.itemId, (story) => ({
        ...story,
        voted: result.voted,
        item: { ...story.item, points: result.points },
      }));
    },
  });
}
