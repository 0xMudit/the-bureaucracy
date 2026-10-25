import { useRouter } from "expo-router";
import { Newspaper } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FeedItem, SortKey } from "@/api/types";
import { useFeed, useVote } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { FeedRow } from "@/components/FeedRow";
import { ChipRail, ScopeLine } from "@/components/FilterChips";
import { Masthead } from "@/components/Masthead";
import { SortTabs } from "@/components/SortTabs";
import { EmptyState, ErrorNote, Kicker, Screen, WireSkeleton } from "@/components/ui";
import { useFeedFilters } from "@/lib/filters";
import { timeAgo } from "@/lib/time";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, type as typography } from "@/theme/tokens";

type Rail = "themes" | "optional";

const PAGE = 40;
const MAX_ITEMS = 60;

/** The two scope rails share one row of chrome; only one is on screen at a time. */
function RailToggle({ rail, onChange }: { rail: Rail; onChange: (next: Rail) => void }) {
  const { colors } = useTheme();
  const rows: { id: Rail; label: string }[] = [
    { id: "themes", label: "Themes" },
    { id: "optional", label: "Optional" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
      }}
    >
      {rows.map((row) => {
        const active = row.id === rail;
        return (
          <Pressable
            key={row.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(row.id)}
            hitSlop={6}
          >
            <Text
              style={[
                typography.tag,
                {
                  color: active ? colors.foreground : colors.mutedForeground,
                  fontSize: 9,
                  letterSpacing: 1,
                },
              ]}
            >
              {row.label}
            </Text>
            <View
              style={{
                height: active ? 1.5 : 0,
                backgroundColor: colors.primary,
                marginTop: 3,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function WireScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { filters, setFilters, clearScope, isScoped } = useFeedFilters();
  const [rail, setRail] = useState<Rail>("themes");
  const [limit, setLimit] = useState(PAGE);

  const feed = useFeed(filters, limit);
  const vote = useVote();
  const data = feed.data;

  const openStory = useCallback(
    (item: FeedItem) => router.push({ pathname: "/item/[id]", params: { id: item.id } }),
    [router],
  );

  const onSort = useCallback(
    (sort: SortKey) => {
      setFilters({ sort });
      setLimit(PAGE);
    },
    [setFilters],
  );

  const onEndReached = useCallback(() => {
    if (data?.meta.hasMore && limit < MAX_ITEMS) {
      setLimit((current) => Math.min(MAX_ITEMS, current + 20));
    }
  }, [data?.meta.hasMore, limit]);

  const header = data ? (
    <View style={{ paddingBottom: spacing.xs }}>
      <ScopeLine
        parts={[data.screen.title]}
        trailing={`${data.meta.count} ${data.meta.count === 1 ? "story" : "stories"}${
          data.meta.latestFetchedAt ? ` · synced ${timeAgo(data.meta.latestFetchedAt)}` : ""
        }`}
        onClear={isScoped ? clearScope : undefined}
      />

      {isScoped ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: 2, paddingBottom: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Kicker muted>{data.screen.kicker}</Kicker>
          </View>
          <Text style={[typography.display, { color: colors.foreground, fontSize: 24, lineHeight: 27 }]}>
            {data.screen.title}
          </Text>
          <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 4 }]}>
            {data.screen.blurb}
          </Text>
        </View>
      ) : null}

      <RailToggle rail={rail} onChange={setRail} />
      {rail === "themes" ? (
        <ChipRail
          options={data.counts.topics.map((topic) => ({
            id: topic.id,
            label: topic.label,
            count: topic.count,
          }))}
          active={filters.topic}
          onSelect={(topic) => {
            setFilters({ topic });
            setLimit(PAGE);
          }}
          allLabel="All themes"
        />
      ) : (
        <ChipRail
          options={data.counts.optionals.map((optional) => ({
            id: optional.id,
            label: optional.short,
            count: optional.count,
          }))}
          active={filters.optional}
          onSelect={(optional) => {
            setFilters({ optional });
            setLimit(PAGE);
          }}
          tone="primary"
          allLabel="All optional"
        />
      )}
    </View>
  ) : null;

  let body: React.ReactNode;

  if (!data && feed.isLoading) {
    body = <WireSkeleton rows={6} />;
  } else if (!data && feed.error) {
    body = (
      <EmptyState
        icon={<Newspaper size={26} color={colors.mutedForeground} strokeWidth={1.5} />}
        title="The wire is not answering"
        body={
          feed.error instanceof ApiError
            ? feed.error.message
            : "The server could not be reached. Check your connection and try again."
        }
        action={<ErrorNote message="Tap to retry" onRetry={() => void feed.refetch()} />}
      />
    );
  } else if (data) {
    body = (
      <FlatList
        data={data.items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching && !feed.isLoading}
            onRefresh={() => void feed.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
        renderItem={({ item }) => (
          <FeedRow
            item={item}
            voted={data.votedIds.includes(item.id)}
            canWrite={data.meta.canWrite}
            onVote={() => {
              if (data.meta.canWrite) vote.mutate(item.id);
            }}
            onOpen={() => openStory(item)}
          />
        )}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <EmptyState
            icon={<Newspaper size={26} color={colors.mutedForeground} strokeWidth={1.5} />}
            title="The wire is quiet"
            body={
              isScoped
                ? "No story in the last 24 hours matches this scope. Clear the filters to see the whole wire."
                : "Nothing has ranked in the last 24 hours. The next ingest runs within fifteen minutes."
            }
            action={
              isScoped ? (
                <Pressable onPress={clearScope} hitSlop={8}>
                  <Text style={[typography.meta, { color: colors.primary }]}>Clear filters</Text>
                </Pressable>
              ) : undefined
            }
          />
        }
        ListFooterComponent={
          data.items.length > 0 ? (
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
              <Text
                style={[
                  typography.tag,
                  { color: colors.mutedForeground, fontSize: 9, lineHeight: 15, letterSpacing: 0.8 },
                ]}
              >
                {data.meta.hasMore && limit < MAX_ITEMS
                  ? `Showing ${data.items.length} of ${data.meta.scope}. Scroll for more.`
                  : "The wire turns over every 24 hours. Older stories are deleted, not archived."}
              </Text>
            </View>
          ) : null
        }
      />
    );
  } else {
    body = null;
  }

  return (
    <Screen>
      <Masthead onSearch={() => router.push("/search")} />
      <SortTabs active={filters.sort} onChange={onSort} />
      {body}
    </Screen>
  );
}
