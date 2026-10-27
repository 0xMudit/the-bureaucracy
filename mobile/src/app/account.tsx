import { useRouter } from "expo-router";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  LogOut,
  Mail,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSubscribeDigest, useBilling } from "@/api/hooks";
import { AppearancePanel } from "@/components/AppearancePanel";
import { Field } from "@/components/Field";
import { ActionButton, DoubleRule, Panel, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { membershipDate } from "@/lib/billing";
import {
  MINUTE_CHOICES,
  OPTIONAL_CHOICES,
  useDesk,
} from "@/lib/desk";
import {
  disablePush,
  enablePush,
  permissionGranted,
  pushConfigured,
} from "@/lib/notifications";
import { timeAgo } from "@/lib/time";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius, spacing, type as typography } from "@/theme/tokens";

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
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
        borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.accent : colors.card,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={[typography.ui, { color: colors.foreground, fontSize: 12 }]}>{label}</Text>
    </Pressable>
  );
}

function AuthPanel() {
  const { colors } = useTheme();
  const { signIn, signUp, requestPasswordReset, error } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    setNotice(null);
    if (!email.includes("@") || email.trim().length < 5) {
      setFormError("Enter the email you check every day.");
      return;
    }

    if (mode === "forgot") {
      setBusy(true);
      try {
        await requestPasswordReset(email);
        setNotice(
          `If an account exists for ${email.trim().toLowerCase()}, a reset link is on its way. Open it on this phone — the link returns to this app.`,
        );
      } catch (failure) {
        setFormError(failure instanceof Error ? failure.message : "Could not send the link.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "signup" && password.length < 8) {
      setFormError("Use at least eight characters for the password.");
      return;
    }
    if (!password) {
      setFormError("Enter your password.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const result = await signUp(email, password, name);
        if (result.needsConfirmation) {
          setNotice("Check your inbox for the confirmation link, then sign in.");
          setMode("signin");
        }
      } else {
        await signIn(email, password);
      }
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: "signin" | "signup" | "forgot") => {
    setMode(next);
    setFormError(null);
    setNotice(null);
  };

  return (
    <View style={{ marginTop: spacing.xl }}>
      <Text style={[typography.kicker, { color: colors.primary }]}>
        {mode === "forgot" ? "PASSWORD RECOVERY" : "ACCOUNT · OPTIONAL"}
      </Text>
      <Text
        style={[
          typography.display,
          { color: colors.foreground, fontSize: 30, lineHeight: 32, marginTop: 4 },
        ]}
      >
        {mode === "forgot" ? "A fresh key,\nin your inbox." : `Keep the streak\nwhen you change phones.`}
      </Text>
      <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: spacing.sm }]}>
        {mode === "forgot"
          ? "Recovery links are single-use and last one hour. Open the link on this phone and the app will ask for a new password."
          : "The wire works without an account. Signing in adds a durable copy of your progress, saves and study circles. It is a union, never an overwrite: nothing on this phone is replaced."}
      </Text>

      {mode === "signup" ? (
        <Field label="NAME" value={name} onChange={setName} placeholder="How circles see you" autoComplete="name" />
      ) : null}
      <Field
        label="EMAIL"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
      />
      {mode !== "forgot" ? (
        <Field
          label="PASSWORD"
          value={password}
          onChange={setPassword}
          placeholder={mode === "signup" ? "At least eight characters" : "Your password"}
          secure
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      ) : null}

      {mode === "signin" ? (
        <Pressable onPress={() => switchMode("forgot")} hitSlop={6} style={{ marginTop: spacing.sm }}>
          <Text style={[typography.meta, { color: colors.primary, letterSpacing: 0.9 }]}>
            Forgot your password?
          </Text>
        </Pressable>
      ) : null}

      {formError ?? error ? (
        <Text style={[typography.summary, { color: colors.destructive, marginTop: spacing.sm }]}>
          {formError ?? error}
        </Text>
      ) : null}
      {notice ? (
        <Text style={[typography.summary, { color: colors.success, marginTop: spacing.sm }]}>
          {notice}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
        <ActionButton
          label={
            mode === "forgot" ? "Send reset link" : mode === "signin" ? "Sign in" : "Create account"
          }
          variant="solid"
          loading={busy}
          onPress={() => void submit()}
          style={{ flex: 1 }}
        />
        <ActionButton
          label={mode === "signin" ? "Create one" : mode === "signup" ? "I have one" : "Back to sign in"}
          variant="outline"
          onPress={() => switchMode(mode === "signup" ? "signin" : mode === "forgot" ? "signin" : "signup")}
        />
      </View>
      <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: spacing.sm, lineHeight: 14 }]}>
        {mode === "forgot"
          ? "We never say whether an address has an account — that would leak who reads here."
          : "We store an email, a password hash and your reading state. Nothing else."}
      </Text>
    </View>
  );
}

