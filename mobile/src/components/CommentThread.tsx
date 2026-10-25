import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { CommentNode } from "@/api/types";
import { timeAgo } from "@/lib/time";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, spacing, type as typography } from "@/theme/tokens";

function CommentRow({ node, depth }: { node: CommentNode; depth: number }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        marginLeft: Math.min(depth, 4) * 14,
        paddingLeft: depth > 0 ? spacing.sm : 0,
        borderLeftWidth: depth > 0 ? StyleSheet.hairlineWidth : 0,
        borderLeftColor: colors.border,
        paddingVertical: spacing.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <Text style={[typography.meta, { color: colors.foreground, letterSpacing: 0.4 }]}>
          {node.author}
        </Text>
        <Text style={{ color: colors.border, fontSize: 10 }}>·</Text>
        <Text style={[typography.meta, { color: colors.mutedForeground }]}>
          {timeAgo(node.createdAt)}
        </Text>
      </View>

      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 13.5,
          lineHeight: 21,
          color: colors.foreground,
        }}
      >
        {node.body}
      </Text>

      {node.children.map((child) => (
        <CommentRow key={child.id} node={child} depth={depth + 1} />
      ))}
    </View>
  );
}

/** Threaded discussion, indented four levels deep at most. */
export function CommentThread({ nodes }: { nodes: CommentNode[] }) {
  return (
    <View>
      {nodes.map((node) => (
        <CommentRow key={node.id} node={node} depth={0} />
      ))}
    </View>
  );
}
