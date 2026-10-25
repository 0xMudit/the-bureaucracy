import { useRouter } from "expo-router";
import { ArrowRight, BookOpen, Flame, Newspaper } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FeedItem, SortKey } from "@/api/types";
import { useBrief, useFeed, useReact } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { FeedRow } from "@/components/FeedRow";
import { ChipRail, ScopeLine } from "@/components/FilterChips";
import { Masthead } from "@/components/Masthead";
import { SortTabs } from "@/components/SortTabs";
import { EmptyState, ErrorNote, Kicker, Screen, WireSkeleton } from "@/components/ui";
import { useFeedFilters } from "@/lib/filters";
import { istDateKey, useProgress } from "@/lib/progress";
import { timeAgo } from "@/lib/time";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing, type as typography } from "@/theme/tokens";

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

function BriefHero({ onOpen }: { onOpen: () => void }) {
  const { colors } = useTheme();
  const brief = useBrief();
  const progress = useProgress();
  const data = brief.data;

  if (!data || data.dateKey !== istDateKey() || !data.entries.length) return null;

  const total = data.entries.length;
  const read = data.entries.filter((entry) => progress.readIds.has(entry.id)).length;
  const done = read >= total;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel="Open the daily brief"
      style={({ pressed }) => ({
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: radius.sm,
        padding: spacing.md,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <BookOpen size={12} color={colors.primary} strokeWidth={2.2} />
        <Text style={[typography.kicker, { color: colors.primary, flex: 1 }]}>THE DAILY BRIEF</Text>
        <Text style={[typography.meta, { color: done ? colors.success : colors.mutedForeground }]}>
          {done ? "FINISHED" : `${read}/${total}`}
        </Text>
      </View>
      <Text
        style={[
          typography.display,
          { color: colors.foreground, fontSize: 22, lineHeight: 24, marginTop: 6 },
        ]}
      >
        {done ? "Today's five are done." : "Five stories. Eight minutes."}
      </Text>
      <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 3 }]}>
        {done
          ? "The retrieval check is waiting. Two questions, no notes."
          : `${total - read} left · ${data.minutes} minutes · ranked for your desk`}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm }}>
        {progress.current > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Flame size={11} color={colors.primary} strokeWidth={2} />
            <Text style={[typography.meta, { color: colors.primary }]}>
              {progress.current} DAY STREAK
            </Text>
          </View>
        ) : (
          <Text style={[typography.meta, { color: colors.mutedForeground }]}>START A STREAK</Text>
        )}
        <View style={{ flex: 1 }} />
        <Text style={[typography.meta, { color: colors.foreground }]}>
          {done ? "CHECK ANSWERS" : "OPEN THE BRIEF"}
        </Text>
        <ArrowRight size={12} color={colors.foreground} strokeWidth={2.2} />
      </View>
    </Pressable>
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
  const react = useReact();
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
      <BriefHero onOpen={() => router.push("/brief")} />
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

  let body: any = undefined;

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
        ListHeaderComponent={header || undefined}
        contentContainerStyle={{ paddingBottom: spacing.xxxl + insets.bottom, paddingTop: spacing.sm }}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching && !feed.isLoading}
            onRefresh={() => void feed.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
        renderItem={({ item, index }) => (
          <FeedRow
            item={item}
            canWrite={data.meta.canWrite}
            onReact={(kind) => {
              if (data.meta.canWrite) {
                react.mutate({ itemId: item.id, kind });
              }
            }}
            onOpen={() => openStory(item)}
          />
        )}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
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
          ) : undefined
        }
      />
    );
  } else {
    body = undefined as any;
  }

  return (
    <Screen>
      <Masthead
        onSearch={() => router.push("/search")}
        onAccount={() => router.push("/account")}
      />
      <SortTabs active={filters.sort} onChange={onSort} />
      {body}
    </Screen>
  );
}
