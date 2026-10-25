import { useRouter } from "expo-router";
import { ArrowRight, Check, ChevronLeft } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton, DoubleRule, Screen } from "@/components/ui";
import {
  MINUTE_CHOICES,
  OPTIONAL_CHOICES,
  useDesk,
  type DeskPrefs,
} from "@/lib/desk";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius, spacing, type as typography } from "@/theme/tokens";

const STEPS = 3;

function Choice({
  label,
  hint,
  active,
  onPress,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.accent : colors.card,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.ui, { color: colors.foreground, fontSize: 14 }]}>{label}</Text>
        {hint ? (
          <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 2, fontSize: 12 }]}>
            {hint}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: active ? colors.primary : colors.border,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? colors.primary : "transparent",
        }}
      >
        {active ? <Check size={11} color={colors.primaryForeground} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

function Dots({ step }: { step: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {Array.from({ length: STEPS }).map((_, index) => (
        <View
          key={index}
          style={{
            width: index === step ? 20 : 6,
            height: 3,
            backgroundColor: index <= step ? colors.primary : colors.border,
          }}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { desk, finishOnboarding } = useDesk();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DeskPrefs>(desk);

  const patch = (next: Partial<DeskPrefs>) => setDraft((current) => ({ ...current, ...next }));

  const finish = () => {
    finishOnboarding({
      exam: draft.exam,
      stage: draft.stage,
      optional: draft.optional,
      minutes: draft.minutes,
    });
    router.replace("/");
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxxl + insets.bottom,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: spacing.sm,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.monoMedium,
              fontSize: 11,
              letterSpacing: 2.4,
              color: colors.foreground,
            }}
          >
            THE BUREAUCRACY
          </Text>
          <Pressable
            onPress={finish}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Skip setup"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={[typography.meta, { color: colors.mutedForeground }]}>Skip</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.md }}>
          <DoubleRule />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md }}>
          <Dots step={step} />
          <Text style={[typography.meta, { color: colors.mutedForeground }]}>
            {step + 1}/{STEPS}
          </Text>
        </View>

        {step === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", paddingVertical: spacing.xxl }}>
            <Text style={[typography.kicker, { color: colors.primary }]}>
              CIVIL-SERVICES INTELLIGENCE, RANKED
            </Text>
            <Text
              style={[
                typography.display,
                { color: colors.foreground, fontSize: 40, lineHeight: 40, marginTop: spacing.sm },
              ]}
            >
              The wire is loud.{"\n"}This one is ranked.
            </Text>
            <Text style={[typography.body, { color: colors.mutedForeground, marginTop: spacing.md }]}>
              Every story in the last 24 hours, scored for the exam and filed against the syllabus.
              No feeds, no infinite scroll, no noise.
            </Text>

            <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
              {[
                ["Five stories, eight minutes", "A daily brief that ends. Finish it and the streak is yours."],
                ["Ranked for your desk", "UPSC or State PSC, Prelims or Mains, with your optional tilt."],
                ["Kept, then revised", "Saves last 45 days and come back on day 1, 3, 7 and 30."],
              ].map(([title, body]) => (
                <View key={title} style={{ flexDirection: "row", gap: spacing.sm }}>
                  <View
                    style={{
                      width: 4,
                      alignSelf: "stretch",
                      backgroundColor: colors.primary,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.ui, { color: colors.foreground, fontSize: 14 }]}>
                      {title}
                    </Text>
                    <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 2 }]}>
                      {body}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : step === 1 ? (
          <View style={{ paddingTop: spacing.xl }}>
            <Text style={[typography.display, { color: colors.foreground, fontSize: 30, lineHeight: 32 }]}>
              Set your desk.
            </Text>
            <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 4 }]}>
              This changes ranking, not access. The whole wire stays visible.
            </Text>

            <Text style={[typography.kicker, { color: colors.primary, marginTop: spacing.xl }]}>
              THE EXAM
            </Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Choice
                label="UPSC Civil Services"
                hint="Prelims, Mains and the optional"
                active={draft.exam === "upsc"}
                onPress={() => patch({ exam: "upsc" })}
              />
              <Choice
                label="State Public Service Commission"
                hint="State PSC current affairs"
                active={draft.exam === "state"}
                onPress={() => patch({ exam: "state" })}
              />
            </View>

            <Text style={[typography.kicker, { color: colors.primary, marginTop: spacing.xl }]}>
              THE STAGE
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
              {(
                [
                  ["all", "Both"],
                  ["prelims", "Prelims"],
                  ["mains", "Mains"],
                ] as const
              ).map(([id, label]) => {
                const active = draft.stage === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => patch({ stage: id })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => ({
                      flex: 1,
                      alignItems: "center",
                      borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.accent : colors.card,
                      paddingVertical: spacing.md,
                      borderRadius: radius.sm,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={[typography.ui, { color: colors.foreground }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={{ paddingTop: spacing.xl }}>
            <Text style={[typography.display, { color: colors.foreground, fontSize: 30, lineHeight: 32 }]}>
              The last two.
            </Text>
            <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 4 }]}>
              Both can change later from your account.
            </Text>

            <Text style={[typography.kicker, { color: colors.primary, marginTop: spacing.xl }]}>
              OPTIONAL SUBJECT
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }}>
              {[{ id: "all", label: "Not decided", short: "—" }, ...OPTIONAL_CHOICES].map((choice) => {
                const active = draft.optional === choice.id;
                return (
                  <Pressable
                    key={choice.id}
                    onPress={() => patch({ optional: choice.id })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => ({
                      borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.accent : colors.card,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.sm,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={[typography.ui, { color: colors.foreground, fontSize: 12.5 }]}>
                      {choice.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[typography.kicker, { color: colors.primary, marginTop: spacing.xl }]}>
              DAILY WINDOW
            </Text>
            <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 4 }]}>
              The brief is built for eight. Pick what you will actually keep.
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
              {MINUTE_CHOICES.map((minutes) => {
                const active = draft.minutes === minutes;
                return (
                  <Pressable
                    key={minutes}
                    onPress={() => patch({ minutes })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => ({
                      flex: 1,
                      alignItems: "center",
                      borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.accent : colors.card,
                      paddingVertical: spacing.md,
                      borderRadius: radius.sm,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 22,
                        color: active ? colors.primary : colors.foreground,
                      }}
                    >
                      {minutes}
                    </Text>
                    <Text style={[typography.tag, { color: colors.mutedForeground }]}>MIN</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: "row", gap: spacing.sm, paddingTop: spacing.xl }}>
          {step > 0 ? (
            <ActionButton
              label="Back"
              variant="ghost"
              icon={<ChevronLeft size={14} color={colors.foreground} strokeWidth={2} />}
              onPress={() => setStep((current) => Math.max(0, current - 1))}
            />
          ) : null}
          <ActionButton
            label={step === STEPS - 1 ? "Enter the wire" : "Continue"}
            variant="solid"
            icon={
              step === STEPS - 1 ? undefined : (
                <ArrowRight size={14} color={colors.primaryForeground} strokeWidth={2.4} />
              )
            }
            onPress={() => {
              if (step === STEPS - 1) finish();
              else setStep((current) => Math.min(STEPS - 1, current + 1));
            }}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
