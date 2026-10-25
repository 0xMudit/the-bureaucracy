import { ThumbsDown, ThumbsUp } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";

/**
 * Like / dislike, mutually exclusive, one reaction per reader. A second tap on
 * the active reaction removes it. This replaces the old upvote arrow on both
 * the web and the native client.
 */
export function ReactionBar({
  likes,
  dislikes,
  reaction,
  onReact,
  disabled = false,
  size = "sm",
}: {
  likes: number;
  dislikes: number;
  reaction: "like" | "dislike" | null;
  onReact: (kind: "like" | "dislike") => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const { colors } = useTheme();
  const dimension = size === "sm" ? 40 : 48;
  const icon = size === "sm" ? 17 : 20;

  const button = (kind: "like" | "dislike") => {
    const active = reaction === kind;
    const Icon = kind === "like" ? ThumbsUp : ThumbsDown;
    const count = kind === "like" ? likes : dislikes;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${kind === "like" ? "Like" : "Dislike"}, ${count}`}
        accessibilityState={{ selected: active, disabled }}
        disabled={disabled}
        onPress={() => onReact(kind)}
        hitSlop={6}
        style={({ pressed }) => ({
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 2,
          opacity: disabled ? 0.5 : pressed ? 0.6 : 1,
        })}
      >
        <Icon
          size={icon}
          strokeWidth={active ? 2.5 : 2}
          color={active ? colors.primary : colors.mutedForeground}
        />
        <Text
          style={{
            fontFamily: fonts.mono,
            fontSize: kind === "like" ? 10.5 : 9.5,
            color: active ? colors.primary : colors.mutedForeground,
            fontVariant: ["tabular-nums"],
            marginTop: 1,
          }}
        >
          {count}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{ width: dimension, alignItems: "center", gap: 7, paddingTop: 1 }}
      accessibilityLabel="Story reactions"
    >
      {button("like")}
      {button("dislike")}
    </View>
  );
}
