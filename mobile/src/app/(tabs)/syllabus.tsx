import { useRouter } from "expo-router";
import { ChevronRight, Library, Radar } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { OptionalSubject, Topic } from "@/api/types";
import { useTaxonomy } from "@/api/hooks";
import {
  ActionButton,
  Divider,
  DoubleRule,
  EmptyState,
  ErrorNote,
  Panel,
  Screen,
  TagList,
  WireSkeleton,
} from "@/components/ui";
import {
  coverageLabel,
  coverageRows,
  coverageSummary,
  COVERAGE_WINDOW_DAYS,
  type CoverageRow,
} from "@/lib/coverage";
import { setFilters } from "@/lib/filters";
import { useProgress } from "@/lib/progress";
import { useTheme, type ThemeMode } from "@/theme/ThemeProvider";
import { fonts, radius, spacing, type as typography } from "@/theme/tokens";

type Row =
  | { kind: "topic"; topic: Topic }
  | { kind: "optional"; optional: OptionalSubject };

interface Section {
  key: string;
  title: string;
  subtitle?: string;
  data: Row[];
}

function statusColor(status: CoverageRow["status"], colors: ReturnType<typeof useTheme>["colors"]): string {
  if (status === "fresh") return colors.success;
  if (status === "stale") return colors.warn;
  if (status === "cold") return colors.primary;
  return colors.border;
}

/**
 * The long-term hook: a gap is more useful than a count, because it names the
 * paper the reader is drifting away from.
 */
