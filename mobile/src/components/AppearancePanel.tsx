import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Panel } from "@/components/ui";
import { useTheme, type ThemeMode } from "@/theme/ThemeProvider";
import { spacing, type as typography } from "@/theme/tokens";

export function AppearancePanel() {
  const { colors, mode, setMode } = useTheme();
  const options: { id: ThemeMode; label: string }[] = [
    { id: "system", label: "System" },
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ];

  return (
    <Panel title="Appearance">
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: spacing.xs }}>
        {options.map((option) => {
          const active = option.id === mode;
          return (
            <Pressable
              key={option.id}
              onPress={() => setMode(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                paddingVertical: 9,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.accent : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={[
                  typography.tag,
                  { color: active ? colors.foreground : colors.mutedForeground, fontSize: 9 },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[typography.tag, { color: colors.mutedForeground, fontSize: 8.5, marginTop: spacing.sm }]}>
        Choose light, dark, or follow your device.
      </Text>
    </Panel>
  );
}