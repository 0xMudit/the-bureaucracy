import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Check, ChevronLeft, Lock, Sparkles, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBilling, usePurchase } from "@/api/hooks";
import type { BillingPeriod, BillingPlan, Entitlement, PaidPlanId } from "@/api/types";
import { ActionButton, DoubleRule, ErrorNote, Panel, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { checkoutAvailable, membershipDate } from "@/lib/billing";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius, spacing, type as typography } from "@/theme/tokens";

const INCLUDED: Record<PaidPlanId, string[]> = {
  plus: [
    "The full read on every story",
    "The archive beyond 24 hours",
    "Revision queue across devices",
    "Monthly compendium PDF",
  ],
  mains: [
    "Everything in Plus",
    "Rubric-scored answer evaluation",
    "Weekly prelims test with percentile",
    "Mentor calls, once a month",
  ],
};

function PeriodChip({
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
      style={({ pressed }) => ({
        flex: 1,
        borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.accent : colors.card,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={[typography.ui, { color: colors.foreground, fontSize: 12.5 }]}>{label}</Text>
      {hint ? (
        <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: 2 }]}>{hint}</Text>
      ) : null}
    </Pressable>
  );
}

function PlanCard({
  plan,
  selected,
  onPress,
}: {
  plan: BillingPlan;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const yearly = plan.period === "yearly";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan.label}, ${plan.price} per ${yearly ? "year" : "month"}`}
      style={({ pressed }) => ({
        flex: 1,
        borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: colors.card,
        borderRadius: radius.sm,
        padding: spacing.md,
        gap: 4,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={[typography.kicker, { color: selected ? colors.primary : colors.mutedForeground }]}>
          {plan.label.toUpperCase()}
        </Text>
        {selected ? <Check size={13} color={colors.primary} strokeWidth={2.4} /> : null}
      </View>

      <Text style={[typography.display, { color: colors.foreground, fontSize: 28, lineHeight: 30 }]}>
        {plan.price}
      </Text>
      <Text style={[typography.tag, { color: colors.mutedForeground }]}>
        per {plan.cadence}
        {yearly ? ` · ${plan.perMonth}/mo` : ""}
      </Text>

      <View style={{ marginTop: spacing.sm, gap: 5 }}>
        {INCLUDED[plan.plan].map((line) => (
          <View key={line} style={{ flexDirection: "row", gap: 5 }}>
            <Check
              size={10}
              color={selected ? colors.primary : colors.mutedForeground}
              strokeWidth={2.4}
              style={{ marginTop: 2 }}
            />
            <Text
              style={[typography.tag, { color: colors.foreground, flex: 1, lineHeight: 14 }]}
            >
              {line}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function CurrentPlan({ current }: { current: { plan: string; expiresAt: string | null; source: string | null } }) {
  const { colors } = useTheme();
  const until = membershipDate(current.expiresAt);
  const paid = current.plan !== "free";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: paid ? colors.primary : colors.border,
        backgroundColor: colors.card,
        borderRadius: radius.sm,
        padding: spacing.md,
      }}
    >
      {paid ? (
        <Sparkles size={14} color={colors.primary} strokeWidth={2} />
      ) : (
        <Lock size={13} color={colors.mutedForeground} strokeWidth={2} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[typography.ui, { color: colors.foreground, fontSize: 13 }]}>
          {paid ? `${current.plan === "mains" ? "Mains" : "Plus"} is active` : "You are on the free wire"}
        </Text>
        <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: 1 }]}>
          {paid
            ? until
              ? `Access until ${until}`
              : "Staff access, no expiry"
            : "One story at a time, no full read"}
        </Text>
      </View>
    </View>
  );
}

export default function PlusScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const billing = useBilling();
  const purchase = usePurchase();

  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const [plan, setPlan] = useState<PaidPlanId>("plus");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Entitlement | null>(null);

  const options = useMemo(
    () => (billing.data?.plans ?? []).filter((option) => option.period === period),
    [billing.data?.plans, period],
  );
  const selected = options.find((option) => option.plan === plan) ?? options[0] ?? null;
  const canPay = Boolean(billing.data?.configured) && checkoutAvailable();

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const pay = async () => {
    setError(null);
    if (!auth.session) {
      router.push("/account");
      return;
    }
    if (!selected) return;

    try {
      const result = await purchase.mutateAsync({
        plan: selected.plan,
        period: selected.period,
        name: auth.displayName ?? "",
        email: auth.email ?? "",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDone(result.entitlement);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The payment did not go through.");
    }
  };

  const until = membershipDate(done?.expiresAt ?? billing.data?.current.expiresAt ?? null);

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {router.canGoBack() ? (
            <Pressable
              onPress={close}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close membership"
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <ChevronLeft size={18} color={colors.foreground} strokeWidth={2} />
            </Pressable>
          ) : null}
          <Text
            style={{
              fontFamily: fonts.monoMedium,
              fontSize: 11,
              letterSpacing: 2.4,
              color: colors.foreground,
            }}
          >
            MEMBERSHIP
          </Text>
        </View>
        <Pressable
          onPress={close}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close membership"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <X size={19} color={colors.foreground} strokeWidth={1.9} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <DoubleRule />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxxl + insets.bottom,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: spacing.md }}>
          <Text style={[typography.kicker, { color: colors.primary }]}>THE FULL READ</Text>
          <Text
            style={[
              typography.display,
              { color: colors.foreground, fontSize: 32, lineHeight: 34, marginTop: 4 },
            ]}
          >
            {done ? "The file is\nopen." : "Exam-ready,\nnot just news."}
          </Text>
          <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: spacing.sm }]}>
            {done
              ? `Your membership is active${until ? ` until ${until}` : ""}. The full read on every story is unlocked on this account.`
              : "Every story already has an angle for the paper. Members get the deep read, the Prelims traps and a Mains skeleton written for it — and the archive beyond the daily wire."}
          </Text>
        </View>

        {billing.isLoading ? (
          <View style={{ paddingVertical: spacing.xxl, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : billing.error ? (
          <ErrorNote
            message={billing.error instanceof Error ? billing.error.message : "The plans could not be read."}
            onRetry={() => void billing.refetch()}
          />
        ) : done ? (
          <Panel
            title="MEMBERSHIP ACTIVE"
            right={<Text style={[typography.tag, { color: colors.success }]}>PAID</Text>}
          >
            <Text style={[typography.summary, { color: colors.foreground }]}>
              {done.plan === "mains" ? "Mains" : "Plus"} is on this account{until ? ` until ${until}` : ""}.
              Open a story and the pack is already there.
            </Text>
            <ActionButton
              label="Back to the story"
              variant="solid"
              onPress={close}
              style={{ marginTop: spacing.md }}
            />
          </Panel>
        ) : (
          <>
            {billing.data ? <CurrentPlan current={billing.data.current} /> : null}

            <View>
              <Text style={[typography.tag, { color: colors.mutedForeground }]}>BILLING PERIOD</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: 6 }}>
                <PeriodChip
                  label="Monthly"
                  hint="30 days"
                  active={period === "monthly"}
                  onPress={() => setPeriod("monthly")}
                />
                <PeriodChip
                  label="Yearly"
                  hint="365 days · best value"
                  active={period === "yearly"}
                  onPress={() => setPeriod("yearly")}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {options.map((option) => (
                <PlanCard
                  key={`${option.plan}-${option.period}`}
                  plan={option}
                  selected={selected?.plan === option.plan}
                  onPress={() => setPlan(option.plan)}
                />
              ))}
            </View>

            {selected ? (
              <Text style={[typography.tag, { color: colors.mutedForeground, lineHeight: 15 }]}>
                {selected.blurb} Billed once for {selected.days} days.
              </Text>
            ) : null}

            {!auth.session ? (
              <Text style={[typography.summary, { color: colors.warn }]}>
                Sign in first — membership is tied to your account, so it follows you to a new phone.
              </Text>
            ) : null}

            {billing.data && !billing.data.configured ? (
              <Text style={[typography.summary, { color: colors.warn }]}>
                Payments are being switched on. Write to{" "}
                <Text
                  onPress={() =>
                    void Linking.openURL(`mailto:${billing.data?.contact ?? ""}`).catch(() => {})
                  }
                  style={{ color: colors.primary }}
                >
                  {billing.data.contact}
                </Text>{" "}
                and founding access is granted by hand.
              </Text>
            ) : !canPay ? (
              <Text style={[typography.summary, { color: colors.warn }]}>
                This preview build cannot open the payment sheet. Use the installed app build.
              </Text>
            ) : null}

            {error ? (
              <Text style={[typography.summary, { color: colors.destructive }]}>{error}</Text>
            ) : null}

            <ActionButton
              label={
                !auth.session
                  ? "Sign in to pay"
                  : purchase.isPending
                    ? "Opening Razorpay"
                    : selected
                      ? `Pay ${selected.price}`
                      : "Choose a plan"
              }
              variant="solid"
              loading={purchase.isPending}
              disabled={!auth.session || !selected || !canPay || purchase.isPending}
              onPress={() => void pay()}
            />

            <Text style={[typography.tag, { color: colors.mutedForeground, lineHeight: 15 }]}>
              Razorpay · UPI, cards and net banking. The sheet opens over this screen; nothing
              redirects to a website. Plans do not auto-renew — pay again when the period ends.
            </Text>

            <View
              style={{
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                paddingTop: spacing.md,
                gap: 6,
              }}
            >
              <Text style={[typography.tag, { color: colors.mutedForeground, lineHeight: 15 }]}>
                Prices include GST. A refund within seven days is available in writing; it ends the
                plan on the spot. Receipts are emailed by Razorpay.
              </Text>
              <Text
                onPress={() =>
                  void Linking.openURL(`mailto:${billing.data?.contact ?? ""}`).catch(() => {})
                }
                style={[typography.meta, { color: colors.primary }]}
              >
                Questions? Write to the editor →
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
