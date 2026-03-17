import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing } from "../lib/theme";
import { generateComments, analyzeScreenshot } from "../lib/api";

interface Comment {
  text: string;
  viralScore: number;
  strategy: string;
}

export function CommentScreen() {
  const [postContext, setPostContext] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [imageAnalysis, setImageAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyzePost = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setAnalyzing(true);
    try {
      const data = await analyzeScreenshot(result.assets[0].uri);
      setImageAnalysis(data.analysis);
      Alert.alert("Screenshot Analyzed", "Image context has been added to your request.");
    } catch (err) {
      Alert.alert("Analysis Failed", err instanceof Error ? err.message : "Unknown error");
    }
    setAnalyzing(false);
  };

  const handleGenerate = async () => {
    if (!postContext.trim() && !imageAnalysis) {
      Alert.alert("Context Required", "Add post text or analyze a screenshot first.");
      return;
    }
    setLoading(true);
    setComments([]);
    try {
      const data = await generateComments(postContext, imageAnalysis || undefined, customInstruction || undefined);
      setComments(data.comments || []);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Unknown error");
    }
    setLoading(false);
  };

  const handleCopyComment = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied!", "Comment copied to clipboard.");
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.textMuted;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Generate Viral Comment</Text>
      <Text style={styles.description}>
        Paste the post caption or analyze a screenshot. AI generates comments with viral scores.
      </Text>

      <Text style={styles.label}>Post Context</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Paste the post caption or text here..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        value={postContext}
        onChangeText={setPostContext}
      />

      <TouchableOpacity
        style={styles.analyzeBtn}
        onPress={handleAnalyzePost}
        disabled={analyzing}
      >
        {analyzing ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Text style={styles.analyzeBtnText}>
            {imageAnalysis ? "✓ Screenshot Analyzed" : "📸 Analyze Post Screenshot"}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Custom Instruction (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. match their energy, be witty..."
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
          <Text style={styles.generateBtnText}>Generate Viral Comment</Text>
        )}
      </TouchableOpacity>

      {comments.map((c, i) => (
        <TouchableOpacity
          key={i}
          style={styles.commentCard}
          onPress={() => handleCopyComment(c.text)}
        >
          <View style={styles.commentHeader}>
            <Text style={styles.commentStrategy}>{c.strategy}</Text>
            <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(c.viralScore) + "20" }]}>
              <Text style={[styles.scoreText, { color: getScoreColor(c.viralScore) }]}>
                🔥 {c.viralScore}
              </Text>
            </View>
          </View>
          <Text style={styles.commentText}>{c.text}</Text>
          <Text style={styles.tapHint}>Tap to copy</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 100 },
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
    minHeight: 100,
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
  analyzeBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  analyzeBtnText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  generateBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  commentCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  commentStrategy: { fontSize: 12, fontWeight: "600", color: colors.primaryLight, textTransform: "uppercase" },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: { fontSize: 13, fontWeight: "700" },
  commentText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  tapHint: { fontSize: 11, color: colors.textMuted, marginTop: spacing.sm, textAlign: "right" },
});