function SecurityPanel() {
  const { colors } = useTheme();
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    setNotice(null);
    if (!current) {
      setFormError("Enter the password you use now.");
      return;
    }
    if (next.length < 8) {
      setFormError("Use at least eight characters for the new password.");
      return;
    }
    if (next !== confirm) {
      setFormError("The two new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setNotice("Password changed. Every other device was signed out.");
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : "The password could not be changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="PASSWORD"
      right={<Text style={[typography.tag, { color: colors.mutedForeground }]}>SIGNED IN</Text>}
    >
      <Text style={[typography.tag, { color: colors.mutedForeground, lineHeight: 13 }]}>
        Changing it signs every other device out. This phone stays signed in.
      </Text>
      <Field
        label="CURRENT PASSWORD"
        value={current}
        onChange={setCurrent}
        placeholder="Your password"
        secure
        autoComplete="current-password"
      />
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
      {notice ? (
        <Text style={[typography.summary, { color: colors.success, marginTop: spacing.sm }]}>{notice}</Text>
      ) : null}

      <ActionButton
        label="Change password"
        variant="solid"
        loading={busy}
        onPress={() => void submit()}
        style={{ marginTop: spacing.md }}
      />
    </Panel>
  );
}

function DeletePanel() {
  const { colors } = useTheme();
  const router = useRouter();
  const { deleteAccount, email } = useAuth();
  const [password, setPassword] = useState("");
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const remove = async () => {
    setFormError(null);
    if (!password) {
      setFormError("Enter your password to confirm.");
      return;
    }
    if (word.trim().toUpperCase() !== "DELETE") {
      setFormError("Type DELETE to confirm.");
      return;
    }
    setBusy(true);
    try {
      await deleteAccount(password, word);
      Alert.alert(
        "Account deleted",
        "The account, its comments and its reading state are gone from the server. This phone keeps its copy.",
        [{ text: "OK", onPress: () => router.replace("/") }],
      );
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : "The account could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    setFormError(null);
    if (!password) {
      setFormError("Enter your password to confirm.");
      return;
    }
    if (word.trim().toUpperCase() !== "DELETE") {
      setFormError("Type DELETE to confirm.");
      return;
    }
    Alert.alert(
      "Delete this account?",
      `This removes ${email ?? "the account"} and its server copy for good. Your progress stays on this phone, but no other device will see it again.`,
      [
        { text: "Keep it", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void remove() },
      ],
    );
  };

  return (
    <Panel
      title="CLOSE THE FILE"
      right={<Text style={[typography.tag, { color: colors.destructive }]}>PERMANENT</Text>}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Trash2 size={13} color={colors.destructive} strokeWidth={2} />
        <Text style={[typography.tag, { color: colors.mutedForeground, flex: 1, lineHeight: 13 }]}>
          Deletes the account, its comments and its server copy. This cannot be undone.
        </Text>
      </View>
      <Field
        label="PASSWORD"
        value={password}
        onChange={setPassword}
        placeholder="Prove it is you"
        secure
        autoComplete="current-password"
      />
      <Field
        label="TYPE DELETE TO CONFIRM"
        value={word}
        onChange={setWord}
        placeholder="DELETE"
      />

      {formError ? (
        <Text style={[typography.summary, { color: colors.destructive, marginTop: spacing.sm }]}>
          {formError}
        </Text>
      ) : null}

      <ActionButton
        label="Delete account"
        variant="outline"
        loading={busy}
        onPress={() => confirm()}
        style={{ marginTop: spacing.md, borderColor: colors.destructive }}
      />
    </Panel>
  );
}

function DeskPanel() {
  const { colors } = useTheme();
  const { desk, setDesk } = useDesk();

  return (
    <Panel title="YOUR DESK" right={<Text style={[typography.tag, { color: colors.mutedForeground }]}>RANKING ONLY</Text>}>
      <Text style={[typography.tag, { color: colors.mutedForeground }]}>EXAM</Text>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
        {(
          [
            ["upsc", "UPSC CSE"],
            ["state", "State PSC"],
          ] as const
        ).map(([id, label]) => (
          <Chip key={id} label={label} active={desk.exam === id} onPress={() => setDesk({ exam: id })} />
        ))}
      </View>

      <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: spacing.md }]}>STAGE</Text>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
        {(
          [
            ["all", "Both"],
            ["prelims", "Prelims"],
            ["mains", "Mains"],
          ] as const
        ).map(([id, label]) => (
          <Chip key={id} label={label} active={desk.stage === id} onPress={() => setDesk({ stage: id })} />
        ))}
      </View>

      <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: spacing.md }]}>
        OPTIONAL TILT
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {[{ id: "all", label: "None" }, ...OPTIONAL_CHOICES].map((choice) => (
          <Chip
            key={choice.id}
            label={choice.label}
            active={desk.optional === choice.id}
            onPress={() => setDesk({ optional: choice.id })}
          />
        ))}
      </View>

      <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: spacing.md }]}>
        DAILY WINDOW
      </Text>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
        {MINUTE_CHOICES.map((minutes) => (
          <Chip
            key={minutes}
            label={`${minutes} min`}
            active={desk.minutes === minutes}
            onPress={() => setDesk({ minutes })}
          />
        ))}
      </View>
    </Panel>
  );
}