function CoverageCard({
  topics,
  onScope,
}: {
  topics: { id: string; label: string }[];
  onScope: (topicId: string) => void;
}) {
  const { colors } = useTheme();
  const progress = useProgress();
  const rows = coverageRows(topics);
  const summary = coverageSummary(rows);

  if (progress.totalRead === 0) return null;
  const weakest = rows
    .filter((row) => row.status !== "fresh")
    .slice(0, 3);

  return (
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Radar size={13} color={colors.primary} strokeWidth={2} />
        <Text style={[typography.kicker, { color: colors.primary, flex: 1 }]}>
          COVERAGE · LAST {COVERAGE_WINDOW_DAYS} DAYS
        </Text>
        <Text style={[typography.meta, { color: colors.mutedForeground }]}>
          {summary.touched}/{summary.total} TOUCHED
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 3, marginTop: spacing.sm }}>
        {rows.map((row) => (
          <View
            key={row.id}
            style={{
              flex: 1,
              height: 4,
              backgroundColor: statusColor(row.status, colors),
              opacity: row.status === "untouched" ? 0.45 : 1,
            }}
          />
        ))}
      </View>

      {summary.worst ? (
        <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: spacing.sm }]}>
          Coldest: {summary.worst.label} · {coverageLabel(summary.worst).toLowerCase()}. The gap is
          the syllabus, not a failure.
        </Text>
      ) : (
        <Text style={[typography.summary, { color: colors.success, marginTop: spacing.sm }]}>
          Every theme touched in the last {COVERAGE_WINDOW_DAYS} days. Keep the rotation.
        </Text>
      )}

      {weakest.length ? (
        <View style={{ marginTop: spacing.sm }}>
          {weakest.map((row) => (
            <Pressable
              key={row.id}
              onPress={() => onScope(row.id)}
              accessibilityRole="button"
              accessibilityLabel={`Read the wire for ${row.label}`}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                paddingVertical: 7,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <View
                style={{
                  width: 3,
                  alignSelf: "stretch",
                  backgroundColor: statusColor(row.status, colors),
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[typography.ui, { color: colors.foreground }]}>{row.label}</Text>
                <Text style={[typography.tag, { color: colors.mutedForeground, marginTop: 1 }]}>
                  {row.reads} READ · {coverageLabel(row).toUpperCase()}
                </Text>
              </View>
              <ChevronRight size={13} color={colors.border} strokeWidth={2.2} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ThemePicker() {
  const { colors, mode, setMode } = useTheme();
  const options: { id: ThemeMode; label: string }[] = [
    { id: "system", label: "System" },
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ];

  return (
    <Panel title="Appearance">
      <View style={{ flexDirection: "row", gap: spacing.xs }}>
        {options.map((option) => {
          const active = option.id === mode;
          return (
            <Pressable
              key={option.id}
              onPress={() => setMode(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                paddingVertical: 7,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.accent : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={[
                  typography.tag,
                  { color: active ? colors.primary : colors.mutedForeground, fontSize: 9 },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[typography.tag, { color: colors.mutedForeground, fontSize: 8.5, marginTop: spacing.sm }]}>
        Matches the paper: warm stock in light, ink in dark.
      </Text>
    </Panel>
  );
}

export default function SyllabusScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const taxonomy = useTaxonomy();

  const scopeTo = useCallback(
    (patch: { topic?: string; optional?: string }) => {
      setFilters({ topic: "all", optional: "all", paper: "all", q: "", ...patch });
      router.navigate("/");
    },
    [router],
  );

  const sections = useMemo<Section[]>(() => {
    const data = taxonomy.data;
    if (!data) return [];

    const byPaper: Section[] = data.papers
      .map((paper) => ({
        key: paper.id,
        title: paper.label,
        subtitle: paper.description,
        data: data.topics
          .filter((topic) => topic.paper === paper.id)
          .map((topic) => ({ kind: "topic" as const, topic })),
      }))
      .filter((section) => section.data.length > 0);

    return [
      ...byPaper,
      {
        key: "optional",
        title: "Optional subjects",
        subtitle:
          "Six lenses for the optional paper. A story can be general current affairs and optional material at the same time.",
        data: data.optionals.map((optional) => ({ kind: "optional" as const, optional })),
      },
    ];
  }, [taxonomy.data]);

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === "topic") {
      const { topic } = item;
      return (
        <Pressable
          onPress={() => scopeTo({ topic: topic.id })}
          accessibilityRole="button"
          accessibilityLabel={`Open the wire scoped to ${topic.label}`}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            paddingVertical: spacing.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.ui, { color: colors.foreground, fontSize: 14.5 }]}>
              {topic.label}
            </Text>
            <Text
              numberOfLines={2}
              style={[
                typography.summary,
                { color: colors.mutedForeground, marginTop: 3, fontSize: 12, lineHeight: 17 },
              ]}
            >
              {topic.why}
            </Text>
            <View style={{ marginTop: 6 }}>
              <TagList labels={topic.cues.slice(0, 3)} />
            </View>
          </View>
          <ChevronRight size={15} color={colors.border} strokeWidth={2.2} />
        </Pressable>
      );
    }

    const { optional } = item;
    return (
      <Pressable
        onPress={() => scopeTo({ optional: optional.id })}
        accessibilityRole="button"
        accessibilityLabel={`Open the wire scoped to ${optional.label}`}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingVertical: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[typography.ui, { color: colors.foreground, fontSize: 14.5 }]}>
              {optional.label}
            </Text>
            <Text style={[typography.tag, { color: colors.primary, fontSize: 8 }]}>
              {optional.short}
            </Text>
          </View>
          <Text
            numberOfLines={2}
            style={[
              typography.summary,
              { color: colors.mutedForeground, marginTop: 3, fontSize: 12, lineHeight: 17 },
            ]}
          >
            {optional.description}
          </Text>
        </View>
        <ChevronRight size={15} color={colors.border} strokeWidth={2.2} />
      </Pressable>
    );
  };

  let body: React.ReactNode;

  if (taxonomy.isLoading) {
    body = <WireSkeleton rows={5} />;
  } else if (taxonomy.error) {
    body = (
      <>
        <ErrorNote
          message="The syllabus map could not be loaded."
          onRetry={() => void taxonomy.refetch()}
        />
        <EmptyState
          icon={<Library size={26} color={colors.mutedForeground} strokeWidth={1.5} />}
          title="Offline"
          body="The taxonomy is fetched once and then kept on the device. Reconnect and retry to file it."
          action={<ActionButton label="Retry" onPress={() => void taxonomy.refetch()} />}
        />
      </>
    );
  } else {
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(row) => (row.kind === "topic" ? `t:${row.topic.id}` : `o:${row.optional.id}`)}
        contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          taxonomy.data ? (
            <CoverageCard
              topics={taxonomy.data.topics}
              onScope={(topicId) => scopeTo({ topic: topicId })}
            />
          ) : undefined
        }
        renderItem={renderRow}
        renderSectionHeader={({ section }) => (
          <View style={{ backgroundColor: colors.background, paddingTop: spacing.lg }}>
            <Text style={[typography.display, { color: colors.foreground, fontSize: 19, lineHeight: 22 }]}>
              {section.title}
            </Text>
            {section.subtitle ? (
              <Text
                style={[
                  typography.summary,
                  { color: colors.mutedForeground, marginTop: 3, fontSize: 12, lineHeight: 17 },
                ]}
              >
                {section.subtitle}
              </Text>
            ) : null}
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginTop: spacing.sm }} />
          </View>
        )}
        ListFooterComponent={
          <View style={{ gap: spacing.md, paddingTop: spacing.xl }}>
            <ThemePicker />
            <Panel title="How this is filed">
              <Text style={[typography.summary, { color: colors.mutedForeground, lineHeight: 19 }]}>
                Twelve themes across Prelims, GS I–IV and Essay; six optional lenses. The classifier
                runs on the server at ingest time, so a story arrives here already mapped — the phone
                only renders what the web app ranked.
              </Text>
            </Panel>
            <View
              style={{
                borderWidth: StyleSheet.hairlineWidth,
                borderStyle: "dashed",
                borderColor: colors.border,
                padding: spacing.md,
              }}
            >
              <Text style={[typography.tag, { color: colors.mutedForeground, fontSize: 9, lineHeight: 15 }]}>
                The same backend serves the app and the website: the ranked wire, the taxonomy and the
                vote tally all come from one deployment.
              </Text>
            </View>
            <Divider />
            <Text
              style={{
                fontFamily: fonts.mono,
                fontSize: 8,
                letterSpacing: 1,
                color: colors.mutedForeground,
                textAlign: "center",
              }}
            >
              THE BUREAUCRACY · CIVIL-SERVICES INTELLIGENCE, RANKED
            </Text>
          </View>
        }
      />
    );
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text
          style={{
            fontFamily: fonts.monoMedium,
            fontSize: 12.5,
            letterSpacing: 2.6,
            color: colors.foreground,
          }}
        >
          THE BUREAUCRACY
        </Text>
        <Text
          style={[
            typography.display,
            { color: colors.foreground, fontSize: 27, lineHeight: 30, marginTop: spacing.xs },
          ]}
        >
          The syllabus
        </Text>
        <Text style={[typography.summary, { color: colors.mutedForeground, marginTop: 3 }]}>
          {taxonomy.data
            ? `${taxonomy.data.topics.length} themes · ${taxonomy.data.optionals.length} optional lenses · ${taxonomy.data.windowHours}-hour wire`
            : "The map the wire is ranked against."}
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <DoubleRule />
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>{body}</View>
    </Screen>
  );
}
