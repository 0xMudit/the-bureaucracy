import { Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius, spacing, type as typography } from "@/theme/tokens";

/**
 * The one text field in the account office. `secure` adds the reveal toggle so
 * a reader can check a password before committing to it — on a phone keyboard,
 * typos are the norm, not the exception.
 */
export function Field({
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
  autoComplete?: TextInputProps["autoComplete"];
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
          <Pressable
            onPress={() => setHidden((current) => !current)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
          >
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
