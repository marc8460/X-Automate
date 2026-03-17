import { storage } from "./storage";
import { getTwitterClientForUser } from "./twitter";
import { getThreadsAccessTokenForUser, createThreadsPost } from "./threads";
import { broadcastUpdate } from "./engagementPoller";
import { db } from "./db";
import { contentItems, type ContentItem } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const POLL_INTERVAL_MS = 30_000;

function isValidImageSource(url: string): boolean {
  if (url.startsWith("/uploads/")) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".internal") || host.startsWith("10.") || host.startsWith("192.168.") || host.match(/^172\.(1[6-9]|2\d|3[0-1])\./)) return false;
    return true;
  } catch {
    return false;
  }
}

async function loadImageBuffer(imageUrl: string): Promise<Buffer | null> {
  if (!isValidImageSource(imageUrl)) return null;
  try {
    if (imageUrl.startsWith("/uploads/")) {
      const safePath = path.join(process.cwd(), "uploads", path.basename(imageUrl));
      return await fs.promises.readFile(safePath);
    }
    const response = await fetch(imageUrl);
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function postContentItem(item: ContentItem): Promise<void> {
  const userId = item.userId;
  const postText = item.caption || item.hook;
  const targetPlatform = item.platform === "both" ? "x" : item.platform;

  try {
    if (targetPlatform === "threads") {
      const token = await getThreadsAccessTokenForUser(userId);
      let threadsImageUrl = item.imageUrl || undefined;
      if (threadsImageUrl && threadsImageUrl.startsWith("/uploads/")) {
        const host = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + "." + process.env.REPL_OWNER + ".repl.co";
        threadsImageUrl = `https://${host}${threadsImageUrl}`;
      }
      await createThreadsPost(postText, threadsImageUrl, token);
    } else {
      const twitterClient = await getTwitterClientForUser(userId);
      if (!twitterClient) {
        await storage.updateContentItem(item.id, { status: "failed", failReason: "X account not connected" }, userId);
        return;
      }
      let mediaId: string | undefined;
      if (item.imageUrl) {
        const imageBuffer = await loadImageBuffer(item.imageUrl);
        if (imageBuffer) {
          try {
            const mimeType = item.imageUrl.endsWith(".png") ? "image/png" : "image/jpeg";
            mediaId = await twitterClient.v1.uploadMedia(imageBuffer, { mimeType });
          } catch (mediaErr: unknown) {
            console.error(`[content-scheduler] Media upload failed for item ${item.id}:`, mediaErr instanceof Error ? mediaErr.message : mediaErr);
          }
        }
      }
      const tweetPayload: { text: string; media?: { media_ids: string[] } } = { text: postText };
      if (mediaId) tweetPayload.media = { media_ids: [mediaId] };
      await twitterClient.v2.tweet(tweetPayload);
    }

    await storage.updateContentItem(item.id, { status: "posted" }, userId);
    await db.update(contentItems).set({ postedAt: new Date() }).where(eq(contentItems.id, item.id));
    await storage.createActivityLog({
      userId,
      action: `${targetPlatform === "threads" ? "Threads" : "X"} Post Published (Scheduled)`,
      detail: postText.slice(0, 60) + (postText.length > 60 ? "…" : ""),
      time: new Date().toISOString(),
      status: "success",
    });
    const today = new Date().toLocaleDateString("en-CA");
    await storage.logActivityEvent({ userId, platform: targetPlatform, action: "post_created", localDate: today });
    broadcastUpdate({ type: "daily-goals-update" });

    if (item.platform === "both") {
      try {
        const otherPlatform = targetPlatform === "x" ? "threads" : "x";
        if (otherPlatform === "threads") {
          const token = await getThreadsAccessTokenForUser(userId);
          let crossImageUrl = item.imageUrl || undefined;
          if (crossImageUrl && crossImageUrl.startsWith("/uploads/")) {
            const host = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + "." + process.env.REPL_OWNER + ".repl.co";
            crossImageUrl = `https://${host}${crossImageUrl}`;
          }
          await createThreadsPost(postText, crossImageUrl, token);
        } else {
          const tc = await getTwitterClientForUser(userId);
          if (tc) await tc.v2.tweet({ text: postText });
        }
        await storage.logActivityEvent({ userId, platform: otherPlatform, action: "post_created", localDate: today });
      } catch (crossErr: unknown) {
        console.error(`[content-scheduler] Cross-post failed for item ${item.id}:`, crossErr instanceof Error ? crossErr.message : crossErr);
      }
    }

    console.log(`[content-scheduler] Posted item ${item.id} to ${item.platform}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await storage.updateContentItem(item.id, { status: "failed", failReason: message }, userId);
    console.error(`[content-scheduler] Failed to post item ${item.id}:`, message);
  }
}

async function tick(): Promise<void> {
  try {
    const dueItems = await storage.claimScheduledContentDue();
    for (const item of dueItems) {
      await postContentItem(item);
    }
  } catch (err: unknown) {
    console.error("[content-scheduler] tick error:", err instanceof Error ? err.message : err);
  }
}

export function startContentScheduler(): void {
  console.log("[content-scheduler] Started, polling every 30s");
  setInterval(tick, POLL_INTERVAL_MS);
  setTimeout(tick, 5000);
}
