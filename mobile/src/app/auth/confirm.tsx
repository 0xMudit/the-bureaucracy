import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, Clock3, MailCheck } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton, DoubleRule, Screen } from "@/components/ui";
import { adoptLinkSession, type LinkFailure } from "@/lib/link-auth";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, spacing, type as typography } from "@/theme/tokens";

/**
 * Landing screen for the signup confirmation email.
 *
 * Confirming in a browser works, but it strands the reader on the web when
 * they signed up on the phone. This route finishes the confirmation in the app
 * and leaves them signed in.
 */

type Phase = "reading" | "confirmed" | "invalid";

const REASONS: Record<LinkFailure, string> = {
  expired: "That confirmation link has expired. Sign in and we will send a fresh one.",
  invalid: "That link is not valid, or the address is already confirmed. Try signing in.",
  missing: "Open this screen from the confirmation email. There is nothing to confirm here.",
  unconfigured: "Accounts are not configured in this build.",
  failed: "The confirmation could not be completed. Try signing in, or open the link again.",
};

export default function ConfirmEmailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>("reading");
  const [reason, setReason] = useState<LinkFailure>("missing");
  const [email, setEmail] = useState<string | null>(null);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async (url: string) => {
      if (handled.current === url) return;
      handled.current = url;
      const result = await adoptLinkSession(url);
      if (!active) return;

      if (!result.ok) {
        setReason(result.reason);
        setPhase("invalid");
        return;
      }
      setEmail(result.email);
      setPhase("confirmed");
    };

    void (async () => {
      const initial = await Linking.getInitialURL().catch(() => null);
      if (!active) return;
      if (initial) await run(initial);
      else {
        setReason("missing");
        setPhase("invalid");
      }
    })();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (active) void run(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

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
        <Text
          style={{
            fontFamily: fonts.monoMedium,
            fontSize: 11,
            letterSpacing: 2.4,
            color: colors.foreground,
          }}
        >
          ACCOUNT OFFICE
        </Text>
        <Pressable
          onPress={() => router.replace("/")}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <ArrowLeft size={20} color={colors.foreground} strokeWidth={1.9} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <DoubleRule />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxxl + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {phase === "reading" ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xxxl }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[typography.meta, { color: colors.mutedForeground, marginTop: spacing.md }]}>
              Reading the link…
            </Text>
          </View>
        ) : null}

        {phase === "confirmed" ? (
          <View style={{ marginTop: spacing.xl }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
              <Text style={[typography.kicker, { color: colors.success }]}>CONFIRMED</Text>
            </View>
            <Text
              style={[
                typography.display,
                { color: colors.foreground, fontSize: 30, lineHeight: 32, marginTop: 4 },
              ]}
            >
              The address is on file.
            </Text>
            <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: spacing.sm }]}>
              {email ? `${email} is confirmed and this phone is signed in. ` : "This phone is signed in. "}
              Your progress, saves and study circles now have a server copy.
            </Text>
            <ActionButton
              label="Open your account"
              variant="solid"
              onPress={() => router.replace("/account")}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : null}

        {phase === "invalid" ? (
          <View style={{ marginTop: spacing.xl }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Clock3 size={14} color={colors.destructive} strokeWidth={2} />
              <Text style={[typography.kicker, { color: colors.destructive }]}>
                LINK EXPIRED OR ALREADY USED
              </Text>
            </View>
            <Text
              style={[
                typography.display,
                { color: colors.foreground, fontSize: 30, lineHeight: 32, marginTop: 4 },
              ]}
            >
              Nothing to confirm.
            </Text>
            <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: spacing.sm }]}>
              {REASONS[reason]}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm }}>
              <MailCheck size={12} color={colors.mutedForeground} strokeWidth={1.8} />
              <Text style={[typography.tag, { color: colors.mutedForeground, flex: 1, lineHeight: 13 }]}>
                Sign in from the account screen. If a fresh link is needed, the app will ask for one.
              </Text>
            </View>
            <ActionButton
              label="Open the account"
              variant="solid"
              onPress={() => router.replace("/account")}
              style={{ marginTop: spacing.lg }}
            />
            <ActionButton
              label="Back to the wire"
              variant="outline"
              onPress={() => router.replace("/")}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
