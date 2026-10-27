import { useRouter } from "expo-router";
import { Check, ChevronDown, Lock, Sparkles } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PremiumTrap, PremiumView } from "@/api/types";
import { ActionButton } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, type as typography } from "@/theme/tokens";

/**
 * The paid companion to a story.
 *
 * The server decides `locked` and never sends the pack to a free account, so
 * this component renders what it is given rather than hiding text. Traps reveal
 * on tap; there is no reason to spoil all three at once.
 */
export function PremiumPack({ premium }: { premium: PremiumView }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.primary,
        backgroundColor: colors.card,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Sparkles size={12} color={colors.primary} strokeWidth={1.9} />
          <Text style={[typography.meta, { color: colors.foreground, letterSpacing: 1.2 }]}>
            The full read
          </Text>
        </View>
        <Text
          style={[
            typography.tag,
            {
              color: colors.primary,
              fontSize: 8,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.primary,
              paddingHorizontal: 5,
              paddingVertical: 2,
            },
          ]}
        >
          {premium.locked ? "MEMBERS" : premium.plan === "mains" ? "MAINS" : "PLUS"}
        </Text>
      </View>

      {premium.locked ? (
        <Locked premium={premium} />
      ) : premium.pack ? (
        <Unlocked premium={premium} />
      ) : (
        <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}>
          <Text style={[typography.summary, { color: colors.mutedForeground, lineHeight: 19 }]}>
            {premium.unavailable
              ? "The full read for this story is still being written. Pull down to refresh in a minute — it is generated once and then always available."
              : "The full read is not available for this story."}
          </Text>
        </View>
      )}
    </View>
  );
}

function Locked({ premium }: { premium: PremiumView }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}>
      <Text style={[typography.tag, { color: colors.primary, fontSize: 8.5 }]}>
        What you are reading
      </Text>
      <Text
        style={[
          typography.display,
          { color: colors.foreground, fontSize: 19, lineHeight: 23, marginTop: 5 },
        ]}
      >
        {premium.teaser.headline || "The exam-ready version of this story, not just the news."}
      </Text>

      <View style={{ marginTop: spacing.md, gap: 7 }}>
        {premium.teaser.includes.map((line) => (
          <View key={line} style={{ flexDirection: "row", gap: 7 }}>
            <Lock size={11} color={colors.primary} strokeWidth={2} style={{ marginTop: 2 }} />
            <Text style={[typography.summary, { color: colors.foreground, flex: 1, lineHeight: 19 }]}>
              {line}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: spacing.md }}>
        <ActionButton
          label="Unlock the full read"
          variant="solid"
          onPress={() => router.push("/plus")}
        />
      </View>
      <Text
        style={[
          typography.tag,
          { color: colors.mutedForeground, fontSize: 8, marginTop: spacing.sm, lineHeight: 13 },
        ]}
      >
        Paid in the app. Generated once per story, then cached. Your plan is checked on the server.
      </Text>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[typography.tag, { color: colors.primary, fontSize: 8.5 }]}>{children}</Text>
  );
}

