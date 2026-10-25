import { Moon, Search, Sun } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, spacing, type as typography } from "@/theme/tokens";
import { dateline } from "@/lib/time";
import { DoubleRule } from "./ui";

function PulseDot() {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ width: 8, height: 8, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.primary,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
        }}
      />
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary }} />
    </View>
  );
}

/**
 * The wordmark, the dateline and the two controls that matter. Deliberately
 * quiet: the masthead is a rule on a page, not a toolbar.
 */
export function Masthead({ onSearch }: { onSearch: () => void }) {
  const { colors, scheme, toggle } = useTheme();

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: 6,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
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
            numberOfLines={1}
            style={{
              fontFamily: fonts.displayItalic,
              fontSize: 13,
              color: colors.mutedForeground,
              marginTop: 1,
            }}
          >
            Civil-services intelligence, ranked.
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginLeft: spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search the wire"
            onPress={onSearch}
            hitSlop={8}
            style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.5 : 1 })}
          >
            <Search size={18} strokeWidth={1.9} color={colors.foreground} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={scheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onPress={toggle}
            hitSlop={8}
            style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.5 : 1 })}
          >
            {scheme === "dark" ? (
              <Sun size={18} strokeWidth={1.9} color={colors.foreground} />
            ) : (
              <Moon size={18} strokeWidth={1.9} color={colors.foreground} />
            )}
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <DoubleRule />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingTop: 6,
          paddingBottom: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <PulseDot />
          <Text style={[typography.meta, { color: colors.primary }]}>Live · 24-hour wire</Text>
        </View>
        <Text style={[typography.meta, { color: colors.mutedForeground }]}>{dateline()}</Text>
      </View>
    </View>
  );
}
