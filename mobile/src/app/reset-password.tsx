import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, Clock3, KeyRound, MailCheck } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Field } from "@/components/Field";
import { ActionButton, DoubleRule, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { adoptLinkSession, type LinkFailure } from "@/lib/link-auth";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, spacing, type as typography } from "@/theme/tokens";

/**
 * Landing screen for the password-recovery email.
 *
 * The web exchange happens against a cookie jar the phone never had, so a reset
 * started here has to come back here. Only a live recovery session can
 * `updateUser` a password, so the link is adopted first, never trusted blindly.
 */

type Phase = "reading" | "ready" | "invalid" | "done";

const REASONS: Record<LinkFailure, string> = {
  expired: "That reset link has expired. Recovery links are single-use and last one hour — ask for a fresh one below.",
  invalid: "That link is not valid. It may already have been used — ask for a fresh one below.",
  missing: "Open this screen from the reset email. There is no recovery session on this device.",
  unconfigured: "Accounts are not configured in this build.",
  failed: "The recovery session could not be started. Ask for a fresh link below.",
};

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { requestPasswordReset } = useAuth();

  const [phase, setPhase] = useState<Phase>("reading");
  const [reason, setReason] = useState<LinkFailure>("missing");
  const [account, setAccount] = useState<string | null>(null);

  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Resend form for a dead link.
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState<string | null>(null);

  const handled = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async (url: string) => {
      if (handled.current === url) return;
      handled.current = url;
      setFormError(null);
      setPhase("reading");

      const result = await adoptLinkSession(url);
      if (!active) return;

      if (!result.ok) {
        setReason(result.reason);
        setPhase("invalid");
        return;
      }

      setAccount(result.email);
      setPhase("ready");
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

    // A link opened while the app is already running arrives here instead.
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (active) void run(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const save = async () => {
    setFormError(null);
    if (!supabase) {
      setFormError("Accounts are not configured in this build.");
      return;
    }
    if (next.length < 8) {
      setFormError("Use at least eight characters for the new password.");
      return;
    }
    if (next !== confirm) {
      setFormError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) {
        const text = error.message.toLowerCase();
        if (text.includes("least") || text.includes("weak")) {
          setFormError("Use at least eight characters for the new password.");
        } else if (text.includes("same")) {
          setFormError("Choose a password different from the old one.");
        } else {
          setFormError("The password could not be saved. Ask for a fresh link.");
        }
        return;
      }

      // The recovery link proved the inbox; revoke every other device.
      await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
      setPhase("done");
    } catch {
      setFormError("The password could not be saved. Ask for a fresh link.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setFormError(null);
    setResent(null);
    if (!email.includes("@") || email.trim().length < 5) {
      setFormError("Enter the email you check every day.");
      return;
    }
    setResending(true);
    try {
      await requestPasswordReset(email);
      setResent(
        `If an account exists for ${email.trim().toLowerCase()}, a fresh link is on its way. Open it on this phone.`,
      );
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : "Could not send the link.");
    } finally {
      setResending(false);
    }
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
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
            onPress={back}
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
          keyboardShouldPersistTaps="handled"
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

          {phase === "ready" ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={[typography.kicker, { color: colors.primary }]}>NEW CREDENTIALS</Text>
              <Text
                style={[
                  typography.display,
                  { color: colors.foreground, fontSize: 30, lineHeight: 32, marginTop: 4 },
                ]}
              >
                Choose a new password.
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm }}>
                <KeyRound size={13} color={colors.primary} strokeWidth={1.9} />
                <Text style={[typography.summary, { color: colors.mutedForeground, flex: 1 }]}>
                  {account ? `For ${account}. ` : ""}Save once and every other device is signed out.
                </Text>
              </View>

              <Field
                label="NEW PASSWORD"
                value={next}
                onChange={setNext}
                placeholder="At least eight characters"
                secure
                autoComplete="new-password"
              />
              <Field
                label="REPEAT NEW PASSWORD"
                value={confirm}
                onChange={setConfirm}
                placeholder="Type it again"
                secure
                autoComplete="new-password"
              />

              {formError ? (
                <Text style={[typography.summary, { color: colors.destructive, marginTop: spacing.sm }]}>
                  {formError}
                </Text>
              ) : null}

              <ActionButton
                label="Save new password"
                variant="solid"
                loading={busy}
                onPress={() => void save()}
                style={{ marginTop: spacing.md }}
              />

              <Text
                style={[
                  typography.tag,
                  { color: colors.mutedForeground, marginTop: spacing.md, lineHeight: 14 },
                ]}
              >
                The new password replaces the old one immediately. This phone stays signed in.
              </Text>
            </View>
          ) : null}

          {phase === "done" ? (
            <View style={{ marginTop: spacing.xl }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
                <Text style={[typography.kicker, { color: colors.success }]}>SAVED</Text>
              </View>
              <Text
                style={[
                  typography.display,
                  { color: colors.foreground, fontSize: 30, lineHeight: 32, marginTop: 4 },
                ]}
              >
                The key is changed.
              </Text>
              <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: spacing.sm }]}>
                Sign in on any other device with the new password. This phone is already signed in.
              </Text>
              <ActionButton
                label="Back to your account"
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
                Ask for a fresh key.
              </Text>
              <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: spacing.sm }]}>
                {REASONS[reason]}
              </Text>

              {reason !== "unconfigured" ? (
                <>
                  <Field
                    label="EMAIL"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoComplete="email"
                  />

                  {formError ? (
                    <Text
                      style={[typography.summary, { color: colors.destructive, marginTop: spacing.sm }]}
                    >
                      {formError}
                    </Text>
                  ) : null}
                  {resent ? (
                    <Text style={[typography.summary, { color: colors.success, marginTop: spacing.sm }]}>
                      {resent}
                    </Text>
                  ) : null}

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.xs }}>
                    <MailCheck size={12} color={colors.mutedForeground} strokeWidth={1.8} />
                    <Text style={[typography.tag, { color: colors.mutedForeground, flex: 1, lineHeight: 13 }]}>
                      Open the link on this phone. A link opened on a computer sets the password in
                      the browser, not here.
                    </Text>
                  </View>

                  <ActionButton
                    label="Send a new link"
                    variant="solid"
                    loading={resending}
                    onPress={() => void resend()}
                    style={{ marginTop: spacing.md }}
                  />
                </>
              ) : null}

              <ActionButton
                label="Back to the account"
                variant="outline"
                onPress={() => router.replace("/account")}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
