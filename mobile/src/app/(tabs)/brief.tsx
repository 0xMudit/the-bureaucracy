import { useRouter } from "expo-router";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Circle,
  Clock3,
  Flame,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BriefEntry, QuizQuestion } from "@/api/types";
import { useBrief } from "@/api/hooks";
import { ActionButton, DoubleRule, EmptyState, ErrorNote, WireSkeleton } from "@/components/ui";
import { useDesk } from "@/lib/desk";
import {
  completeBrief,
  humanDate,
  istDateKey,
  readBrief,
  recordQuiz,
  useProgress,
  writeBrief,
} from "@/lib/progress";
import { enablePush, permissionGranted, pushConfigured } from "@/lib/notifications";
import { readJson, writeJson } from "@/lib/storage";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, priorityColor, radius, spacing, type as typography } from "@/theme/tokens";

const PUSH_PROMPT_KEY = "tb.push.prompt.v2";

/* --------------------------------- header --------------------------------- */

function BriefHeader({ dateKey }: { dateKey: string }) {
  const { colors } = useTheme();
  const { desk } = useDesk();

  return (
    <View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[typography.kicker, { color: colors.primary }]}>THE DAILY BRIEF</Text>
          <Text style={[typography.meta, { color: colors.mutedForeground }]}>
            {humanDate(dateKey)}
          </Text>
        </View>
        <Text
          style={[
            typography.display,
            { color: colors.foreground, fontSize: 32, lineHeight: 34, marginTop: 8 },
          ]}
        >
          Five stories.{"\n"}Eight minutes.
        </Text>
        <Text style={[typography.meta, { color: colors.mutedForeground, marginTop: 8 }]}>
          {desk.exam === "state" ? "State PSC" : "UPSC CSE"} ·{" "}
          {desk.stage === "prelims" ? "Prelims" : desk.stage === "mains" ? "Mains" : "Prelims + Mains"}
          {desk.optional === "all" ? "" : " · optional tilt"}
        </Text>
      </View>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <DoubleRule />
      </View>
    </View>
  );
}

/* ---------------------------------- stats --------------------------------- */

function Stat({
  value,
  label,
  accent = false,
}: {
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 26,
          lineHeight: 28,
          color: accent ? colors.primary : colors.foreground,
        }}
      >
        {value}
      </Text>
      <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

/* ---------------------------------- entry --------------------------------- */

function EntryCard({
  entry,
  index,
  read,
  onOpen,
  onToggle,
}: {
  entry: BriefEntry;
  index: number;
  read: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const tone = priorityColor(entry.priority, colors);

  return (
    <View
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Text style={[typography.meta, { color: tone }]}>{String(index + 1).padStart(2, "0")}</Text>
        <Text style={[typography.tag, { color: colors.mutedForeground, flex: 1 }]} numberOfLines={1}>
          {entry.topicLabel}
          {entry.paperLabel ? ` · ${entry.paperLabel}` : ""}
        </Text>
        <Pressable
          onPress={onToggle}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: read }}
          accessibilityLabel={read ? `Mark ${entry.title} unread` : `Mark ${entry.title} read`}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          {read ? (
            <CheckCircle2 size={20} color={colors.success} strokeWidth={2} />
          ) : (
            <Circle size={20} color={colors.mutedForeground} strokeWidth={1.5} />
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={entry.title}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Text
          style={[
            typography.headline,
            {
              color: read ? colors.mutedForeground : colors.foreground,
              fontSize: 21,
              lineHeight: 25,
              marginTop: 6,
            },
          ]}
        >
          {entry.title}
        </Text>
        <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 6 }]}>
          {entry.summary}
        </Text>

        <View
          style={{
            marginTop: spacing.sm,
            borderLeftWidth: 2,
            borderLeftColor: tone,
            paddingLeft: spacing.sm,
          }}
        >
          <Text style={[typography.tag, { color: tone }]}>WHY IT MATTERS</Text>
          <Text style={[typography.summary, { color: colors.foreground, marginTop: 2 }]}>
            {entry.why}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: spacing.sm }}>
          <Text style={[typography.meta, { color: colors.primary }]}>→</Text>
          <Text
            style={[
              typography.summary,
              { color: colors.foreground, flex: 1, fontFamily: fonts.displayItalic, fontSize: 14 },
            ]}
          >
            {entry.hook}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm }}>
          <Text style={[typography.meta, { color: colors.mutedForeground }]}>{entry.source}</Text>
          <ArrowUpRight size={11} color={colors.mutedForeground} strokeWidth={2} />
        </View>
      </Pressable>
    </View>
  );
}