function DigestPanel() {
  const { colors } = useTheme();
  const { email } = useAuth();
  const digest = useSubscribeDigest();
  const [address, setAddress] = useState(email ?? "");
  const [note, setNote] = useState<string | null>(null);
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);

  useEffect(() => {
    if (email) setAddress((current) => current || email);
  }, [email]);

  const submit = async () => {
    setNote(null);
    setConfirmUrl(null);
    if (!address.includes("@")) {
      setNote("Enter a valid email address.");
      return;
    }
    try {
      const result = await digest.mutateAsync(address.trim());
      if (!result.ok) {
        setNote(result.error ?? "Could not subscribe that address.");
        return;
      }
      setNote(
        result.already
          ? "That address is already on the list."
          : result.pending
            ? "Check your inbox to confirm. The digest starts tomorrow."
            : "Subscribed. The digest arrives each morning.",
      );
      if (result.confirmUrl) setConfirmUrl(result.confirmUrl);
    } catch {
      setNote("The digest service could not be reached. Try again later.");
    }
  };

  return (
    <Panel title="MORNING DIGEST" right={<Mail size={12} color={colors.mutedForeground} strokeWidth={2} />}>
      <Text style={[typography.summary, { color: colors.mutedForeground }]}>
        The same five stories in your inbox, once a day. Free, no tracking pixels, one-click
        unsubscribe.
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.background,
          borderRadius: radius.sm,
          marginTop: spacing.sm,
          paddingHorizontal: spacing.sm,
        }}
      >
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="you@example.com"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            color: colors.foreground,
            fontFamily: fonts.sans,
            fontSize: 14,
            paddingVertical: 10,
          }}
        />
      </View>
      <ActionButton
        label={digest.isPending ? "Sending" : "Send me the brief"}
        variant="outline"
        loading={digest.isPending}
        onPress={() => void submit()}
        style={{ marginTop: spacing.sm }}
      />
      {note ? (
        <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: spacing.sm }]}>
          {note}
        </Text>
      ) : null}
      {confirmUrl ? (
        <Pressable onPress={() => void Linking.openURL(confirmUrl).catch(() => {})} hitSlop={6}>
          <Text style={[typography.meta, { color: colors.primary, marginTop: 6 }]}>
            Open confirmation link →
          </Text>
        </Pressable>
      ) : null}
    </Panel>
  );
}

