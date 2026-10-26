import { useRouter } from "expo-router";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  LogOut,
  Mail,
  RefreshCw,
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
import { useSubscribeDigest } from "@/api/hooks";
import { AppearancePanel } from "@/components/AppearancePanel";
import { ActionButton, DoubleRule, Panel, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  secure = false,
  keyboardType = "default",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: "default" | "email-address";
  autoComplete?: "email" | "password" | "name";
}) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={[typography.tag, { color: colors.mutedForeground }]}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.card,
          borderRadius: radius.sm,
          marginTop: 4,
          paddingHorizontal: spacing.sm,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
          autoCorrect={false}
          autoComplete={autoComplete}
          style={{
            flex: 1,
            color: colors.foreground,
            fontFamily: fonts.sans,
            fontSize: 15,
            paddingVertical: 11,
          }}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((current) => !current)} hitSlop={8}>
            {hidden ? (
              <Eye size={16} color={colors.mutedForeground} strokeWidth={1.8} />
            ) : (
              <EyeOff size={16} color={colors.mutedForeground} strokeWidth={1.8} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

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
  const { signIn, signUp, error } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
    if (password.length < 6) {
      setFormError("Use at least six characters for the password.");
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

  return (
    <View style={{ marginTop: spacing.xl }}>
      <Text style={[typography.kicker, { color: colors.primary }]}>ACCOUNT · OPTIONAL</Text>
      <Text
        style={[
          typography.display,
          { color: colors.foreground, fontSize: 30, lineHeight: 32, marginTop: 4 },
        ]}
      >
        Keep the streak{"\n"}when you change phones.
      </Text>
      <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: spacing.sm }]}>
        The wire works without an account. Signing in adds a durable copy of your progress, saves
        and study circles. It is a union, never an overwrite: nothing on this phone is replaced.
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
      <Field
        label="PASSWORD"
        value={password}
        onChange={setPassword}
        placeholder="At least six characters"
        secure
        autoComplete="password"
      />

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
          label={mode === "signin" ? "Sign in" : "Create account"}
          variant="solid"
          loading={busy}
          onPress={() => void submit()}
          style={{ flex: 1 }}
        />
        <ActionButton
          label={mode === "signin" ? "Create one" : "I have one"}
          variant="outline"
          onPress={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setFormError(null);
            setNotice(null);
          }}
        />
      </View>
      <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: spacing.sm, lineHeight: 14 }]}>
        We store an email, a password hash and your reading state. Nothing else.
      </Text>
    </View>
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
