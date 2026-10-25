import { useRouter } from "expo-router";
import { Newspaper } from "lucide-react-native";
import React from "react";
import { ActionButton, EmptyState, Screen } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <EmptyState
        icon={<Newspaper size={26} color={colors.mutedForeground} strokeWidth={1.5} />}
        title="Nothing filed here"
        body="That link does not point at a page in this edition. The wire itself is one tap away."
        action={<ActionButton label="Back to the wire" variant="solid" onPress={() => router.replace("/")} />}
      />
    </Screen>
  );
}
