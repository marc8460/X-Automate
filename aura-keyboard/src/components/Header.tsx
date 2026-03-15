import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../lib/theme";

interface HeaderProps {
  onSettings: () => void;
}

export function Header({ onSettings }: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.logo}>✦</Text>
        <Text style={styles.title}>Aura Keyboard</Text>
      </View>
      <TouchableOpacity onPress={onSettings} style={styles.settingsBtn}>
        <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    fontSize: 20,
    color: colors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  settingsBtn: {
    padding: spacing.xs,
  },
});
