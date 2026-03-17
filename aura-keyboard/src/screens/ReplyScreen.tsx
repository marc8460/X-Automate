import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { colors, spacing } from "../lib/theme";
import { generateReply } from "../lib/api";

export function ReplyScreen() {
  const [chatContext, setChatContext] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!chatContext.trim()) {
      Alert.alert("Context Required", "Paste the chat messages you want to reply to.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await generateReply(chatContext, customInstruction || undefined);
      setResult(data.reply);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Unknown error");
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (result) {
      await Clipboard.setStringAsync(result);
      Alert.alert("Copied!", "Reply copied to clipboard. Paste it in your DM.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Generate DM Reply</Text>
      <Text style={styles.description}>
        Paste the chat messages below. AI will generate a reply matching your persona.
      </Text>

      <Text style={styles.label}>Chat Context</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Paste the conversation here..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={6}
        value={chatContext}
        onChangeText={setChatContext}
      />

      <Text style={styles.label}>Custom Instruction (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. be extra flirty, keep it short..."
        placeholderTextColor={colors.textMuted}
        value={customInstruction}
        onChangeText={setCustomInstruction}
      />

      <TouchableOpacity
        style={[styles.generateBtn, loading && styles.btnDisabled]}
        onPress={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.generateBtnText}>Generate Reply</Text>
        )}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Generated Reply</Text>
          <Text style={styles.resultText}>{result}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Text style={styles.copyBtnText}>Copy to Clipboard</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  heading: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  description: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.xs, textTransform: "uppercase", letterSpacing: 0.5 },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  generateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resultCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
  },
  resultLabel: { fontSize: 12, fontWeight: "600", color: colors.primary, marginBottom: spacing.sm, textTransform: "uppercase" },
  resultText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  copyBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  copyBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
