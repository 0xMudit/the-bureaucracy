import { Tabs } from "expo-router";
import { Bookmark, Library, Newspaper } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, spacing } from "@/theme/tokens";

/**
 * Three permanent destinations. There is no settings tab: the theme switch
 * lives in the masthead, where a reader actually reaches for it.
 */
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 20 : 10,
          height: Platform.OS === "ios" ? 84 : 68,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.mono,
          fontSize: 9,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginTop: 2,
        },
        tabBarItemStyle: { paddingBottom: 4 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "WIRE",
          tabBarIcon: ({ color, focused }) => (
            <Newspaper size={22} strokeWidth={focused ? 2.2 : 1.8} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "SAVED",
          tabBarIcon: ({ color, focused }) => (
            <Bookmark size={22} strokeWidth={focused ? 2.2 : 1.8} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="syllabus"
        options={{
          title: "SYLLABUS",
          tabBarIcon: ({ color, focused }) => (
            <Library size={22} strokeWidth={focused ? 2.2 : 1.8} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
