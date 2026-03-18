import path from "path";
import sharp from "sharp";
import { storage } from "./storage";

function detectAspectRatio(width: number, height: number): string {
  const r = width / height;
  if (r < 0.65) return "9:16";
  if (r < 0.9) return "4:5";
  if (r < 1.15) return "1:1";
  return "16:9";
}

export async function backfillMediaAspectRatios(userId?: string): Promise<void> {
  try {
    const allMedia = userId
      ? await storage.getMediaItems(userId)
      : await storage.getAllMediaItems();

    const needsBackfill = allMedia.filter((m: any) => !m.aspectRatio);
    if (needsBackfill.length === 0) return;

    console.log(`[mediaRatioBackfill] Backfilling ${needsBackfill.length} media items...`);
    let updated = 0;

    for (const item of needsBackfill) {
      const filePath = path.join(process.cwd(), item.url.startsWith("/") ? item.url.slice(1) : item.url);
      try {
        const meta = await sharp(filePath).metadata();
        if (meta.width && meta.height) {
          const aspectRatio = detectAspectRatio(meta.width, meta.height);
          await storage.updateMediaItem(item.id, { aspectRatio }, item.userId ?? "");
          updated++;
        }
      } catch (_) {}
    }

    console.log(`[mediaRatioBackfill] Updated ${updated}/${needsBackfill.length} items`);
  } catch (err) {
    console.error("[mediaRatioBackfill] Error:", err);
  }
}
