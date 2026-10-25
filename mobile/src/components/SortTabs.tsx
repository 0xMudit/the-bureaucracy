import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { SortKey } from "@/api/types";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, type as typography } from "@/theme/tokens";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "top", label: "TOP" },
  { id: "new", label: "NEW" },
  { id: "best", label: "BEST" },
  { id: "discussed", label: "TRENDING" },
];

/** Four ways to read the same 24 hours, matching the web's feed tabs. */
export function SortTabs({
  active,
  onChange,
}: {
  active: SortKey;
  onChange: (sort: SortKey) => void;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}
      style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}
    >
      {SORTS.map((sort) => {
        const selected = sort.id === active;
        return (
          <Pressable
            key={sort.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(sort.id)}
            style={{ paddingTop: 10, paddingBottom: 9 }}
          >
            <Text
              style={[
                typography.meta,
                {
                  color: selected ? colors.primary : colors.mutedForeground,
                  letterSpacing: 1.2,
                },
              ]}
            >
              {sort.label}
            </Text>
            <View
              style={{
                height: selected ? 2 : 0,
                backgroundColor: colors.primary,
                marginTop: 6,
                borderRadius: 1,
              }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
