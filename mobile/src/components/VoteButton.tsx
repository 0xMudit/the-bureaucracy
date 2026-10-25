import { ChevronUp } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";

/**
 * The arrow is the product's signature interaction: a story rises because
 * readers pushed it. Matches the web's `VoteButton`, seed points included.
 */
export function VoteButton({
  points,
  seedPoints,
  voted,
  onVote,
  disabled = false,
  size = "sm",
}: {
  points: number;
  seedPoints: number;
  voted: boolean;
  onVote: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const { colors } = useTheme();
  const total = points + seedPoints;
  const dimension = size === "sm" ? 40 : 48;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={voted ? `Remove upvote, ${total} points` : `Upvote, ${total} points`}
      accessibilityState={{ selected: voted, disabled }}
      disabled={disabled}
      onPress={onVote}
      hitSlop={6}
      style={({ pressed }) => ({
        width: dimension,
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 1,
        opacity: disabled ? 0.5 : pressed ? 0.6 : 1,
      })}
    >
      <ChevronUp
        size={size === "sm" ? 20 : 24}
        strokeWidth={2.4}
        color={voted ? colors.primary : colors.mutedForeground}
      />
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: size === "sm" ? 11 : 13,
          color: voted ? colors.primary : colors.mutedForeground,
          fontVariant: ["tabular-nums"],
          marginTop: 1,
        }}
      >
        {total}
      </Text>
    </Pressable>
  );
}
