import { useRouter } from "expo-router";
import { Search, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTaxonomy } from "@/api/hooks";
import { Screen } from "@/components/ui";
import { useFeedFilters } from "@/lib/filters";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, type as typography } from "@/theme/tokens";

/**
 * Search is a single field over the same 24 hours: the query is handed to the
 * shared filter store and the wire re-ranks behind the sheet.
 */
export default function SearchScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { filters, setFilters } = useFeedFilters();
  const taxonomy = useTaxonomy();
  const [text, setText] = useState(filters.q);

  const cues = useMemo(() => {
    const seen = new Set<string>();
    for (const topic of taxonomy.data?.topics ?? []) {
      for (const cue of topic.cues) {
        const key = cue.toLowerCase();
        if (key.length > 3 && !seen.has(key)) seen.add(key);
      }
    }
    return [...seen].slice(0, 12);
  }, [taxonomy.data]);

  const apply = useCallback(
    (value: string) => {
      Keyboard.dismiss();
      setFilters({ q: value.trim().slice(0, 80) });
      if (router.canGoBack()) router.back();
      else router.replace("/");
    },
    [router, setFilters],
  );

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.input,
            backgroundColor: colors.card,
            paddingHorizontal: spacing.sm,
            paddingVertical: 9,
          }}
        >
          <Search size={14} color={colors.mutedForeground} strokeWidth={2} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Search the last 24 hours"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            onSubmitEditing={() => apply(text)}
            style={{
              flex: 1,
              color: colors.foreground,
              fontSize: 14,
              padding: 0,
            }}
          />
          {text.length > 0 ? (
            <Pressable onPress={() => setText("")} hitSlop={8}>
              <X size={13} color={colors.mutedForeground} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/");
          }}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
        >
          <Text style={[typography.meta, { color: colors.primary }]}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl + insets.bottom }}
      >
        <Text
          style={[
            typography.tag,
            { color: colors.mutedForeground, fontSize: 9, letterSpacing: 1.2, marginBottom: spacing.sm },
          ]}
        >
          Try a cue
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {cues.map((cue) => (
            <Pressable
              key={cue}
              onPress={() => apply(cue)}
              style={({ pressed }) => ({
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                paddingHorizontal: 8,
                paddingVertical: 5,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={[typography.tag, { color: colors.mutedForeground, fontSize: 9 }]}>
                {cue}
              </Text>
            </Pressable>
          ))}
        </View>

        {filters.q ? (
          <Pressable
            onPress={() => {
              setText("");
              apply("");
            }}
            hitSlop={8}
            style={{ marginTop: spacing.lg }}
          >
            <Text style={[typography.meta, { color: colors.primary }]}>
              Clear “{filters.q}”
            </Text>
          </Pressable>
        ) : null}

        <Text
          style={[
            typography.summary,
            { color: colors.mutedForeground, marginTop: spacing.xl, lineHeight: 19 },
          ]}
        >
          Search reads titles, summaries, sources and the classifier&apos;s keywords. It never
          reaches beyond the 24-hour wire — there is no archive to dig through.
        </Text>
      </ScrollView>
    </Screen>
  );
}
