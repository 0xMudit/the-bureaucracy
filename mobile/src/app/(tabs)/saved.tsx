import { useRouter } from "expo-router";
import { Bookmark, Trash2, X } from "lucide-react-native";
import React, { useCallback } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton, DoubleRule, EmptyState, Screen } from "@/components/ui";
import { useSaved, type SavedItem } from "@/lib/saved";
import { timeAgo, timeLeft } from "@/lib/time";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, priorityColor, spacing, type as typography } from "@/theme/tokens";

function SavedRow({ item, onOpen, onRemove }: { item: SavedItem; onOpen: () => void; onRemove: () => void }) {
  const { colors } = useTheme();

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
          <Text style={[typography.tag, { color: colors.mutedForeground, fontSize: 8 }]}>
            {timeLeft(item.expiresAt)}
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

export default function SavedScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const saved = useSaved();

  const open = useCallback(
    (item: SavedItem) => router.push({ pathname: "/item/[id]", params: { id: item.id } }),
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
        <Text style={[typography.meta, { color: colors.mutedForeground }]}>
          Held on this device
        </Text>
      </View>

      <FlatList
        data={saved.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl + insets.bottom }}
        renderItem={({ item }) => (
          <SavedRow item={item} onOpen={() => open(item)} onRemove={() => saved.remove(item.id)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Bookmark size={26} color={colors.mutedForeground} strokeWidth={1.5} />}
            title="Nothing kept yet"
            body="Tap the bookmark on any story to keep it here. Saved stories expire with the wire — after 24 hours they are gone, like everything else."
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
              This list never leaves the phone. A story that drops out of the 24-hour window is
              removed from it automatically.
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}