/* ---------------------------------- quiz ---------------------------------- */

function Quiz({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuizQuestion[];
  answers: Record<number, number>;
  onAnswer: (index: number, option: number) => void;
}) {
  const { colors } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const answered = questions.filter((_, index) => answers[index] !== undefined).length;
  const correct = questions.reduce(
    (sum, question, index) => sum + (answers[index] === question.answerIndex ? 1 : 0),
    0,
  );

  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl }}>
      <Text style={[typography.kicker, { color: colors.primary }]}>RETRIEVAL CHECK</Text>
      <Text
        style={[
          typography.display,
          { color: colors.foreground, fontSize: 26, lineHeight: 28, marginTop: 4 },
        ]}
      >
        Two questions, no notes.
      </Text>
      <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 4 }]}>
        Recalling beats re-reading. Answers are explanations, not a scoreboard.
      </Text>

      {questions.map((question, index) => {
        const chosen = answers[index];
        const done = chosen !== undefined || revealed;
        return (
          <View
            key={`${question.label}-${index}`}
            style={{
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: spacing.md,
              marginTop: spacing.md,
              borderRadius: radius.sm,
            }}
          >
            <Text style={[typography.tag, { color: colors.mutedForeground }]}>
              {question.label.toUpperCase()}
            </Text>
            <Text style={[typography.ui, { color: colors.foreground, marginTop: 4, fontSize: 14 }]}>
              {question.prompt}
            </Text>
            {question.options.map((option, optionIndex) => {
              const isChosen = chosen === optionIndex;
              const isAnswer = question.answerIndex === optionIndex;
              const border = done && isAnswer ? colors.success : isChosen ? colors.primary : colors.border;
              return (
                <Pressable
                  key={option}
                  onPress={() => onAnswer(index, optionIndex)}
                  style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 8,
                    marginTop: 6,
                    backgroundColor:
                      done && isAnswer
                        ? colors.secondary
                        : isChosen
                          ? colors.accent
                          : "transparent",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={[typography.summary, { color: colors.foreground }]}>{option}</Text>
                </Pressable>
              );
            })}
            {done ? (
              <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 8 }]}>
                {question.explanation}
              </Text>
            ) : null}
          </View>
        );
      })}

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md }}>
        <ActionButton
          label={revealed ? "Hide answers" : "Reveal answers"}
          variant="outline"
          onPress={() => setRevealed((current) => !current)}
          style={{ flex: 1 }}
        />
        <Text style={[typography.meta, { color: colors.mutedForeground }]}>
          {answered}/{questions.length} answered
        </Text>
      </View>
      {answered === questions.length ? (
        <Text
          style={[
            typography.meta,
            { color: correct === questions.length ? colors.success : colors.primary, marginTop: spacing.sm },
          ]}
        >
          {correct} OF {questions.length} CORRECT · RECORDED
        </Text>
      ) : null}
    </View>
  );
}

/* ------------------------------- push prompt ------------------------------ */

function PushPrompt({ completions }: { completions: number }) {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(true);
  const [granted, setGranted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const hidden = await readJson<boolean>(PUSH_PROMPT_KEY, false);
      setDismissed(hidden);
      setGranted(await permissionGranted());
    })();
  }, []);

  if (!pushConfigured || dismissed || granted || completions < 3) return null;

  const dismiss = () => {
    setDismissed(true);
    writeJson(PUSH_PROMPT_KEY, true);
  };

  return (
    <View
      style={{
        marginHorizontal: spacing.lg,
        marginTop: spacing.xxl,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.primary,
        backgroundColor: colors.accent,
        padding: spacing.md,
        borderRadius: radius.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Bell size={16} color={colors.primary} strokeWidth={2} />
        <Text style={[typography.kicker, { color: colors.primary }]}>THREE BRIEFS IN</Text>
      </View>
      <Text style={[typography.headline, { color: colors.foreground, marginTop: 6 }]}>
        One nudge a day, when the five are ready.
      </Text>
      <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 4 }]}>
        No breaking-news spam, no streak guilt. Turn it off any time.
      </Text>
      {note ? (
        <Text style={[typography.meta, { color: colors.primary, marginTop: 6 }]}>{note}</Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
        <ActionButton
          label={busy ? "Turning on" : "Notify me"}
          variant="solid"
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void enablePush()
              .then((result) => {
                if (result.granted) {
                  setGranted(true);
                  setDismissed(true);
                } else {
                  setNote(result.note);
                }
              })
              .finally(() => setBusy(false));
          }}
          style={{ flex: 1 }}
        />
        <ActionButton label="Not now" variant="ghost" onPress={dismiss} style={{ flex: 1 }} />
      </View>
      {busy ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} /> : null}
    </View>
  );
}

