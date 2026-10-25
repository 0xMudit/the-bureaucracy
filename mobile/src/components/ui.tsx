import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius, spacing, type } from "@/theme/tokens";

/* --------------------------------- layout --------------------------------- */

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }, style]}>
      {children}
    </View>
  );
}

/** The thick-over-thin rule that separates a masthead from the wire. */
export function DoubleRule({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={style}>
      <View style={{ height: 2, backgroundColor: colors.foreground }} />
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginTop: 3 }} />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />
  );
}

/* ---------------------------------- text ---------------------------------- */

export function Kicker({
  children,
  style,
  muted = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Text
      numberOfLines={1}
      style={[type.kicker, { color: muted ? colors.mutedForeground : colors.primary }, style]}
    >
      {children}
    </Text>
  );
}

export function Meta({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[type.meta, { color: colors.mutedForeground }, style]}
    >
      {children}
    </Text>
  );
}

export function Tag({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "muted" | "primary" | "warn";
}) {
  const { colors } = useTheme();
  const color =
    tone === "primary" ? colors.primary : tone === "warn" ? colors.warn : colors.mutedForeground;
  return (
    <View
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.background,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: radius.sm,
      }}
    >
      <Text style={[type.tag, { color }]}>{label}</Text>
    </View>
  );
}

/* -------------------------------- controls -------------------------------- */

type ButtonVariant = "solid" | "outline" | "ghost";

export function ActionButton({
  label,
  onPress,
  variant = "outline",
  icon,
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  const background =
    variant === "solid" ? colors.primary : variant === "outline" ? "transparent" : "transparent";
  const border = variant === "outline" ? colors.border : "transparent";
  const textColor = variant === "solid" ? colors.primaryForeground : colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          borderRadius: radius.sm,
          borderWidth: variant === "outline" ? StyleSheet.hairlineWidth : 0,
          borderColor: border,
          backgroundColor: background,
          paddingHorizontal: spacing.md,
          paddingVertical: 9,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon}
          <Text style={[type.meta, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  onPress,
  icon,
  label,
  active = false,
}: {
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        padding: 8,
        borderRadius: radius.sm,
        opacity: pressed ? 0.55 : 1,
        backgroundColor: active ? colors.accent : "transparent",
      })}
    >
      {icon}
    </Pressable>
  );
}

/* --------------------------------- states --------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl }}>
      {icon ? <View style={{ marginBottom: spacing.md }}>{icon}</View> : null}
      <Text
        style={[
          type.display,
          { color: colors.foreground, fontSize: 24, lineHeight: 28, textAlign: "center" },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          type.summary,
          {
            color: colors.mutedForeground,
            textAlign: "center",
            marginTop: spacing.sm,
            maxWidth: 320,
          },
        ]}
      >
        {body}
      </Text>
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderLeftWidth: 2,
        borderLeftColor: colors.destructive,
        backgroundColor: colors.card,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
      }}
    >
      <Text style={[type.summary, { color: colors.foreground, flex: 1 }]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <Text style={[type.meta, { color: colors.primary }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* --------------------------------- panels --------------------------------- */

/** A bordered card with a mono caption row — the web's "Syllabus file" box. */
export function Panel({
  title,
  right,
  children,
  style,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={[type.meta, { color: colors.foreground, letterSpacing: 1.4 }]}>{title}</Text>
        {right ?? null}
      </View>
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}>{children}</View>
    </View>
  );
}

/** Answer hooks: an arrow, then the question to carry into the exam. */
export function Hooks({ items }: { items: string[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {items.map((hook) => (
        <View key={hook} style={{ flexDirection: "row", gap: 6 }}>
          <Text style={[type.summary, { color: colors.primary }]}>→</Text>
          <Text style={[type.summary, { color: colors.foreground, flex: 1 }]}>{hook}</Text>
        </View>
      ))}
    </View>
  );
}

export function TagList({ labels, tone = "muted" }: { labels: string[]; tone?: "muted" | "primary" }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
      {labels.map((label) => (
        <Tag key={label} label={label} tone={tone} />
      ))}
    </View>
  );
}

/* -------------------------------- skeleton -------------------------------- */

export function WireSkeleton({ rows = 6 }: { rows?: number }) {
  const { colors } = useTheme();
  return (
    <View>
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={index}
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.lg,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            opacity: 1 - index * 0.12,
          }}
        >
          <View style={{ height: 7, width: 90, backgroundColor: colors.muted, borderRadius: 2 }} />
          <View
            style={{
              height: 16,
              width: `${92 - index * 6}%`,
              backgroundColor: colors.muted,
              borderRadius: 3,
              marginTop: 10,
            }}
          />
          <View
            style={{
              height: 16,
              width: `${58 + (index % 3) * 8}%`,
              backgroundColor: colors.muted,
              borderRadius: 3,
              marginTop: 6,
            }}
          />
          <View
            style={{ height: 8, width: "45%", backgroundColor: colors.muted, borderRadius: 2, marginTop: 12 }}
          />
        </View>
      ))}
    </View>
  );
}
