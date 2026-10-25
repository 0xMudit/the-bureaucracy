import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Flame, Plus, Share2, Users } from "lucide-react-native";
import React, { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CircleSummary } from "@/api/types";
import { useCircles, useCreateCircle, useJoinCircle } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { ActionButton, DoubleRule, EmptyState, ErrorNote, Screen, WireSkeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius, spacing, type as typography } from "@/theme/tokens";

function CircleCard({ circle }: { circle: CircleSummary }) {
  const { colors } = useTheme();
  const members = circle.members ?? [];

  const share = async () => {
    try {
      await Share.share({
        message: `Join my study circle "${circle.name}" on The Bureaucracy. Invite code: ${circle.inviteCode}`,
      });
    } catch {
      // dismissed
    }
  };

  return (
    <View
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: radius.sm,
        marginTop: spacing.md,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[typography.headline, { color: colors.foreground, fontSize: 19 }]}>
            {circle.name}
          </Text>
          <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: 2 }]}>
            {members.length} {members.length === 1 ? "MEMBER" : "MEMBERS"}
            {circle.isOwner ? " · YOU STARTED IT" : ""}
          </Text>
        </View>
        <Pressable
          onPress={() => void share()}
          accessibilityRole="button"
          accessibilityLabel={`Share invite code ${circle.inviteCode}`}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            paddingHorizontal: spacing.sm,
            paddingVertical: 5,
            borderRadius: radius.sm,
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <Text style={[typography.meta, { color: colors.primary, letterSpacing: 1.2 }]}>
            {circle.inviteCode}
          </Text>
          <Share2 size={11} color={colors.primary} strokeWidth={2.1} />
        </Pressable>
      </View>

      {members.map((member, index) => (
        <View
          key={`${member.name}-${index}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.ui,
                { color: member.isYou ? colors.primary : colors.foreground, fontSize: 13 },
              ]}
            >
              {member.name}
              {member.isYou ? " (you)" : ""}
            </Text>
            <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: 1 }]}>
              {member.today} READ TODAY
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Flame
              size={12}
              color={member.streak > 0 ? colors.primary : colors.border}
              strokeWidth={2}
            />
            <Text
              style={[
                typography.meta,
                { color: member.streak > 0 ? colors.primary : colors.mutedForeground },
              ]}
            >
              {member.streak}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function CirclesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const circles = useCircles(Boolean(session));
  const create = useCreateCircle();
  const join = useJoinCircle();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const runCreate = async () => {
    setError(null);
    setNote(null);
    if (!name.trim()) {
      setError("Give the circle a name.");
      return;
    }
    try {
      const result = await create.mutateAsync(name.trim());
      setName("");
      setNote(`"${result.circle.name}" is ready. Share code ${result.circle.inviteCode}.`);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "The circle could not be created.");
    }
  };

  const runJoin = async () => {
    setError(null);
    setNote(null);
    if (!code.trim()) {
      setError("Enter the code someone shared.");
      return;
    }
    try {
      const result = await join.mutateAsync(code.trim().toUpperCase());
      setCode("");
      setNote(`Joined "${result.circle.name}".`);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "The code could not be used.");
    }
  };

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
        <Pressable
          onPress={back}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <ArrowLeft size={14} color={colors.mutedForeground} strokeWidth={2.2} />
          <Text style={[typography.meta, { color: colors.mutedForeground }]}>Back</Text>
        </Pressable>
        <Text style={[typography.meta, { color: colors.mutedForeground }]}>STUDY CIRCLES</Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <DoubleRule />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          session ? (
            <RefreshControl
              refreshing={circles.isRefetching && !circles.isLoading}
              onRefresh={() => void circles.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.card}
            />
          ) : undefined
        }
      >
        <Text
          style={[
            typography.display,
            { color: colors.foreground, fontSize: 32, lineHeight: 34, marginTop: spacing.md },
          ]}
        >
          Three people who{"\n"}notice when you stop.
        </Text>
        <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: spacing.sm }]}>
          A circle shares a code, not an inbox. Everyone sees a display name, today's count and a
          streak — never an email address or a score.
        </Text>

        {!session ? (
          <EmptyState
            icon={<Users size={26} color={colors.mutedForeground} strokeWidth={1.5} />}
            title="Sign in to start one"
            body="Circles live with your account so the streak follows you to another phone."
            action={
              <ActionButton
                label="Sign in or create an account"
                variant="solid"
                onPress={() => router.replace("/account")}
              />
            }
          />
        ) : (
          <>
            <View
              style={{
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                backgroundColor: colors.card,
                borderRadius: radius.sm,
                padding: spacing.md,
                marginTop: spacing.lg,
              }}
            >
              <Text style={[typography.kicker, { color: colors.primary }]}>START A CIRCLE</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. LBSNAA 2027"
                placeholderTextColor={colors.mutedForeground}
                maxLength={60}
                style={{
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  fontFamily: fonts.sans,
                  fontSize: 14,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 10,
                  marginTop: spacing.sm,
                }}
              />
              <ActionButton
                label="Create"
                variant="outline"
                icon={<Plus size={13} color={colors.foreground} strokeWidth={2.2} />}
                loading={create.isPending}
                onPress={() => void runCreate()}
                style={{ marginTop: spacing.sm }}
              />
            </View>

            <View
              style={{
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                backgroundColor: colors.card,
                borderRadius: radius.sm,
                padding: spacing.md,
                marginTop: spacing.md,
              }}
            >
              <Text style={[typography.kicker, { color: colors.primary }]}>JOIN WITH A CODE</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                <TextInput
                  value={code}
                  onChangeText={(value) => setCode(value.toUpperCase())}
                  placeholder="ABCD1234"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={12}
                  style={{
                    flex: 1,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    fontFamily: fonts.mono,
                    fontSize: 15,
                    letterSpacing: 2,
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 10,
                  }}
                />
                <ActionButton
                  label="Join"
                  variant="solid"
                  loading={join.isPending}
                  onPress={() => void runJoin()}
                />
              </View>
            </View>

            {error ? <ErrorNote message={error} /> : null}
            {note ? (
              <Text style={[typography.summary, { color: colors.success, marginTop: spacing.sm }]}>
                {note}
              </Text>
            ) : null}

            {circles.isLoading ? (
              <WireSkeleton rows={3} />
            ) : circles.error ? (
              <ErrorNote
                message={
                  circles.error instanceof ApiError
                    ? circles.error.message
                    : "Your circles could not be read."
                }
                onRetry={() => void circles.refetch()}
              />
            ) : circles.data?.circles.length ? (
              circles.data.circles.map((circle) => <CircleCard key={circle.id} circle={circle} />)
            ) : (
              <Text
                style={[
                  typography.summary,
                  { color: colors.mutedForeground, marginTop: spacing.xl },
                ]}
              >
                No circles yet. Create one and send the code to two people who are serious about the
                same exam.
              </Text>
            )}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                marginTop: spacing.xl,
              }}
            >
              <ChevronRight size={13} color={colors.border} strokeWidth={2} />
              <Text style={[typography.tag, { color: colors.mutedForeground, flex: 1, lineHeight: 15 }]}>
                Streaks update from the account's last synced state. Someone who never signs in
                stays off the board.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