/* --------------------------------- screen --------------------------------- */

export default function BriefScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const brief = useBrief();
  const progress = useProgress();

  const data = brief.data;
  const cached = readBrief(istDateKey());
  const entries = data?.entries ?? cached ?? [];
  const dateKey = data?.dateKey ?? istDateKey();
  const total = entries.length;
  const readCount = entries.filter((entry) => progress.readIds.has(entry.id)).length;
  const done = total > 0 && readCount >= total;
  const [answers, setAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    if (data) writeBrief(data.dateKey, data.entries);
  }, [data]);

  useEffect(() => {
    if (done) completeBrief(dateKey);
  }, [done, dateKey]);

  const questions = useMemo(() => data?.questions ?? [], [data]);

  useEffect(() => {
    if (!questions.length) return;
    const answered = questions.filter((_, index) => answers[index] !== undefined).length;
    if (answered !== questions.length) return;
    const correct = questions.reduce(
      (sum, question, index) => sum + (answers[index] === question.answerIndex ? 1 : 0),
      0,
    );
    recordQuiz(correct, questions.length);
  }, [answers, questions]);

  const open = (entry: BriefEntry) => {
    if (!progress.readIds.has(entry.id)) progress.markRead(entry.id, entry.topicId);
    router.push({ pathname: "/item/[id]", params: { id: entry.id } });
  };

  const firstUnread = entries.find((entry) => !progress.readIds.has(entry.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxxl + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <BriefHeader dateKey={dateKey} />

        <View
          style={{
            flexDirection: "row",
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
          }}
        >
          <Stat value={progress.current} label="DAY STREAK" accent={progress.current > 0} />
          <Stat value={progress.todayRead} label="READ TODAY" />
          <Stat value={progress.briefsCompleted} label="BRIEFS FINISHED" />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
              paddingTop: spacing.sm,
            }}
          >
            <Clock3 size={12} color={colors.mutedForeground} strokeWidth={2} />
            <Text style={[typography.meta, { color: colors.mutedForeground }]}>
              {data?.minutes ?? 8} MIN · {readCount}/{total || 5} READ
            </Text>
            <View style={{ flex: 1 }} />
            {done ? (
              <Text style={[typography.meta, { color: colors.success }]}>FINISHED</Text>
            ) : firstUnread ? (
              <Pressable onPress={() => open(firstUnread)} hitSlop={8}>
                <Text style={[typography.meta, { color: colors.primary }]}>START READING →</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {brief.isLoading && !entries.length ? (
          <WireSkeleton rows={5} />
        ) : brief.error && !entries.length ? (
          <EmptyState
            icon={<Flame size={26} color={colors.mutedForeground} strokeWidth={1.5} />}
            title="The brief is not ready"
            body={
              brief.error instanceof Error
                ? brief.error.message
                : "The wire has not produced today's five yet. Try again in a few minutes."
            }
            action={<ErrorNote message="Tap to retry" onRetry={() => void brief.refetch()} />}
          />
        ) : !entries.length ? (
          <EmptyState
            icon={<Flame size={26} color={colors.mutedForeground} strokeWidth={1.5} />}
            title="Nothing worth your morning yet"
            body="Today's brief is built from the last 24 hours of the wire. The next ingest runs within fifteen minutes."
          />
        ) : (
          <View style={{ marginTop: spacing.sm }}>
            {entries.map((entry, index) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                index={index}
                read={progress.readIds.has(entry.id)}
                onOpen={() => open(entry)}
                onToggle={() => progress.toggleRead(entry.id, entry.topicId)}
              />
            ))}
          </View>
        )}

        {done && questions.length ? (
          <Quiz
            questions={questions}
            answers={answers}
            onAnswer={(index, option) =>
              setAnswers((current) => ({ ...current, [index]: option }))
            }
          />
        ) : entries.length && !done ? (
          <Text
            style={[
              typography.summary,
              {
                color: colors.mutedForeground,
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.xl,
              },
            ]}
          >
            Finish all {total} to unlock today's retrieval check.
          </Text>
        ) : null}

        <PushPrompt completions={progress.briefsCompleted} />

        <Text
          style={[
            typography.tag,
            {
              color: colors.mutedForeground,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.xxl,
              lineHeight: 15,
            },
          ]}
        >
          The brief freezes once it is served. A story that leaves the wire still opens at the
          publisher from your saved list.
        </Text>
      </ScrollView>
    </View>
  );
}