function Unlocked({ premium }: { premium: PremiumView }) {
  const { colors } = useTheme();

  if (!premium.pack) return null;
  const pack = premium.pack;

  return (
    <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.lg }}>
      <View>
        <SectionLabel>Deep read</SectionLabel>
        <Text
          style={[
            typography.summary,
            { color: colors.foreground, lineHeight: 21, marginTop: 5 },
          ]}
        >
          {pack.deepRead}
        </Text>
      </View>

      {pack.takeaways.length ? (
        <View>
          <SectionLabel>Carry these</SectionLabel>
          <View style={{ marginTop: 6, gap: 6 }}>
            {pack.takeaways.map((line) => (
              <View key={line} style={{ flexDirection: "row", gap: 7 }}>
                <Check size={12} color={colors.primary} strokeWidth={2.2} style={{ marginTop: 2 }} />
                <Text style={[typography.summary, { color: colors.foreground, flex: 1, lineHeight: 19 }]}>
                  {line}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {pack.prelimsTraps.length ? (
        <View>
          <SectionLabel>Prelims traps</SectionLabel>
          <View style={{ marginTop: 6, gap: 6 }}>
            {pack.prelimsTraps.map((trap, index) => (
              <Trap key={`${index}-${trap.statement.slice(0, 12)}`} trap={trap} index={index} />
            ))}
          </View>
        </View>
      ) : null}

      <View>
        <SectionLabel>Mains skeleton</SectionLabel>
        <Text
          style={[
            typography.ui,
            { color: colors.foreground, marginTop: 6, lineHeight: 19 },
          ]}
        >
          {pack.mains.question}
        </Text>
        <View
          style={{
            marginTop: spacing.sm,
            borderLeftWidth: 2,
            borderLeftColor: colors.primary,
            paddingLeft: spacing.sm,
            gap: 7,
          }}
        >
          <Text style={[typography.summary, { color: colors.foreground, lineHeight: 19 }]}>
            {pack.mains.intro}
          </Text>
          {pack.mains.points.map((point, index) => (
            <View key={`${index}-${point.slice(0, 12)}`} style={{ flexDirection: "row", gap: 6 }}>
              <Text style={[typography.tag, { color: colors.primary, fontSize: 9, marginTop: 2 }]}>
                {index + 1}
              </Text>
              <Text style={[typography.summary, { color: colors.foreground, flex: 1, lineHeight: 19 }]}>
                {point}
              </Text>
            </View>
          ))}
          <Text style={[typography.summary, { color: colors.foreground, lineHeight: 19 }]}>
            {pack.mains.conclusion}
          </Text>
        </View>

        {pack.mains.keywords.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: spacing.sm }}>
            {pack.mains.keywords.map((keyword) => (
              <Text
                key={keyword}
                style={[
                  typography.tag,
                  {
                    color: colors.mutedForeground,
                    fontSize: 8,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                  },
                ]}
              >
                {keyword}
              </Text>
            ))}
          </View>
        ) : null}

        {pack.mains.dataPoint ? (
          <View
            style={{
              marginTop: spacing.sm,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              padding: spacing.sm,
            }}
          >
            <Text style={[typography.tag, { color: colors.primary, fontSize: 8 }]}>Data point</Text>
            <Text style={[typography.summary, { color: colors.foreground, marginTop: 3, lineHeight: 19 }]}>
              {pack.mains.dataPoint}
            </Text>
          </View>
        ) : null}
      </View>

      {pack.glossary.length ? (
        <View>
          <SectionLabel>In plain terms</SectionLabel>
          <View style={{ marginTop: 6, gap: 8 }}>
            {pack.glossary.map((entry) => (
              <View key={entry.term}>
                <Text style={[typography.ui, { color: colors.foreground, fontSize: 12.5 }]}>
                  {entry.term}
                </Text>
                <Text
                  style={[
                    typography.summary,
                    { color: colors.mutedForeground, marginTop: 2, lineHeight: 18 },
                  ]}
                >
                  {entry.meaning}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Trap({ trap, index }: { trap: PremiumTrap; index: number }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Pressable
      onPress={() => setOpen((value) => !value)}
      accessibilityRole="button"
      accessibilityLabel={`${open ? "Hide" : "Show"} the answer to trap ${index + 1}`}
      style={({ pressed }) => ({
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.background,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: "row", gap: 6, padding: spacing.sm, alignItems: "flex-start" }}>
        <Text style={[typography.tag, { color: colors.primary, fontSize: 9, marginTop: 1 }]}>
          {index + 1}.
        </Text>
        <Text style={[typography.summary, { color: colors.foreground, flex: 1, lineHeight: 19 }]}>
          {trap.statement}
        </Text>
        <ChevronDown
          size={12}
          color={colors.mutedForeground}
          strokeWidth={2}
          style={{ marginTop: 3, transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </View>
      {open ? (
        <View
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.sm,
          }}
        >
          <Text
            style={[
              typography.tag,
              { color: trap.verdict === "true" ? colors.primary : colors.warn, fontSize: 8.5 },
            ]}
          >
            {trap.verdict === "true" ? "True" : "False"}
          </Text>
          <Text
            style={[
              typography.summary,
              { color: colors.foreground, marginTop: 3, lineHeight: 19 },
            ]}
          >
            {trap.why}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
