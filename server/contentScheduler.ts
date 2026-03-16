import { storage } from "./storage";
import { getTwitterClientForUser, getTwitterClient } from "./twitter";
import { getThreadsAccessTokenForUser, createThreadsPost } from "./threads";
import { broadcastUpdate } from "./engagementPoller";
import { db } from "./db";
import { contentItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const POLL_INTERVAL_MS = 30_000;

function isAllowedImageSource(url: string): boolean {
  return url.startsWith("/uploads/") || url.startsWith("https://images.unsplash.com/") || url.startsWith("https://");
}

async function postContentItem(item: any): Promise<void> {
  const userId = item.userId;
  const postText = item.caption || item.hook;
  const targetPlatform = item.platform === "both" ? "x" : item.platform;

  try {
    if (targetPlatform === "threads") {
      const token = await getThreadsAccessTokenForUser(userId);
      await createThreadsPost(postText, item.imageUrl || undefined, token);
    } else {
      const twitterClient = await getTwitterClientForUser(userId) || getTwitterClient();
      if (!twitterClient) {
        await storage.updateContentItem(item.id, { status: "failed", failReason: "X account not connected" } as any, userId);
        return;
      }
      let mediaId: string | undefined;
      if (item.imageUrl && isAllowedImageSource(item.imageUrl)) {
        try {
          let imageBuffer: Buffer;
          if (item.imageUrl.startsWith("/uploads/")) {
            const safePath = path.join(process.cwd(), "uploads", path.basename(item.imageUrl));
            imageBuffer = await fs.promises.readFile(safePath);
          } else if (item.imageUrl.startsWith("https://")) {
            const response = await fetch(item.imageUrl);
            imageBuffer = Buffer.from(await response.arrayBuffer());
          } else {
            throw new Error("Unsupported image source");
          }
          const mimeType = item.imageUrl.endsWith(".png") ? "image/png" : "image/jpeg";
          mediaId = await twitterClient.v1.uploadMedia(imageBuffer, { mimeType });
        } catch (mediaErr: any) {
          console.error(`[content-scheduler] Media upload failed for item ${item.id}:`, mediaErr.message);
        }
      }
      const tweetPayload: any = { text: postText };
      if (mediaId) tweetPayload.media = { media_ids: [mediaId] };
      await twitterClient.v2.tweet(tweetPayload);
    }

    await storage.updateContentItem(item.id, { status: "posted" } as any, userId);
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
          await createThreadsPost(postText, item.imageUrl || undefined, token);
        } else {
          const tc = await getTwitterClientForUser(userId) || getTwitterClient();
          if (tc) await tc.v2.tweet({ text: postText });
        }
        await storage.logActivityEvent({ userId, platform: otherPlatform, action: "post_created", localDate: today });
      } catch (crossErr: any) {
        console.error(`[content-scheduler] Cross-post failed for item ${item.id}:`, crossErr.message);
      }
    }

    console.log(`[content-scheduler] Posted item ${item.id} to ${item.platform}`);
  } catch (err: any) {
    await storage.updateContentItem(item.id, { status: "failed", failReason: err.message } as any, userId);
    console.error(`[content-scheduler] Failed to post item ${item.id}:`, err.message);
  }
}

async function tick(): Promise<void> {
  try {
    const dueItems = await storage.claimScheduledContentDue();
    for (const item of dueItems) {
      await postContentItem(item);
    }
  } catch (err: any) {
    console.error("[content-scheduler] tick error:", err.message);
  }
}

export function startContentScheduler(): void {
  console.log("[content-scheduler] Started, polling every 30s");
  setInterval(tick, POLL_INTERVAL_MS);
  setTimeout(tick, 5000);
}
