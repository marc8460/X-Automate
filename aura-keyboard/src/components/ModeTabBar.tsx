import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../lib/theme";

export type Mode = "reply" | "comment" | "image";

interface ModeTabBarProps {
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
}

const tabs: { mode: Mode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: "reply", label: "Reply", icon: "chatbubble-outline" },
  { mode: "comment", label: "Comment", icon: "flame-outline" },
  { mode: "image", label: "Image", icon: "image-outline" },
];

export function ModeTabBar({ activeMode, onModeChange }: ModeTabBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = activeMode === tab.mode;
        return (
          <TouchableOpacity
            key={tab.mode}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onModeChange(tab.mode)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={active ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.primary,
  },
});