function PushPanel() {
  const { colors } = useTheme();
  const [granted, setGranted] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void permissionGranted().then(setGranted).catch(() => {});
  }, []);

  const toggle = async () => {
    setBusy(true);
    setNote(null);
    try {
      if (granted) {
        await disablePush();
        setGranted(false);
        setNote("Off. No notification will be sent to this device.");
      } else {
        const result = await enablePush();
        setGranted(result.granted);
        setNote(result.note);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="NOTIFICATIONS"
      right={
        granted ? (
          <CheckCircle2 size={12} color={colors.success} strokeWidth={2} />
        ) : (
          <Bell size={12} color={colors.mutedForeground} strokeWidth={2} />
        )
      }
    >
      <Text style={[typography.summary, { color: colors.mutedForeground }]}>
        One nudge a day, after the five are ready. There is no breaking-news channel and no streak
        guilt.
      </Text>
      {!pushConfigured ? (
        <Text style={[typography.tag, { color: colors.warn, marginTop: spacing.sm, lineHeight: 14 }]}>
          PUSH NEEDS THE STORE BUILD · THIS DEVELOPMENT BUILD HAS NO EAS PROJECT ID
        </Text>
      ) : null}
      {note ? (
        <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: spacing.sm }]}>
          {note}
        </Text>
      ) : null}
      <ActionButton
        label={busy ? "Working" : granted ? "Turn off" : "Turn on"}
        variant={granted ? "outline" : "solid"}
        loading={busy}
        disabled={!pushConfigured && !granted}
        onPress={() => void toggle()}
        style={{ marginTop: spacing.sm }}
      />
    </Panel>
  );
}

