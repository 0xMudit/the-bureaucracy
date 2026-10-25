import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Gavel,
  Layers,
  MessageSquare,
  Newspaper,
  Share2,
} from "lucide-react-native";
import React, { useCallback, useEffect } from "react";
import {
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { useStory, useTaxonomy, useVote } from "@/api/hooks";
import { CommentThread } from "@/components/CommentThread";
import { SaveButton } from "@/components/SaveButton";
import { VoteButton } from "@/components/VoteButton";
import {
  ActionButton,
  EmptyState,
  Hooks,
  Kicker,
  Panel,
  Screen,
  TagList,
  WireSkeleton,
} from "@/components/ui";
import { setFilters } from "@/lib/filters";
import { useProgress } from "@/lib/progress";
import { formatDate, timeAgo, timeLeft } from "@/lib/time";
import { useTheme } from "@/theme/ThemeProvider";
import { priorityColor, spacing, type as typography } from "@/theme/tokens";

const FALLBACK_HOOKS = [
  "What is the factual update, and which institution owns it?",
  "Which part of the syllabus does it illuminate?",
  "What is the counter-argument or implementation risk?",
];

const PRIORITY_LABEL: Record<string, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

export default function StoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const story = useStory(id);
  const taxonomy = useTaxonomy();
  const vote = useVote();
  const { readIds, markRead, toggleRead } = useProgress();

  const back = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const openWireWith = useCallback(
    (patch: Parameters<typeof setFilters>[0]) => {
      setFilters({ topic: "all", optional: "all", paper: "all", q: "", ...patch });
      if (router.canGoBack()) router.back();
      else router.replace("/");
    },
    [router],
  );

  const data = story.data;
  const item = data?.item;
  const error = story.error;
  const read = item ? readIds.has(item.id) : false;

  // Opening a story is the read signal. The toggle in the header can undo it,
  // and the same mark is what completes the daily brief.
  useEffect(() => {
    if (!item) return;
    markRead(item.id, item.primaryTopic);
  }, [item, markRead]);

  const share = useCallback(async () => {
    if (!item) return;
    const url = data?.webUrl ?? item.url;
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n\n${url}\n\nvia The Bureaucracy`,
        url,
      });
    } catch {
      // The share sheet is a system surface; a dismissal is not an error.
    }
  }, [item, data?.webUrl]);

  let body: React.ReactNode;

  if (!data && story.isLoading) {
    body = <WireSkeleton rows={4} />;
  } else if (!data && error) {
    const expired = error instanceof ApiError && (error.expired || error.status === 404);
    body = (
      <EmptyState
        icon={<Newspaper size={26} color={colors.mutedForeground} strokeWidth={1.5} />}
        title={expired ? "It has left the wire" : "The story could not be read"}
        body={
          expired
            ? "The wire keeps only the last 24 hours. This story was deleted with the last turnover."
            : error instanceof ApiError
              ? error.message
              : "The server could not be reached."
        }
        action={<ActionButton label="Back to the wire" onPress={back} variant="outline" />}
      />
    );
  } else if (data && item) {
    const topic = taxonomy.data?.topics.find((entry) => entry.id === item.primaryTopic) ?? null;
    const optional =
      taxonomy.data?.optionals.find((entry) => entry.id === item.primaryOptional) ?? null;
    const paper = item.topic?.paperLabel ?? "Current affairs";

    body = (
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={story.isRefetching && !story.isLoading}
            onRefresh={() => void story.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <VoteButton
              points={item.points}
              seedPoints={item.seedPoints}
              voted={data.voted}
              onVote={() => {
                if (data.canWrite) vote.mutate(item.id);
              }}
              disabled={!data.canWrite}
              size="md"
            />

            <View style={{ flex: 1, minWidth: 0 }}>
              {item.kicker ? <Kicker>{item.kicker}</Kicker> : null}
              <Text
                style={[
                  typography.display,
                  { color: colors.foreground, fontSize: 27, lineHeight: 30, marginTop: 4 },
                ]}
              >
                {item.title}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 4,
                  marginTop: spacing.sm,
                }}
              >
                <Pressable
                  onPress={() => void Linking.openURL(item.url).catch(() => {})}
                  hitSlop={6}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  {item.sourceTier === "official" ? (
                    <View
                      style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary }}
                    />
                  ) : null}
                  <Text style={[typography.meta, { color: colors.mutedForeground }]}>
                    {item.source}
                  </Text>
                  <ExternalLink size={9} color={colors.mutedForeground} strokeWidth={2} />
                </Pressable>
                <Text style={[typography.meta, { color: colors.border }]}>·</Text>
                <Text style={[typography.meta, { color: colors.mutedForeground }]}>
                  {timeAgo(item.publishedAt)}
                </Text>
                <Text style={[typography.meta, { color: colors.border }]}>·</Text>
                <Text style={[typography.meta, { color: colors.mutedForeground }]}>
                  {formatDate(item.publishedAt)}
                </Text>
                <Text style={[typography.meta, { color: colors.border }]}>·</Text>
                <Text style={[typography.meta, { color: priorityColor(item.priority, colors) }]}>
                  {PRIORITY_LABEL[item.priority] ?? item.priority}
                </Text>
                <Text style={[typography.meta, { color: colors.border }]}>·</Text>
                <Text style={[typography.meta, { color: colors.mutedForeground }]}>
                  {item.examScore}/100 relevance
                </Text>
              </View>
            </View>

            <View style={{ alignItems: "center", gap: 12, paddingTop: 2 }}>
              <SaveButton item={item} size={18} />
              <Pressable
                onPress={() => toggleRead(item.id, item.primaryTopic)}
                hitSlop={10}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: read }}
                accessibilityLabel={read ? "Mark as unread" : "Mark as read"}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                {read ? (
                  <CheckCircle2 size={18} color={colors.success} strokeWidth={2} />
                ) : (
                  <Circle size={18} color={colors.mutedForeground} strokeWidth={1.7} />
                )}
              </Pressable>
              <Pressable
                onPress={() => void share()}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Share this story"
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Share2 size={17} color={colors.mutedForeground} strokeWidth={1.9} />
              </Pressable>
            </View>
          </View>

          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={{
                width: "100%",
                aspectRatio: 16 / 9,
                marginTop: spacing.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                backgroundColor: colors.muted,
              }}
              resizeMode="cover"
              accessibilityLabel={item.title}
            />
          ) : null}

          <View
            style={{
              marginTop: spacing.lg,
              borderLeftWidth: 2,
              borderLeftColor: colors.border,
              paddingLeft: spacing.md,
            }}
          >
            {item.summaryBullets?.length ? (
              <View style={{ gap: 7 }}>
                <Text style={[typography.tag, { color: colors.primary, fontSize: 8.5 }]}>
                  The story in five lines
                </Text>
                {item.summaryBullets.map((bullet, index) => (
                  <View key={`${index}-${bullet.slice(0, 16)}`} style={{ flexDirection: "row", gap: 7 }}>
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        marginTop: 8,
                        backgroundColor: colors.primary,
                      }}
                    />
                    <Text style={[typography.body, { color: colors.foreground, flex: 1 }]}>
                      {bullet.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
                        part.startsWith("**") && part.endsWith("**") ? (
                          <Text key={partIndex} style={{ fontWeight: "700" }}>
                            {part.slice(2, -2)}
                          </Text>
                        ) : (
                          <Text key={partIndex}>{part}</Text>
                        ),
                      )}
                    </Text>
                  </View>
                ))}
                <Text style={[typography.tag, { color: colors.mutedForeground, fontSize: 8 }]}>
                  {item.imageAttribution || item.source}
                  {item.imageUrl ? ` · image: ${item.imageSource ?? "publisher"}` : ""}
                </Text>
              </View>
            ) : (
              <Text style={[typography.body, { color: colors.foreground }]}>
                {item.summary ||
                  "The publisher did not include an excerpt in its feed. Open the original for the full report."}
              </Text>
            )}
            <View style={{ marginTop: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <ActionButton
                label={`Read at ${item.source}`}
                variant="outline"
                onPress={() => void Linking.openURL(item.url).catch(() => {})}
                icon={<ArrowUpRight size={13} color={colors.foreground} strokeWidth={2} />}
              />
            </View>
            <Text
              style={[
                typography.tag,
                { color: colors.mutedForeground, fontSize: 8.5, marginTop: spacing.sm },
              ]}
            >
              Headline and excerpt remain the publisher&apos;s
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md }}>
          <Panel
            title="Why it matters"
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}>
                <Gavel size={12} color={colors.primary} strokeWidth={1.9} />
                <Text
                  numberOfLines={1}
                  style={[typography.tag, { color: colors.mutedForeground, fontSize: 8 }]}
                >
                  {paper}
                  {topic ? ` · ${topic.label}` : ""}
                </Text>
              </View>
            }
          >
            <Text style={[typography.summary, { color: colors.foreground, lineHeight: 21 }]}>
              {item.examAngle ??
                topic?.why ??
                "A general current-affairs item. Place it against a syllabus theme before you commit it to memory."}
            </Text>

            {item.gsPaper ? (
              <Text style={[typography.tag, { color: colors.primary, fontSize: 8.5, marginTop: spacing.sm }]}>
                {item.gsPaper}
              </Text>
            ) : null}

            {item.prelimsFact ? (
              <View
                style={{
                  marginTop: spacing.md,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  padding: spacing.sm,
                }}
              >
                <Text style={[typography.tag, { color: colors.primary, fontSize: 8 }]}>Likely Prelims fact</Text>
                <Text style={[typography.summary, { color: colors.foreground, marginTop: 3, lineHeight: 19 }]}>
                  {item.prelimsFact}
                </Text>
              </View>
            ) : null}

            {item.mainsAngle ? (
              <View
                style={{
                  marginTop: spacing.sm,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  padding: spacing.sm,
                }}
              >
                <Text style={[typography.tag, { color: colors.primary, fontSize: 8 }]}>Mains angle</Text>
                <Text style={[typography.summary, { color: colors.foreground, marginTop: 3, lineHeight: 19 }]}>
                  {item.mainsAngle}
                </Text>
              </View>
            ) : null}

            {item.syllabusHint ? (
              <Text
                style={[
                  typography.summary,
                  {
                    color: colors.mutedForeground,
                    marginTop: spacing.sm,
                    borderLeftWidth: 2,
                    borderLeftColor: colors.primary,
                    paddingLeft: spacing.sm,
                    lineHeight: 19,
                  },
                ]}
              >
                {item.syllabusHint}
              </Text>
            ) : null}

            <Text
              style={[
                typography.tag,
                {
                  color: colors.mutedForeground,
                  marginTop: spacing.md,
                  marginBottom: spacing.sm,
                  letterSpacing: 1,
                },
              ]}
            >
              Answer hooks
            </Text>
            <Hooks items={topic?.hooks?.length ? topic.hooks : FALLBACK_HOOKS} />

            {item.keywords.length ? (
              <View style={{ marginTop: spacing.md }}>
                <TagList labels={item.keywords} />
              </View>
            ) : null}
          </Panel>

          <Panel
            title="On the record"
            right={<Layers size={12} color={colors.mutedForeground} strokeWidth={1.9} />}
          >
            <View style={{ gap: spacing.sm }}>
              <RecordRow label="Source" value={item.source} />
              <RecordRow label="Tier" value={item.sourceTier} />
              <RecordRow label="Published" value={formatDate(item.publishedAt)} />
              <RecordRow
                label="Read"
                value={read ? "Marked today" : "Not yet"}
                icon={
                  read ? (
                    <CheckCircle2 size={11} color={colors.success} strokeWidth={2} />
                  ) : (
                    <Circle size={11} color={colors.mutedForeground} strokeWidth={2} />
                  )
                }
              />
              <RecordRow
                label="Expires"
                value={timeLeft(data.expiresAt)}
                icon={<Clock size={11} color={colors.mutedForeground} strokeWidth={2} />}
              />
            </View>
          </Panel>

          {optional ? (
            <Panel
              title="Optional fit"
              right={
                <Pressable
                  onPress={() => openWireWith({ optional: optional.id })}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={[typography.tag, { color: colors.primary, fontSize: 8.5 }]}>
                    Open feed
                  </Text>
                </Pressable>
              }
            >
              <Text style={[typography.ui, { color: colors.foreground }]}>{optional.label}</Text>
              <Text
                style={[
                  typography.summary,
                  { color: colors.mutedForeground, marginTop: 4, lineHeight: 19 },
                ]}
              >
                {optional.why}
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <TagList
                  labels={item.optionals
                    .map(
                      (entry) =>
                        taxonomy.data?.optionals.find((option) => option.id === entry)?.short ??
                        entry,
                    )
                    .slice(0, 6)}
                  tone="primary"
                />
              </View>
            </Panel>
          ) : null}

          <View style={{ marginTop: spacing.sm }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                borderBottomWidth: 2,
                borderBottomColor: colors.foreground,
                paddingBottom: spacing.xs,
              }}
            >
              <Text
                style={[typography.display, { color: colors.foreground, fontSize: 22, lineHeight: 24 }]}
              >
                Discussion
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MessageSquare size={11} color={colors.mutedForeground} strokeWidth={1.9} />
                <Text style={[typography.meta, { color: colors.mutedForeground }]}>
                  {data.commentCount} {data.commentCount === 1 ? "comment" : "comments"}
                </Text>
              </View>
            </View>

            <View
              style={{
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                backgroundColor: colors.card,
                padding: spacing.md,
                marginTop: spacing.md,
              }}
            >
              <Text style={[typography.summary, { color: colors.mutedForeground, lineHeight: 19 }]}>
                {data.discussion.note}
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <ActionButton
                  label="Comment on the web"
                  variant="outline"
                  onPress={() => void Linking.openURL(story.data?.webUrl ?? item.url).catch(() => {})}
                  icon={<ExternalLink size={12} color={colors.foreground} strokeWidth={2} />}
                />
              </View>
            </View>

            <View style={{ marginTop: spacing.md }}>
              {data.comments.length ? (
                <CommentThread nodes={data.comments} />
              ) : (
                <Text
                  style={[
                    typography.summary,
                    { color: colors.mutedForeground, paddingVertical: spacing.md },
                  ]}
                >
                  No comments yet. The first argument sets the frame.
                </Text>
              )}
            </View>
          </View>

          {data.related.length ? (
            <Panel title="Related on the wire">
              <View>
                {data.related.map((related, index) => (
                  <Pressable
                    key={related.id}
                    onPress={() =>
                      router.push({ pathname: "/item/[id]", params: { id: related.id } })
                    }
                    style={({ pressed }) => ({
                      paddingVertical: spacing.sm,
                      borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                      borderTopColor: colors.border,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text style={[typography.ui, { color: colors.foreground }]}>{related.title}</Text>
                    <Text
                      style={[
                        typography.tag,
                        { color: colors.mutedForeground, fontSize: 8.5, marginTop: 3 },
                      ]}
                    >
                      {related.source} · {timeAgo(related.publishedAt)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Panel>
          ) : null}

          <Pressable
            onPress={() => void Linking.openURL(story.data?.webUrl ?? item.url).catch(() => {})}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderWidth: StyleSheet.hairlineWidth,
              borderStyle: "dashed",
              borderColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[typography.tag, { color: colors.mutedForeground, fontSize: 8.5 }]}>
              Open this story on the web
            </Text>
            <ArrowUpRight size={12} color={colors.primary} strokeWidth={2} />
          </Pressable>
        </View>
      </ScrollView>
    );
  } else {
    body = null;
  }

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
      >
        <Pressable
          onPress={back}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back to the wire"
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <ArrowLeft size={14} color={colors.mutedForeground} strokeWidth={2.2} />
          <Text style={[typography.meta, { color: colors.mutedForeground }]}>All stories</Text>
        </Pressable>

        <Text style={[typography.meta, { color: colors.mutedForeground }]}>
          {item?.topic ? `${item.topic.paperLabel} · ${item.topic.label}` : "Current affairs"}
        </Text>
      </View>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
      {body}
    </Screen>
  );
}

function RecordRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={[typography.tag, { color: colors.mutedForeground, fontSize: 8.5 }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}>
        {icon ?? null}
        <Text
          numberOfLines={1}
          style={[typography.ui, { color: colors.foreground, fontSize: 12.5, textTransform: "none" }]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
