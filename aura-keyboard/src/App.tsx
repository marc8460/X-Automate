import React, { useState, useEffect } from "react";
import { SafeAreaView, StatusBar, StyleSheet, View, Text } from "react-native";
import { Header } from "./components/Header";
import { ModeTabBar, Mode } from "./components/ModeTabBar";
import { ReplyScreen } from "./screens/ReplyScreen";
import { CommentScreen } from "./screens/CommentScreen";
import { ImageScreen } from "./screens/ImageScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { colors } from "./lib/theme";
import { getToken, getBaseUrl, testConnection } from "./lib/api";

export default function App() {
  const [activeMode, setActiveMode] = useState<Mode>("reply");
  const [showSettings, setShowSettings] = useState(false);
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const url = await getBaseUrl();
      if (token && url) {
        const ok = await testConnection();
        setConnected(ok);
        if (!ok) setShowSettings(true);
      } else {
        setShowSettings(true);
      }
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingLogo}>✦</Text>
          <Text style={styles.loadingText}>Aura Keyboard</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showSettings) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <SettingsScreen
          onBack={() => {
            if (connected) setShowSettings(false);
          }}
          onConnectionChange={(ok) => {
            setConnected(ok);
            if (ok) setShowSettings(false);
          }}
        />
      </SafeAreaView>
    );
  }

  const renderMode = () => {
    switch (activeMode) {
      case "reply":
        return <ReplyScreen />;
      case "comment":
        return <CommentScreen />;
      case "image":
        return <ImageScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Header onSettings={() => setShowSettings(true)} />
      <ModeTabBar activeMode={activeMode} onModeChange={setActiveMode} />
      <View style={styles.content}>{renderMode()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingLogo: {
    fontSize: 48,
    color: colors.primary,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
});
