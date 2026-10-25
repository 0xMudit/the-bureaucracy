import * as Haptics from "expo-haptics";
import { Bookmark } from "lucide-react-native";
import React from "react";
import { Pressable } from "react-native";
import type { FeedItem } from "@/api/types";
import { useSaved } from "@/lib/saved";
import { useTheme } from "@/theme/ThemeProvider";

export function SaveButton({ item, size = 16 }: { item: FeedItem; size?: number }) {
  const { colors } = useTheme();
  const saved = useSaved();
  const active = saved.isSaved(item.id);

  const onPress = () => {
    const nowSaved = saved.toggle(item);
    Haptics.selectionAsync().catch(() => {});
    void nowSaved;
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? "Remove from reading list" : "Save to reading list"}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({
        padding: 6,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Bookmark
        size={size}
        strokeWidth={1.8}
        color={active ? colors.primary : colors.mutedForeground}
        fill={active ? colors.primary : "transparent"}
      />
    </Pressable>
  );
}
