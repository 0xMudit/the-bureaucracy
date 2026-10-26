import { MessageSquare } from "lucide-react-native";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { FeedItem } from "@/api/types";
import { timeAgo } from "@/lib/time";
import { ReactionBar } from "./ReactionBar";
import { SaveButton } from "./SaveButton";
import { useTheme } from "@/theme/ThemeProvider";
import { priorityColor, spacing, type } from "@/theme/tokens";

function Dot({ color }: { color: string }) {
  return <Text style={{ color, fontSize: 10 }}>·</Text>;
}

/**
 * One row of the wire. The hierarchy is deliberately editorial: rank and theme
 * above, headline in the serif, then the provenance line in mono.
 */
export function FeedRow({
  item,
  onReact,
  onOpen,
  canWrite,
}: {
  item: FeedItem;
  onReact: (kind: "like" | "dislike") => void;
  onOpen: () => void;
  canWrite: boolean;
}) {
  const { colors } = useTheme();
  const official = item.sourceTier === "official";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={onOpen}
      android_ripple={{ color: colors.accent }}
      style={({ pressed }) => ({
        flexDirection: "row",
        paddingRight: spacing.md,
        paddingVertical: spacing.lg,
        paddingLeft: spacing.sm,
        marginHorizontal: spacing.sm,
        marginVertical: spacing.xs,
        borderRadius: 12,
        backgroundColor: pressed ? colors.accent : colors.card,
        borderWidth: 1,
        borderColor: pressed ? colors.primary : colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: pressed ? 2 : 4 },
        shadowOpacity: pressed ? 0.25 : 0.4,
        shadowRadius: pressed ? 6 : 10,
        elevation: pressed ? 3 : 6,
      })}
    >
      <ReactionBar
        likes={item.likeCount ?? 0}
        dislikes={item.dislikeCount ?? 0}
        reaction={item.reaction ?? null}
        onReact={onReact}
        disabled={!canWrite}
      />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
          {item.position ? (
            <Text
              style={{
                fontFamily: type.meta.fontFamily,
                fontSize: 9,
                color: colors.mutedForeground,
                opacity: 0.7,
                fontVariant: ["tabular-nums"],
              }}
            >
              {String(item.position).padStart(2, "0")}
            </Text>
          ) : null}
          {item.kicker ? (
            <Text numberOfLines={1} style={[type.kicker, { color: colors.primary, flexShrink: 1 }]}>
              {item.kicker}
            </Text>
          ) : null}
          {item.priority === "high" ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                paddingHorizontal: 5,
                paddingVertical: 2,
                backgroundColor: colors.accent,
                borderRadius: 2,
              }}
            >
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.primary }} />
              <Text style={[type.tag, { color: colors.primary, fontSize: 8 }]}>Priority</Text>
            </View>
          ) : null}
        </View>

        <Text style={[type.headline, { color: colors.foreground, fontSize: 22, lineHeight: 26 }]} numberOfLines={3}>{item.title}</Text>

        {item.summary ? (
          <Text
            numberOfLines={2}
            style={[type.summary, { color: colors.mutedForeground, marginTop: 6 }]}
          >
            {item.summary}
          </Text>
        ) : null}

        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{
              width: "100%",
              height: 132,
              marginTop: 8,
              borderRadius: 8,
              backgroundColor: colors.muted,
            }}
            resizeMode="cover"
            accessibilityLabel=""
          />
        ) : null}

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 5,
            marginTop: 7,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {official ? (
              <View
                style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary }}
              />
            ) : null}
            <Text style={[type.meta, { color: official ? colors.primary : colors.mutedForeground }]}>
              {item.source}
            </Text>
          </View>

          <Dot color={colors.border} />
          <Text style={[type.meta, { color: colors.mutedForeground }]}>
            {timeAgo(item.publishedAt)}
          </Text>

          <Dot color={colors.border} />
          <Text style={[type.meta, { color: colors.mutedForeground }]}>
            {item.topic?.paperLabel ?? "Current affairs"}
          </Text>

          {item.optional ? (
            <>
              <Dot color={colors.border} />
              <Text style={[type.meta, { color: colors.primary }]}>{item.optional.short}</Text>
            </>
          ) : null}

          <Dot color={colors.border} />
          <Text style={[type.meta, { color: priorityColor(item.priority, colors) }]}>
            {item.examScore} relevance
          </Text>

          <Dot color={colors.border} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <MessageSquare size={11} color={colors.mutedForeground} strokeWidth={1.8} />
            <Text style={[type.meta, { color: colors.mutedForeground }]}>
              {item.commentCount === 0 ? "Comment" : item.commentCount}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ paddingTop: 2, marginLeft: 2 }}>
        <SaveButton item={item} />
      </View>
    </Pressable>
  );
}
