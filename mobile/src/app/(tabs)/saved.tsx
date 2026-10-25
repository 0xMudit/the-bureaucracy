import { useRouter } from "expo-router";
import { Bookmark, RotateCcw, Trash2, X } from "lucide-react-native";
import React, { useCallback } from "react";
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton, DoubleRule, EmptyState, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useRevision, type DueRevision } from "@/lib/revision";
import {
  expiresAtOf,
  isWireExpired,
  SAVED_KEEP_DAYS,
  useSaved,
  type SavedItem,
} from "@/lib/saved";
import { timeAgo, timeLeft } from "@/lib/time";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, priorityColor, radius, spacing, type as typography } from "@/theme/tokens";

function SavedRow({
  item,
  onOpen,
  onRemove,
}: {
  item: SavedItem;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const expired = isWireExpired(item);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.sm,
        paddingLeft: spacing.xs,
        paddingRight: spacing.xs,
        paddingVertical: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        backgroundColor: pressed ? colors.muted : "transparent",
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 }}>
          {item.topicLabel ? (
            <Text numberOfLines={1} style={[typography.kicker, { color: colors.primary, flexShrink: 1 }]}>
              {item.topicLabel}
            </Text>
          ) : null}
          <Text style={[typography.tag, { color: expired ? colors.warn : colors.mutedForeground, fontSize: 8 }]}>
            {expired ? "AT PUBLISHER" : timeLeft(expiresAtOf(item))}
          </Text>
        </View>

        <Text style={[typography.headline, { color: colors.foreground, fontSize: 18, lineHeight: 22 }]}>
          {item.title}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}>
          <Text style={[typography.meta, { color: colors.mutedForeground }]}>{item.source}</Text>
          <Text style={[typography.meta, { color: colors.border }]}>·</Text>
          <Text style={[typography.meta, { color: colors.mutedForeground }]}>
            saved {timeAgo(item.savedAt)}
          </Text>
          <Text style={[typography.meta, { color: colors.border }]}>·</Text>
          <Text style={[typography.meta, { color: priorityColor(item.priority, colors) }]}>
            {item.examScore} relevance
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onRemove}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Remove from the reading list"
        style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.5 : 1 })}
      >
        <X size={15} color={colors.mutedForeground} strokeWidth={1.9} />
      </Pressable>
    </Pressable>
  );
}

function RevisionCard({
  due,
  onOpen,
  onDone,
}: {
  due: DueRevision[];
  onOpen: (item: SavedItem) => void;
  onDone: (entry: DueRevision) => void;
}) {
  const { colors } = useTheme();
  if (!due.length) return null;

  return (
    <View
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.primary,
        backgroundColor: colors.accent,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderRadius: radius.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <RotateCcw size={13} color={colors.primary} strokeWidth={2} />
        <Text style={[typography.kicker, { color: colors.primary, flex: 1 }]}>REVISION DUE</Text>
        <Text style={[typography.meta, { color: colors.primary }]}>
          {due.length} {due.length === 1 ? "STORY" : "STORIES"}
        </Text>
      </View>
      <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 4 }]}>
        Day 1, 3, 7 and 30. One reread, then tick it off.
      </Text>

      {due.map((entry) => (
        <View
          key={entry.item.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            paddingTop: spacing.sm,
            marginTop: spacing.sm,
          }}
        >
          <Pressable
            onPress={() => onOpen(entry.item)}
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel={`Revisit ${entry.item.title}`}
          >
            <Text numberOfLines={2} style={[typography.ui, { color: colors.foreground }]}>
              {entry.item.title}
            </Text>
            <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: 2 }]}>
              DAY {entry.stage} · SAVED {entry.ageDays === 1 ? "YESTERDAY" : `${entry.ageDays} DAYS AGO`}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onDone(entry)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${entry.item.title} revised`}
            style={({ pressed }) => ({
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              paddingHorizontal: spacing.sm,
              paddingVertical: 5,
              borderRadius: radius.sm,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text style={[typography.tag, { color: colors.success }]}>DONE</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export default function SavedScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const saved = useSaved();
  const revision = useRevision();
  const { session } = useAuth();

  const open = useCallback(
    async (item: SavedItem) => {
      if (!isWireExpired(item)) {
        router.push({ pathname: "/item/[id]", params: { id: item.id } });
        return;
      }
      // The wire deletes its copy after 24 hours. A save is a bookmark to the
      // publisher, so send the reader there instead of to a 410.
      try {
        await Linking.openURL(item.url);
      } catch {
        Alert.alert("Could not open the story", "The publisher link may no longer be available.");
      }
    },
    [router],
  );

  const confirmClear = useCallback(() => {
    Alert.alert("Clear the reading list?", "Saved stories are not kept anywhere else.", [
      { text: "Keep", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => saved.clear() },
    ]);
  }, [saved]);

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
        }}
      >
        <View>
          <Text
            style={{
              fontFamily: fonts.monoMedium,
              fontSize: 12.5,
              letterSpacing: 2.6,
              color: colors.foreground,
            }}
          >
            THE BUREAUCRACY
          </Text>
          <Text
            style={[
              typography.display,
              { color: colors.foreground, fontSize: 27, lineHeight: 30, marginTop: spacing.xs },
            ]}
          >
            Reading list
          </Text>
        </View>

        {saved.count > 0 ? (
          <Pressable
            onPress={confirmClear}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingBottom: 4,
              opacity: pressed ? 0.55 : 1,
            })}
          >
            <Trash2 size={12} color={colors.mutedForeground} strokeWidth={1.9} />
            <Text style={[typography.meta, { color: colors.mutedForeground }]}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <DoubleRule />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
        }}
      >
        <Text style={[typography.meta, { color: colors.mutedForeground }]}>
          {saved.count} {saved.count === 1 ? "story" : "stories"} kept
        </Text>
        <Pressable
          onPress={() => router.push("/account")}
          hitSlop={6}
          style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
        >
          <Text style={[typography.meta, { color: session ? colors.success : colors.primary }]}>
            {session ? "Synced to your account" : "Sync across devices →"}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={saved.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl + insets.bottom }}
        ListHeaderComponent={
          <RevisionCard
            due={revision.due}
            onOpen={(item) => void open(item)}
            onDone={(entry) => revision.markRevised(entry.item.id, entry.stage)}
          />
        }
        renderItem={({ item }) => (
          <SavedRow item={item} onOpen={() => void open(item)} onRemove={() => saved.remove(item.id)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Bookmark size={26} color={colors.mutedForeground} strokeWidth={1.5} />}
            title="Nothing kept yet"
            body={`Tap the bookmark on any story to keep it here for ${SAVED_KEEP_DAYS} days. Long enough for a revision cycle, short enough to stay a reading list.`}
            action={
              <ActionButton
                label="Read the wire"
                variant="solid"
                onPress={() => router.push("/")}
              />
            }
          />
        }
        ListFooterComponent={
          saved.count > 0 ? (
            <Text
              style={[
                typography.tag,
                {
                  color: colors.mutedForeground,
                  fontSize: 9,
                  lineHeight: 15,
                  letterSpacing: 0.8,
                  paddingTop: spacing.xl,
                },
              ]}
            >
              Kept for {SAVED_KEEP_DAYS} days, then removed quietly. Stories older than the 24-hour
              wire open at the publisher.{" "}
              {session
                ? "Your account keeps a copy across devices."
                : "Sign in from the masthead to carry this list to another device."}
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}
