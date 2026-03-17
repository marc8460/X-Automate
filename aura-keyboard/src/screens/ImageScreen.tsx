import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, FlatList, Image,
  StyleSheet, ActivityIndicator, Alert, Dimensions,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { colors, spacing } from "../lib/theme";
import { fetchMediaVault } from "../lib/api";

interface MediaItem {
  id: number;
  url: string;
  mood: string;
  outfit: string;
  folderId: number | null;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = spacing.sm;
const COLUMNS = 3;
const IMAGE_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

export function ImageScreen() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadImages = async () => {
    setLoading(true);
    try {
      const data = await fetchMediaVault();
      setItems(data);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Unknown error");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleSelect = async (item: MediaItem) => {
    setSelectedId(item.id);
    await Clipboard.setStringAsync(item.url);
    Alert.alert("Image URL Copied!", "The image URL has been copied to your clipboard. You can paste it in your conversation.");
    setTimeout(() => setSelectedId(null), 2000);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Media Vault...</Text>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📷</Text>
        <Text style={styles.emptyText}>No images in your Media Vault</Text>
        <Text style={styles.emptySubtext}>Upload images via the Aura webapp first</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadImages}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Insert from Media Vault</Text>
        <Text style={styles.description}>
          Tap an image to copy its URL. {items.length} images available.
        </Text>
      </View>
      <FlatList
        data={items}
        numColumns={COLUMNS}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.imageCard, selectedId === item.id && styles.imageSelected]}
            onPress={() => handleSelect(item)}
          >
            <Image source={{ uri: item.url }} style={styles.image} />
            {selectedId === item.id && (
              <View style={styles.checkOverlay}>
                <Text style={styles.checkIcon}>✓</Text>
              </View>
            )}
            <View style={styles.imageMeta}>
              <Text style={styles.imageMetaText} numberOfLines={1}>{item.mood}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  heading: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  description: { fontSize: 14, color: colors.textMuted },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  row: { gap: GRID_GAP, marginBottom: GRID_GAP },
  imageCard: {
    width: IMAGE_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  imageSelected: {
    borderColor: colors.success,
  },
  image: {
    width: "100%",
    height: IMAGE_SIZE,
    backgroundColor: colors.surface,
  },
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34,197,94,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkIcon: { fontSize: 28, color: "#fff", fontWeight: "700" },
  imageMeta: {
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  imageMetaText: { fontSize: 10, color: colors.textMuted },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  loadingText: { color: colors.textMuted, marginTop: spacing.md, fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text },
  emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  refreshBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshBtnText: { color: "#fff", fontWeight: "600" },
});
