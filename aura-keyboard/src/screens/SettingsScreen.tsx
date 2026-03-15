import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../lib/theme";
import { getToken, setToken, getBaseUrl, setBaseUrl, testConnection, clearToken, fetchPersona } from "../lib/api";

interface SettingsScreenProps {
  onBack: () => void;
  onConnectionChange: (connected: boolean) => void;
}

export function SettingsScreen({ onBack, onConnectionChange }: SettingsScreenProps) {
  const [serverUrl, setServerUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [persona, setPersona] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const url = await getBaseUrl();
      const token = await getToken();
      setServerUrl(url);
      setApiToken(token || "");
      if (url && token) {
        const ok = await testConnection();
        setConnected(ok);
        if (ok) {
          try {
            const p = await fetchPersona();
            setPersona(p);
          } catch {}
        }
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!serverUrl.trim() || !apiToken.trim()) {
      Alert.alert("Required", "Both server URL and API token are required.");
      return;
    }
    setTesting(true);
    await setBaseUrl(serverUrl.trim());
    await setToken(apiToken.trim());

    const ok = await testConnection();
    setConnected(ok);
    onConnectionChange(ok);

    if (ok) {
      try {
        const p = await fetchPersona();
        setPersona(p);
      } catch {}
      Alert.alert("Connected!", "Aura Keyboard is connected to your dashboard.");
    } else {
      Alert.alert("Connection Failed", "Check your server URL and API token.");
    }
    setTesting(false);
  };

  const handleDisconnect = async () => {
    await clearToken();
    setApiToken("");
    setConnected(false);
    setPersona(null);
    onConnectionChange(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Settings</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={[styles.statusDot, connected ? styles.statusGreen : styles.statusRed]} />
        <Text style={styles.statusText}>
          {connected ? "Connected to Aura" : "Not Connected"}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Connection</Text>

      <Text style={styles.label}>Aura Server URL</Text>
      <TextInput
        style={styles.input}
        placeholder="https://your-app.replit.app"
        placeholderTextColor={colors.textMuted}
        value={serverUrl}
        onChangeText={setServerUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Text style={styles.label}>API Token</Text>
      <TextInput
        style={styles.input}
        placeholder="aura_mob_..."
        placeholderTextColor={colors.textMuted}
        value={apiToken}
        onChangeText={setApiToken}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />

      <Text style={styles.hint}>
        Generate an API token in your Aura dashboard under Settings → Mobile API Tokens.
      </Text>

      <TouchableOpacity
        style={[styles.saveBtn, testing && styles.btnDisabled]}
        onPress={handleSave}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Save & Test Connection</Text>
        )}
      </TouchableOpacity>

      {connected && (
        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
          <Text style={styles.disconnectBtnText}>Disconnect</Text>
        </TouchableOpacity>
      )}

      {persona && (
        <View style={styles.personaCard}>
          <Text style={styles.sectionTitle}>Active Persona</Text>
          <View style={styles.personaRow}>
            <Text style={styles.personaLabel}>Seductiveness</Text>
            <Text style={styles.personaValue}>{persona.seductiveness}%</Text>
          </View>
          <View style={styles.personaRow}>
            <Text style={styles.personaLabel}>Playfulness</Text>
            <Text style={styles.personaValue}>{persona.playfulness}%</Text>
          </View>
          <View style={styles.personaRow}>
            <Text style={styles.personaLabel}>Dominance</Text>
            <Text style={styles.personaValue}>{persona.dominance}%</Text>
          </View>
          {persona.emojiStyle && (
            <View style={styles.personaRow}>
              <Text style={styles.personaLabel}>Emoji Style</Text>
              <Text style={styles.personaValue}>{persona.emojiStyle}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  backBtn: { padding: spacing.xs },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusGreen: { backgroundColor: colors.success },
  statusRed: { backgroundColor: colors.error },
  statusText: { fontSize: 14, color: colors.text, fontWeight: "500" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.xs, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 18 },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disconnectBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  disconnectBtnText: { color: colors.error, fontSize: 14, fontWeight: "600" },
  personaCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  personaLabel: { fontSize: 14, color: colors.textMuted },
  personaValue: { fontSize: 14, color: colors.text, fontWeight: "600" },
});
