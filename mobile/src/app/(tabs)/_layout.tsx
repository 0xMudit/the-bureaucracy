import { Tabs } from "expo-router";
import { Bookmark, Library, Newspaper } from "lucide-react-native";
import React from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";

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
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.mono,
          fontSize: 9,
          letterSpacing: 1,
          textTransform: "uppercase",
        },
        tabBarItemStyle: { paddingBottom: 2 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Wire",
          tabBarIcon: ({ color, focused }) => (
            <Newspaper size={19} strokeWidth={focused ? 2.1 : 1.7} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, focused }) => (
            <Bookmark size={19} strokeWidth={focused ? 2.1 : 1.7} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="syllabus"
        options={{
          title: "Syllabus",
          tabBarIcon: ({ color, focused }) => (
            <Library size={19} strokeWidth={focused ? 2.1 : 1.7} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