function MembershipRow() {
  const { colors } = useTheme();
  const router = useRouter();
  const billing = useBilling();
  const current = billing.data?.current;
  const paid = Boolean(current && current.plan !== "free");
  const until = membershipDate(current?.expiresAt ?? null);
  const label = current?.plan === "mains" ? "Mains" : paid ? "Plus" : "Free";

  return (
    <Pressable
      onPress={() => router.push("/plus")}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: paid ? colors.primary : colors.border,
        backgroundColor: colors.card,
        padding: spacing.md,
        marginTop: spacing.md,
        borderRadius: radius.sm,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Sparkles
        size={15}
        color={paid ? colors.primary : colors.mutedForeground}
        strokeWidth={1.9}
      />
      <View style={{ flex: 1 }}>
        <Text style={[typography.ui, { color: colors.foreground, fontSize: 13.5 }]}>
          Membership · {label}
        </Text>
        <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: 1 }]}>
          {paid
            ? until
              ? `Full read active until ${until}`
              : "Full read active, no expiry"
            : "The full read, archive and Mains skeleton"}
        </Text>
      </View>
      <ChevronRight size={14} color={colors.border} strokeWidth={2.2} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { desk } = useDesk();

  const close = () => {
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
            {auth.session ? "YOUR ACCOUNT" : "THE BUREAUCRACY"}
          </Text>
          <Pressable
            onPress={close}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close account"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <X size={20} color={colors.foreground} strokeWidth={1.9} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <DoubleRule />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!auth.session ? <AuthPanel /> : null}

          {auth.session ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={[typography.kicker, { color: colors.primary }]}>SIGNED IN</Text>
              <Text
                style={[
                  typography.display,
                  { color: colors.foreground, fontSize: 30, lineHeight: 32, marginTop: 4 },
                ]}
              >
                {auth.displayName ?? "Reader"}
              </Text>
              <Text style={[typography.meta, { color: colors.mutedForeground, marginTop: 4 }]}>
                {auth.email}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  padding: spacing.md,
                  marginTop: spacing.md,
                  borderRadius: radius.sm,
                }}
              >
                <RefreshCw
                  size={14}
                  color={auth.syncing ? colors.primary : colors.success}
                  strokeWidth={2}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.ui, { color: colors.foreground, fontSize: 13 }]}>
                    {auth.syncing
                      ? "Syncing this device…"
                      : auth.lastSyncedAt
                        ? `Synced ${timeAgo(auth.lastSyncedAt)}`
                        : "Device copy is current"}
                  </Text>
                  <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: 1 }]}>
                    {desk.exam === "state" ? "State PSC" : "UPSC CSE"} ·{" "}
                    {desk.stage === "prelims" ? "Prelims" : desk.stage === "mains" ? "Mains" : "Both"}
                  </Text>
                </View>
                <ActionButton
                  label="Sync"
                  variant="ghost"
                  loading={auth.syncing}
                  onPress={() => void auth.syncNow()}
                />
              </View>
              {auth.error ? (
                <Text style={[typography.summary, { color: colors.warn, marginTop: spacing.sm }]}>
                  {auth.error}
                </Text>
              ) : null}

              <Pressable
                onPress={() => router.push("/circles")}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  padding: spacing.md,
                  marginTop: spacing.md,
                  borderRadius: radius.sm,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <Users size={15} color={colors.primary} strokeWidth={1.9} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.ui, { color: colors.foreground, fontSize: 13.5 }]}>
                    Study circles
                  </Text>
                  <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: 1 }]}>
                    Share a code. See who read today.
                  </Text>
                </View>
                <ChevronRight size={14} color={colors.border} strokeWidth={2.2} />
              </Pressable>

              <MembershipRow />

              <View style={{ marginTop: spacing.md }}>
                <SecurityPanel />
              </View>
              <View style={{ marginTop: spacing.md }}>
                <DeletePanel />
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: spacing.xl }}>
            <AppearancePanel />
          </View>

          <View style={{ marginTop: spacing.md }}>
            <DeskPanel />
          </View>

          <View style={{ marginTop: spacing.md }}>
            <DigestPanel />
          </View>

          <View style={{ marginTop: spacing.md }}>
            <PushPanel />
          </View>

          {auth.session ? (
            <Pressable
              onPress={() =>
                Alert.alert("Sign out?", "Your progress stays on this phone. Sign in again to sync it.", [
                  { text: "Stay", style: "cancel" },
                  {
                    text: "Sign out",
                    style: "destructive",
                    onPress: () => {
                      void auth.signOut().then(() => close());
                    },
                  },
                ])
              }
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: spacing.lg,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <LogOut size={13} color={colors.destructive} strokeWidth={2} />
              <Text style={[typography.meta, { color: colors.destructive }]}>Sign out</Text>
            </Pressable>
          ) : (
            <Text
              style={[
                typography.tag,
                {
                  color: colors.mutedForeground,
                  textAlign: "center",
                  marginTop: spacing.xl,
                  lineHeight: 15,
                },
              ]}
            >
              Accounts are optional. The wire, the brief and your streak work without one.
            </Text>
          )}

          {!auth.configured ? (
            <View style={{ marginTop: spacing.xl }}>
              <DoubleRule />
              <Text
                style={[
                  typography.tag,
                  { color: colors.warn, marginTop: spacing.sm, lineHeight: 15, textAlign: "center" },
                ]}
              >
                ACCOUNTS ARE NOT CONFIGURED IN THIS BUILD · SET EXPO_PUBLIC_SUPABASE_URL AND
                EXPO_PUBLIC_SUPABASE_ANON_KEY
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
