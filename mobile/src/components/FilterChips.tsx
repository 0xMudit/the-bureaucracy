import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing, type as typography } from "@/theme/tokens";

export interface ChipOption {
  id: string;
  label: string;
  count?: number;
}

/**
 * A single horizontal rail of filters. Two of these make the wire's scope bar:
 * one for syllabus themes, one for the six optional lenses.
 */
export function ChipRail({
  options,
  active,
  onSelect,
  tone = "neutral",
  allLabel,
}: {
  options: ChipOption[];
  active: string;
  onSelect: (id: string) => void;
  tone?: "neutral" | "primary";
  allLabel?: string;
}) {
  const { colors } = useTheme();

  const entries: ChipOption[] = allLabel ? [{ id: "all", label: allLabel }, ...options] : options;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 6, paddingVertical: 6 }}
    >
      {entries.map((option) => {
        const selected = option.id === active;
        const accent = tone === "primary" ? colors.primary : colors.foreground;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(option.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: radius.sm,
              borderWidth: 0.5,
              borderColor: selected ? accent : colors.border,
              backgroundColor: selected
                ? tone === "primary"
                  ? colors.accent
                  : colors.secondary
                : "transparent",
            }}
          >
            <Text
              style={[
                typography.tag,
                {
                  color: selected ? accent : colors.mutedForeground,
                  fontSize: 9,
                  letterSpacing: 0.5,
                },
              ]}
            >
              {option.label}
            </Text>
            {typeof option.count === "number" ? (
              <Text
                style={[
                  typography.tag,
                  {
                    color: selected ? accent : colors.mutedForeground,
                    fontSize: 9,
                    opacity: 0.65,
                    fontVariant: ["tabular-nums"],
                  },
                ]}
              >
                {option.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** The active scope, printed above the wire so a filter is never invisible. */
export function ScopeLine({
  parts,
  trailing,
  onClear,
}: {
  parts: string[];
  trailing?: string;
  onClear?: () => void;
}) {
  const { colors } = useTheme();
  const text = parts.filter(Boolean).join(" · ");

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: 2,
      }}
    >
      <Text numberOfLines={1} style={[typography.meta, { color: colors.mutedForeground, flex: 1 }]}>
        {text}
        {trailing ? <Text style={{ color: colors.mutedForeground, opacity: 0.75 }}>{` · ${trailing}`}</Text> : null}
      </Text>
      {onClear ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={[typography.meta, { color: colors.primary }]}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
