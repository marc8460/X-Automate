import type { Express } from "express";
import { createServer, type Server } from "http";
import https from "https";
import path from "path";
import fs from "fs";
import multer from "multer";
import Groq from "groq-sdk";
import { testTwitterConnection, getTwitterClient } from "./twitter";
import { storage } from "./storage";
import { addSseClient, removeSseClient, getPollerStatus, pausePoller, resumePoller } from "./engagementPoller";
import {
  insertTweetSchema,
  insertMediaItemSchema,
  insertEngagementSchema,
  insertFollowerInteractionSchema,
  insertTrendSchema,
  insertActivityLogSchema,
  insertAnalyticsDataSchema,
  insertPeakTimeSchema,
} from "@shared/schema";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Tweets ---
  app.get("/api/tweets", async (_req, res) => {
    const data = await storage.getTweets();
    res.json(data);
  });

  app.post("/api/tweets", async (req, res) => {
    const parsed = insertTweetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const tweet = await storage.createTweet(parsed.data);
    res.status(201).json(tweet);
  });

  app.patch("/api/tweets/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const tweet = await storage.updateTweet(id, req.body);
    if (!tweet) return res.status(404).json({ message: "Tweet not found" });
    res.json(tweet);
  });

  app.delete("/api/tweets/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTweet(id);
    res.status(204).send();
  });

  app.post("/api/content/post-now", async (req, res) => {
    const twitterClient = getTwitterClient();
    if (!twitterClient) {
      return res.status(400).json({ message: "Twitter credentials not configured" });
    }
    const { text, imageUrl } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "text is required" });
    if (text.length > 280) return res.status(400).json({ message: "Tweet exceeds 280 character limit" });
    try {
      let mediaId: string | undefined;
      if (imageUrl) {
        try {
          let imageBuffer: Buffer;
          if (imageUrl.startsWith("/uploads/")) {
            imageBuffer = await fs.promises.readFile(path.join(process.cwd(), imageUrl));
          } else if (imageUrl.startsWith("http")) {
            const response = await fetch(imageUrl);
            imageBuffer = Buffer.from(await response.arrayBuffer());
          } else {
            imageBuffer = await fs.promises.readFile(imageUrl);
          }
          mediaId = await twitterClient.v1.uploadMedia(imageBuffer, {
            mimeType: imageUrl.endsWith(".png") ? "image/png" : imageUrl.endsWith(".gif") ? "image/gif" : "image/jpeg",
          });
          console.log("[post-now] Media uploaded, mediaId:", mediaId);
        } catch (mediaErr: any) {
          console.error("[post-now] Media upload failed, posting without image:", mediaErr.message);
        }
      }

      const tweetPayload: any = { text: text.trim() };
      if (mediaId) {
        tweetPayload.media = { media_ids: [mediaId] };
      }
      const result = await twitterClient.v2.tweet(tweetPayload);
      console.log("[post-now] Tweet posted:", result.data.id);
      await storage.createActivityLog({
        action: "Tweet Posted",
        detail: text.trim().slice(0, 60) + (text.trim().length > 60 ? "…" : ""),
        time: new Date().toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase().replace(" ", ""),
        status: "success",
      });
      res.json({ success: true, tweetId: result.data.id });
    } catch (err: any) {
      console.error("[post-now] Twitter API error:", err.data || err.message || err);
      const msg = err.data?.detail || err.data?.errors?.[0]?.message || err.message || "Failed to post tweet";
      res.status(500).json({ message: msg });
    }
  });

  // --- Media Items ---
  app.get("/api/media", async (_req, res) => {
    const data = await storage.getMediaItems();
    res.json(data);
  });

  app.post("/api/media", async (req, res) => {
    const parsed = insertMediaItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const item = await storage.createMediaItem(parsed.data);
    await storage.createActivityLog({
      action: "Media Upload",
      detail: `${parsed.data.mood} / ${parsed.data.outfit}`,
      time: new Date().toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase().replace(" ", ""),
      status: "success",
    });
    res.status(201).json(item);
  });

  app.patch("/api/media/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const item = await storage.updateMediaItem(id, req.body);
    if (!item) return res.status(404).json({ message: "Media item not found" });
    res.json(item);
  });

  app.delete("/api/media/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteMediaItem(id);
    res.status(204).send();
  });

  // --- Engagements ---
  app.get("/api/engagements", async (_req, res) => {
    const data = await storage.getEngagements();
    res.json(data);
  });

  app.post("/api/engagements", async (req, res) => {
    const parsed = insertEngagementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const engagement = await storage.createEngagement(parsed.data);
    res.status(201).json(engagement);
  });

  app.patch("/api/engagements/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const engagement = await storage.updateEngagement(id, req.body);
    if (!engagement) return res.status(404).json({ message: "Engagement not found" });
    res.json(engagement);
  });

  // --- Live Engagement Engine Endpoints ---
  // All routes in this section ALWAYS return JSON — no HTML, no redirects.

  // Middleware: force JSON content-type for all /api/engagement/* routes
  app.use("/api/engagement", (_req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    next();
  });

  // SSE endpoint is exempt from the JSON middleware above — override to SSE content-type
  app.get("/api/engagement/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    addSseClient(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 30_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      removeSseClient(res);
    });
  });

  // Poller status — always JSON, works without credentials
  app.get("/api/engagement/status", (_req, res) => {
    try {
      const status = getPollerStatus();
      const hasCredentials = !!getTwitterClient();
      res.json({ ...status, hasCredentials });
    } catch (err: any) {
      res.json({ running: false, paused: false, lastPollAt: null, error: err.message, hasCredentials: false });
    }
  });

  // Pause / resume poller
  app.post("/api/engagement/pause", (_req, res) => {
    pausePoller();
    res.json({ paused: true });
  });

  app.post("/api/engagement/resume", (_req, res) => {
    resumePoller();
    res.json({ paused: false });
  });

  // Live comment threads (from DB, needsAttention = true)
  app.get("/api/engagement/live-comments", async (_req, res) => {
    try {
      const threads = await storage.getActiveCommentThreads();
      res.json({ threads });
    } catch (err: any) {
      console.error("[engagement/live-comments]", err.message);
      res.status(500).json({ threads: [], error: err.message });
    }
  });

  // Live follower interactions (from DB, last 48h)
  app.get("/api/engagement/live-interactions", async (_req, res) => {
    try {
      const interactions = await storage.getLiveFollowerInteractions(168);
      res.json({ interactions });
    } catch (err: any) {
      console.error("[engagement/live-interactions]", err.message);
      res.status(500).json({ interactions: [], error: err.message });
    }
  });

  // Legacy comments endpoint kept for backward compat — proxies from DB
  app.get("/api/engagement/comments", async (_req, res) => {
    try {
      const threads = await storage.getActiveCommentThreads();
      const comments = threads.map(t => ({
        commentId: t.lastCommentId,
        commentAuthor: t.lastCommentAuthor,
        commentAuthorName: t.lastCommentAuthorName,
        commentText: t.lastCommentText,
        parentTweetId: t.rootTweetId,
        parentTweetText: t.parentTweetText,
        createdAt: t.lastCommentAt.toISOString(),
        threadId: t.id,
      }));
      res.json({ comments });
    } catch (err: any) {
      console.error("[engagement/comments]", err.message);
      res.status(500).json({ comments: [], error: err.message });
    }
  });

  app.post("/api/engagement/generate-reply", async (req, res) => {
    try {
      const { parentTweetText, commentText, customPrompt } = req.body;
      if (!commentText) return res.status(400).json({ message: "commentText is required" });

      const styleBlock = customPrompt?.trim()
        ? `\n⚠️ CRITICAL STYLE INSTRUCTION — MANDATORY:\nWrite the reply in this exact style: "${customPrompt.trim()}"\nApply tone, vocabulary, energy, length, slang, emojis, and personality from this instruction.\nDo NOT fall back to generic or safe defaults. This overrides everything.\n`
        : `\nStyle guidelines:\n- Feel 100% human-written\n- Encourage further engagement\n- Context-aware, not generic\n- No bot-like enthusiasm\n`;

      const systemPrompt = `You are an expert social media engagement strategist.
Generate a single concise reply to a comment on an X (Twitter) post.
${styleBlock}
Also classify the comment sentiment as positive, negative, or neutral.

Return ONLY valid JSON with no markdown:
{"reply":"<the reply text>","sentiment":"positive"}`;

      const userPrompt = `Original Post:\n${parentTweetText || "Unknown"}\n\nComment to reply to:\n${commentText}`;

      console.log("[generate-reply] customPrompt:", JSON.stringify(customPrompt || ""));

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 300,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      let result: { reply: string; sentiment: string };
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: raw.trim(), sentiment: "neutral" };
      } catch {
        result = { reply: raw.trim(), sentiment: "neutral" };
      }
      if (!result.reply) result.reply = raw.trim();
      if (!result.sentiment) result.sentiment = "neutral";

      res.json(result);
    } catch (err: any) {
      console.error("Generate reply error:", err);
      res.status(500).json({ message: err.message || "Failed to generate reply" });
    }
  });

  app.post("/api/engagement/send-reply", async (req, res) => {
    const twitterClient = getTwitterClient();
    if (!twitterClient) {
      return res.status(400).json({ message: "Twitter credentials not configured" });
    }
    // threadId = conversation_id, commentId = the specific tweet to reply to
    const { commentId, threadId, replyText } = req.body;
    if (!commentId || !replyText) {
      return res.status(400).json({ message: "commentId and replyText are required" });
    }
    try {
      const result = await twitterClient.v2.reply(replyText, commentId);
      const resolvedThreadId = threadId || commentId;
      await storage.markThreadReplied(resolvedThreadId);
      await storage.createActivityLog({
        action: "Reply Sent",
        detail: replyText.slice(0, 60) + (replyText.length > 60 ? "…" : ""),
        time: new Date().toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase().replace(" ", ""),
        status: "success",
      });
      res.json({ success: true, tweetId: result.data.id, threadId: resolvedThreadId });
    } catch (err: any) {
      console.error("Send reply error:", err);
      res.status(500).json({ message: err.message || "Failed to send reply" });
    }
  });

  // --- Follower Interactions ---
  app.get("/api/follower-interactions", async (_req, res) => {
    const data = await storage.getFollowerInteractions();
    res.json(data);
  });

  app.post("/api/follower-interactions", async (req, res) => {
    const parsed = insertFollowerInteractionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const interaction = await storage.createFollowerInteraction(parsed.data);
    res.status(201).json(interaction);
  });

  // --- Trends ---
  app.get("/api/trends", async (_req, res) => {
    const data = await storage.getTrends();
    res.json(data);
  });

  app.post("/api/trends", async (req, res) => {
    const parsed = insertTrendSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const trend = await storage.createTrend(parsed.data);
    res.status(201).json(trend);
  });

  // --- Activity Logs ---
  app.get("/api/activity-logs", async (_req, res) => {
    const data = await storage.getActivityLogs();
    res.json(data);
  });

  app.post("/api/activity-logs", async (req, res) => {
    const parsed = insertActivityLogSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const log = await storage.createActivityLog(parsed.data);
    res.status(201).json(log);
  });

  // --- Analytics ---
  app.get("/api/analytics", async (_req, res) => {
    const data = await storage.getAnalyticsData();
    res.json(data);
  });

  app.post("/api/analytics", async (req, res) => {
    const parsed = insertAnalyticsDataSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const analytics = await storage.createAnalyticsData(parsed.data);
    res.status(201).json(analytics);
  });

  // --- Peak Times ---
  app.get("/api/peak-times", async (_req, res) => {
    const data = await storage.getPeakTimes();
    res.json(data);
  });

  app.post("/api/peak-times", async (req, res) => {
    const parsed = insertPeakTimeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const peakTime = await storage.createPeakTime(parsed.data);
    res.status(201).json(peakTime);
  });

  // --- Twitter Connection ---
  app.get("/api/twitter/status", async (_req, res) => {
    try {
      const result = await testTwitterConnection();
      res.json(result);
    } catch (err: any) {
      res.json({ connected: false, error: err.message || "Unknown error" });
    }
  });

  // --- Live Twitter Metrics (cached 5 min) ---
  let metricsCache: { data: any; fetchedAt: number } | null = null;
  const METRICS_CACHE_TTL = 5 * 60 * 1000;

  app.get("/api/twitter/metrics", async (_req, res) => {
    const twitterClient = getTwitterClient();
    if (!twitterClient) {
      return res.json({ error: "Twitter credentials not configured" });
    }

    if (metricsCache && Date.now() - metricsCache.fetchedAt < METRICS_CACHE_TTL) {
      return res.json(metricsCache.data);
    }

    try {
      const me = await twitterClient.v2.me({ "user.fields": ["public_metrics"] });
      const userId = me.data.id;
      const publicMetrics = me.data.public_metrics;

      const timelineResult = await twitterClient.v2.userTimeline(userId, {
        max_results: 100,
        "tweet.fields": ["public_metrics", "created_at"],
        exclude: ["retweets"],
      });

      const tweets: any[] = timelineResult.data?.data ?? [];

      let totalImpressions = 0;
      let totalLikes = 0;
      let totalRetweets = 0;
      let totalReplies = 0;

      const dailyMap: Record<string, { date: string; engagement: number; impressions: number; likes: number; retweets: number; replies: number; tweetCount: number }> = {};

      for (const tweet of tweets) {
        const pm = tweet.public_metrics ?? {};
        const impressions = pm.impression_count ?? 0;
        const likes = pm.like_count ?? 0;
        const rts = pm.retweet_count ?? 0;
        const replies = pm.reply_count ?? 0;

        totalImpressions += impressions;
        totalLikes += likes;
        totalRetweets += rts;
        totalReplies += replies;

        if (tweet.created_at) {
          const d = new Date(tweet.created_at);
          const dayKey = d.toISOString().slice(0, 10);
          const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          if (!dailyMap[dayKey]) {
            dailyMap[dayKey] = { date: dayLabel, engagement: 0, impressions: 0, likes: 0, retweets: 0, replies: 0, tweetCount: 0 };
          }
          dailyMap[dayKey].engagement += likes + rts + replies;
          dailyMap[dayKey].impressions += impressions;
          dailyMap[dayKey].likes += likes;
          dailyMap[dayKey].retweets += rts;
          dailyMap[dayKey].replies += replies;
          dailyMap[dayKey].tweetCount += 1;
        }
      }

      const totalEngagement = totalLikes + totalRetweets + totalReplies;
      const engagementRate = totalImpressions > 0
        ? ((totalEngagement / totalImpressions) * 100).toFixed(2)
        : "0";

      const dailyMetrics = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v);

      const result = {
        followers: publicMetrics?.followers_count ?? 0,
        following: publicMetrics?.following_count ?? 0,
        tweetCount: publicMetrics?.tweet_count ?? 0,
        impressions: totalImpressions,
        likes: totalLikes,
        retweets: totalRetweets,
        replies: totalReplies,
        engagementRate: parseFloat(engagementRate),
        dailyMetrics,
      };

      metricsCache = { data: result, fetchedAt: Date.now() };
      res.json(result);
    } catch (err: any) {
      console.error("[twitter/metrics] Error:", err.message);
      res.status(500).json({ error: err.message || "Failed to fetch metrics" });
    }
  });

  // --- Live Audience Peak Times ---
  let peakCache: { data: any; fetchedAt: number } | null = null;

  app.get("/api/twitter/peak-times", async (_req, res) => {
    const twitterClient = getTwitterClient();
    if (!twitterClient) {
      return res.json({ peakTimes: [], topPeak: null });
    }

    if (peakCache && Date.now() - peakCache.fetchedAt < METRICS_CACHE_TTL) {
      return res.json(peakCache.data);
    }

    try {
      const me = await twitterClient.v2.me();
      const userId = me.data.id;

      const timelineResult = await twitterClient.v2.userTimeline(userId, {
        max_results: 100,
        "tweet.fields": ["public_metrics", "created_at"],
        exclude: ["retweets"],
      });

      const tweets: any[] = timelineResult.data?.data ?? [];

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const slots: Record<string, { totalEngagement: number; count: number; hours: number[] }> = {};
      for (const day of dayNames) {
        slots[day] = { totalEngagement: 0, count: 0, hours: [] };
      }

      for (const tweet of tweets) {
        if (!tweet.created_at) continue;
        const d = new Date(tweet.created_at);
        const dayName = dayNames[d.getUTCDay()];
        const hour = d.getUTCHours();
        const pm = tweet.public_metrics ?? {};
        const engagement = (pm.like_count ?? 0) + (pm.retweet_count ?? 0) + (pm.reply_count ?? 0);

        slots[dayName].totalEngagement += engagement;
        slots[dayName].count += 1;
        slots[dayName].hours.push(hour);
      }

      const peakTimesData = dayNames.map(day => {
        const slot = slots[day];
        const avgEngagement = slot.count > 0 ? Math.round(slot.totalEngagement / slot.count) : 0;
        let bestHour = 21;
        if (slot.hours.length > 0) {
          const hourCounts: Record<number, number> = {};
          slot.hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
          bestHour = parseInt(Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0][0]);
        }
        const ampm = bestHour >= 12 ? "PM" : "AM";
        const h12 = bestHour === 0 ? 12 : bestHour > 12 ? bestHour - 12 : bestHour;
        const timeLabel = `${h12}:00 ${ampm}`;

        const maxPossible = Math.max(1, ...Object.values(slots).map(s => s.count > 0 ? Math.round(s.totalEngagement / s.count) : 0));
        const score = maxPossible > 0 ? Math.min(100, Math.round((avgEngagement / maxPossible) * 100)) : 0;

        return {
          day,
          time: timeLabel,
          score,
          avgEngagement,
          tweetCount: slot.count,
        };
      });

      const topPeak = peakTimesData.reduce((best, t) => t.score > (best?.score ?? 0) ? t : best, peakTimesData[0]);

      const result = { peakTimes: peakTimesData, topPeak };
      peakCache = { data: result, fetchedAt: Date.now() };
      res.json(result);
    } catch (err: any) {
      console.error("[twitter/peak-times] Error:", err.message);
      res.status(500).json({ error: err.message || "Failed to fetch peak times" });
    }
  });

  // --- Settings ---
  app.get("/api/settings", async (_req, res) => {
    const data = await storage.getSettings();
    res.json(data);
  });

  app.put("/api/settings/:key", async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    if (!value && value !== "") return res.status(400).json({ message: "value is required" });
    const setting = await storage.upsertSetting(key, value);
    res.json(setting);
  });

  // --- Media Upload ---
  app.post("/api/media/upload", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Maximum size is 50MB." });
        }
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const url = `/uploads/${req.file.filename}`;
      const mood = (req.body.mood as string) || "Neutral";
      const outfit = (req.body.outfit as string) || "Untagged";
      const item = await storage.createMediaItem({
        url,
        mood,
        outfit,
        usageCount: 0,
        lastUsed: "Never",
        risk: "safe",
      });
      res.status(201).json(item);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Upload failed" });
    }
  });

  // --- Media Delete (with file cleanup) ---
  app.delete("/api/media/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const items = await storage.getMediaItems();
    const item = items.find((m) => m.id === id);
    if (item && item.url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), item.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await storage.deleteMediaItem(id);
    res.status(204).send();
  });

  // --- AI Content Generation (Groq) ---
  app.post("/api/generate", async (req, res) => {
    try {
      const { style, topic, seductiveness: sliderValue, imageUrl } = req.body;
      if (!style) return res.status(400).json({ message: "style is required" });

      const settingsData = await storage.getSettings();
      const getSetting = (key: string, fallback: string) => {
        const s = settingsData.find((s) => s.key === key);
        return s ? s.value : fallback;
      };
      const seductiveness = sliderValue !== undefined ? String(sliderValue) : getSetting("seductiveness", "60");
      const playfulness = getSetting("playfulness", "85");
      const dominance = getSetting("dominance", "35");

      let imageDescription = "";
      if (imageUrl) {
        try {
          let fullImageUrl = imageUrl;
          if (imageUrl.startsWith("/uploads/")) {
            const host = req.headers.host || "localhost:5000";
            const protocol = req.headers["x-forwarded-proto"] || "http";
            fullImageUrl = `${protocol}://${host}${imageUrl}`;
          }

          const imageData = await fs.promises.readFile(path.join(process.cwd(), imageUrl));
          const base64Image = imageData.toString("base64");
          const ext = path.extname(imageUrl).toLowerCase();
          const mimeMap: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
          const mimeType = mimeMap[ext] || "image/webp";

          const visionResult = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: `data:${mimeType};base64,${base64Image}` },
                  },
                  {
                    type: "text",
                    text: "Describe this photo in detail. What is the person wearing (be very specific — bikini, dress, lingerie, crop top, etc.)? What is the setting (beach, bedroom, pool, city, etc.)? What is the person's pose and body language? What mood or vibe does this give off? Be concrete and specific, not vague. 2-3 sentences max.",
                  },
                ],
              },
            ],
            temperature: 0.3,
            max_tokens: 300,
          });
          imageDescription = visionResult.choices[0]?.message?.content || "";
          console.log("Vision analysis result:", imageDescription);
        } catch (visionErr: any) {
          console.error("Vision analysis failed, falling back to text-only:", visionErr.message);
        }
      }

      const sedLevel = parseInt(seductiveness);
      let toneGuide = "";
      if (sedLevel <= 30) {
        toneGuide = `She's in her wholesome era — cute, approachable, girl-next-door energy. Light flirting at most, keep it sweet and relatable.`;
      } else if (sedLevel <= 60) {
        toneGuide = `She's flirty and knows she's attractive. Teasing, playful innuendo, "I know you're looking" energy. She hints but doesn't say it outright. Think lingerie ads, not explicit.`;
      } else if (sedLevel <= 80) {
        toneGuide = `She's in her bold era. Openly thirst-trapping, suggestive, dominant energy. She talks about what she wants, uses "come here", "be good", "you couldn't handle me" language. Heavy innuendo, double meanings, she's clearly talking about MORE but never says it explicitly. She references DMs, late nights, "private content", being bad, body confidence. She's the girl who makes you nervous.`;
      } else {
        toneGuide = `ABSOLUTE MAXIMUM FREAKY MODE. She is dripping with sexual energy. Every tweet should make men stop scrolling and lose their minds. She writes like she's in heat — desperate, hungry, teasing what she'd do to you or what she wants done to her. She references her body constantly and explicitly — her lips, her thighs, her ass, her waist, what's under her clothes. She talks about sitting on laps, being pinned down, biting lips, scratching backs, leaving marks, being bent over, whispering filthy things, sending nudes, "come use me", "i need it so bad rn", "this body isn't gonna worship itself". She's the girl whose tweets make you screenshot and send to the group chat with "bro she's insane". She oscillates between submissive ("do whatever you want to me") and dominant ("get on your knees"). She references wet, hot, tight, hard — she implies EVERYTHING. She talks about what she's not wearing, what she just took off, what she wants ripped off. Think OnlyFans promo energy meets late-night DM energy. She's not subtle — she's practically sexting her entire timeline. She makes men physically react to reading a tweet. The only line she doesn't cross: no explicit anatomical descriptions of sex acts themselves, no mention of minors. Everything else is FAIR GAME. Push it as far as humanly possible while staying on X/Twitter.`;
      }

      const imageContext = imageDescription
        ? `\n\nPHOTO DESCRIPTION (she is posting this exact photo with the tweet):\n${imageDescription}\n\nCRITICAL: Every caption MUST directly reference specific things visible in this photo. If she's in a bikini, mention the bikini. If she's at the beach, mention the beach. If she's in lingerie, reference it. The caption should sound like she's literally looking at THIS photo and writing about it. Examples of good photo captions: "do u like my new bikini? 🌊", "who wants to take this off me?", "beach days hit different when you look like this". Do NOT write generic captions that could apply to any photo.`
        : "";

      const systemPrompt = `You are the ghost-writer for a popular female influencer on Twitter/X. She is a real human woman — confident, magnetic, and deeply online. She never reveals or hints that she is AI or that anyone writes for her.

Personality intensity dials (0-100):
- Seductiveness: ${seductiveness}/100
- Playfulness: ${playfulness}/100  
- Dominance: ${dominance}/100

TONE DIRECTIVE (this is the most important instruction):
${toneGuide}${imageContext}

Rules:
- Write as HER, first person, lowercase casual twitter voice
- Use emojis naturally but don't overdo it — she's not a brand account
- Never mention AI, bots, algorithms, or being automated
- Mix vulnerability with confidence
- Keep tweets under 280 characters
- Make them feel spontaneous, messy, real — like she typed it at 2am
- Match the requested style/mood exactly
- Vary sentence structure and energy levels between tweets
- At high seductiveness (80+): prioritize being provocative over being safe. Push the line HARD. She's not corporate. She's THAT girl. Do NOT censor yourself. Do NOT hold back. Write tweets that make men weak. Reference her body, what she wants done to it, what she's wearing or not wearing. Be freaky.
- No references to minors. No explicit anatomical descriptions of penetration. Everything else is fair game — push as far as possible.

Return ONLY a JSON array of 5 tweet strings. No explanation, no markdown, just the JSON array.`;

      const userPrompt = topic
        ? `Generate 5 "${style}" style tweets about: ${topic}`
        : `Generate 5 "${style}" style tweets`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: sedLevel > 80 ? 1.0 : 0.9,
        max_tokens: 1024,
      });

      const raw = completion.choices[0]?.message?.content || "[]";
      let tweets: string[];
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        tweets = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        tweets = raw.split("\n").filter((l) => l.trim().length > 0).slice(0, 5);
      }

      res.json({ tweets });
    } catch (err: any) {
      console.error("Groq generation error:", err);
      res.status(500).json({ message: err.message || "Generation failed" });
    }
  });

  // --- Trending Topics (Real Google Trends RSS + AI fallback) ---
  const trendsRssCache = new Map<string, { topics: any[]; fetchedAt: number }>();

  async function fetchGoogleTrendsRSS(geo: string): Promise<any[]> {
    const cached = trendsRssCache.get(geo);
    if (cached && Date.now() - cached.fetchedAt < 3 * 60 * 1000) {
      return cached.topics.map(t => ({
        ...t,
        startedAgoMinutes: Math.max(1, Math.round((Date.now() - t._pubTimestamp) / 60000)),
        startedAgo: formatAgo(Math.max(1, Math.round((Date.now() - t._pubTimestamp) / 60000))),
      }));
    }

    return new Promise((resolve, reject) => {
      const url = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;
      https.get(url, (res: any) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200 || !data.includes("<item>")) {
            return reject(new Error(`RSS returned status ${res.statusCode}`));
          }
          const items = data.match(/<item>[\s\S]*?<\/item>/g) || [];
          const topics = items.map((item: string, i: number) => {
            const title = item.match(/<title>(.*?)<\/title>/)?.[1] || "Unknown";
            const trafficRaw = item.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] || "100+";
            const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
            const picture = item.match(/<ht:picture>(.*?)<\/ht:picture>/)?.[1] || null;

            const newsItemTitles = (item.match(/<ht:news_item_title>(.*?)<\/ht:news_item_title>/g) || [])
              .map((n: string) => n.replace(/<[^>]+>/g, ""));
            const newsItemUrls = (item.match(/<ht:news_item_url>(.*?)<\/ht:news_item_url>/g) || [])
              .map((n: string) => n.replace(/<[^>]+>/g, ""));
            const newsItemSources = (item.match(/<ht:news_item_source>(.*?)<\/ht:news_item_source>/g) || [])
              .map((n: string) => n.replace(/<[^>]+>/g, ""));

            const articles = newsItemTitles.slice(0, 3).map((_: string, idx: number) => ({
              title: newsItemTitles[idx] || "",
              url: newsItemUrls[idx] || "",
              source: newsItemSources[idx] || "",
            }));

            const relatedQueries = newsItemTitles.slice(0, 5).map((t: string) => {
              const words = t.split(/\s+/).slice(0, 4).join(" ");
              return words.length > 30 ? words.substring(0, 30) + "..." : words;
            });

            const pubTimestamp = pubDate ? new Date(pubDate).getTime() : Date.now() - 3600000;
            const startedAgoMinutes = Math.max(1, Math.round((Date.now() - pubTimestamp) / 60000));

            return {
              id: i + 1,
              title,
              traffic: trafficRaw,
              trafficNumber: parseTrafficNumber(trafficRaw),
              growthPercent: "+1,000%",
              status: "Active",
              startedAgo: formatAgo(startedAgoMinutes),
              startedAgoMinutes,
              relatedQueries,
              articles,
              searchQuery: title,
              image: picture,
              _pubTimestamp: pubTimestamp,
            };
          });
          trendsRssCache.set(geo, { topics, fetchedAt: Date.now() });
          resolve(topics);
        });
        res.on("error", reject);
      }).on("error", reject);
    });
  }

  function formatAgo(minutes: number): string {
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours ago`;
    return `${Math.round(minutes / 1440)} days ago`;
  }

  function parseTrafficNumber(traffic: string | number): number {
    if (typeof traffic === "number") return traffic;
    if (!traffic) return 0;
    const cleaned = String(traffic).replace(/[+,]/g, "").trim();
    const match = cleaned.match(/([\d.]+)\s*(M|K)?/i);
    if (!match) return parseInt(cleaned) || 0;
    const num = parseFloat(match[1]);
    const suffix = (match[2] || "").toUpperCase();
    if (suffix === "M") return num * 1000000;
    if (suffix === "K") return num * 1000;
    return num;
  }

  const categoryKeywords: Record<string, string[]> = {
    entertainment: ["movie", "film", "music", "album", "song", "actor", "actress", "netflix", "disney", "show", "tv", "series", "concert", "celebrity", "star", "award", "grammy", "oscar", "emmy", "anime", "game", "gaming", "playstation", "xbox", "nintendo", "marvel", "dc", "kardashian", "klum", "maischberger", "ronzheimer", "tiktok", "youtube", "spotify", "drake", "taylor swift", "beyonce"],
    business: ["stock", "market", "economy", "trade", "ceo", "company", "corp", "amazon", "tesla", "apple", "google", "microsoft", "bank", "finance", "invest", "business", "deal", "merger", "acquisition", "ipo", "layoff", "revenue"],
    technology: ["ai", "tech", "software", "app", "xiaomi", "samsung", "iphone", "android", "crypto", "bitcoin", "blockchain", "hack", "cyber", "robot", "startup", "chip", "nvidia", "openai", "chatgpt", "meta", "x.com"],
    sports: ["league", "cup", "match", "vs", "game", "score", "team", "player", "coach", "championship", "tournament", "soccer", "football", "basketball", "tennis", "f1", "nba", "nfl", "mlb", "nhl", "premier", "champions", "world cup", "olympic", "goal", "transfer", "ronaldo", "messi", "sporting", "inter", "porto", "cavaliers", "pistons", "mavericks", "hornets", "wizards", "magic", "baseball"],
    health: ["health", "covid", "vaccine", "virus", "disease", "hospital", "doctor", "cancer", "fda", "drug", "treatment", "outbreak", "pandemic", "symptom", "diet", "fitness"],
    science: ["nasa", "space", "climate", "earthquake", "volcano", "hurricane", "storm", "weather", "research", "study", "discovery", "planet", "moon", "mars", "satellite"],
    politics: ["president", "election", "vote", "senate", "congress", "law", "policy", "democrat", "republican", "trump", "biden", "minister", "parliament", "government", "protest", "war", "sanction", "diplomat", "nato", "kurds", "iran"],
  };

  function matchesCategory(topic: any, category: string): boolean {
    if (category === "all") return true;
    const keywords = categoryKeywords[category];
    if (!keywords) return true;
    const titleLower = topic.title.toLowerCase();
    return keywords.some(kw => {
      if (kw.length <= 3) {
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        return regex.test(titleLower);
      }
      return titleLower.includes(kw);
    });
  }

  function matchesTimeWindow(topic: any, timeWindow: string): boolean {
    const minutes = topic.startedAgoMinutes || 0;
    switch (timeWindow) {
      case "1h": return minutes <= 60;
      case "3h": return minutes <= 180;
      case "6h": return minutes <= 360;
      case "12h": return minutes <= 720;
      case "24h": return minutes <= 1440;
      case "2d": return minutes <= 2880;
      case "7d": return minutes <= 10080;
      default: return true;
    }
  }

  app.get("/api/trending-topics", async (req, res) => {
    try {
      const geo = (req.query.geo as string) || "US";
      const category = (req.query.category as string) || "all";
      const timeWindow = (req.query.timeWindow as string) || "24h";
      const sortBy = (req.query.sortBy as string) || "volume";

      let allTopics: any[] = [];
      let source = "google_trends";

      try {
        allTopics = await fetchGoogleTrendsRSS(geo);
        source = "google_trends";
      } catch (rssErr: any) {
        console.error("Google Trends RSS failed:", rssErr.message);
        allTopics = [];
        source = "no_data";
      }

      let topics = allTopics
        .filter(t => matchesCategory(t, category))
        .filter(t => matchesTimeWindow(t, timeWindow));

      if (sortBy === "volume") {
        topics.sort((a, b) => (b.trafficNumber || 0) - (a.trafficNumber || 0));
      } else if (sortBy === "recent") {
        topics.sort((a, b) => (a.startedAgoMinutes || 999) - (b.startedAgoMinutes || 999));
      }

      topics = topics.map((t, i) => {
        const { _pubTimestamp, ...clean } = t;
        return { ...clean, id: i + 1 };
      });

      const result = {
        topics,
        totalAvailable: allTopics.length,
        geo,
        category,
        timeWindow,
        sortBy,
        source,
        fetchedAt: new Date().toISOString(),
      };

      res.json(result);
    } catch (err: any) {
      console.error("Trending topics error:", err);
      res.status(500).json({ message: err.message || "Failed to fetch trends" });
    }
  });

  // --- Analyze Post & Generate Viral Comments (Groq AI) ---
  app.post("/api/analyze-post", async (req, res) => {
    try {
      const {
        trendTopic,
        trendGrowth,
        trendContext,
        postText,
        imageUrl,
        authorFollowers,
        likes,
        replies,
        retweets,
        timeElapsed,
        niche,
        commentStyle,
        customPrompt,
      } = req.body;

      if (!postText) return res.status(400).json({ message: "postText is required" });

      let imageDescription = "";
      if (imageUrl) {
        try {
          if (imageUrl.startsWith("/uploads/")) {
            const imageData = await fs.promises.readFile(path.join(process.cwd(), imageUrl));
            const base64Image = imageData.toString("base64");
            const ext = path.extname(imageUrl).toLowerCase();
            const mimeMap: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
            const mimeType = mimeMap[ext] || "image/jpeg";

            const visionResult = await groq.chat.completions.create({
              model: "meta-llama/llama-4-scout-17b-16e-instruct",
              messages: [{
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
                  { type: "text", text: "Analyze this image in detail. Describe: scene content, emotional signals, meme potential, cultural references, visual irony or contrast. Be specific and concise, 3-4 sentences." },
                ],
              }],
              temperature: 0.3,
              max_tokens: 400,
            });
            imageDescription = visionResult.choices[0]?.message?.content || "";
          } else if (imageUrl.startsWith("http")) {
            const visionResult = await groq.chat.completions.create({
              model: "meta-llama/llama-4-scout-17b-16e-instruct",
              messages: [{
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: imageUrl } },
                  { type: "text", text: "Analyze this image in detail. Describe: scene content, emotional signals, meme potential, cultural references, visual irony or contrast. Be specific and concise, 3-4 sentences." },
                ],
              }],
              temperature: 0.3,
              max_tokens: 400,
            });
            imageDescription = visionResult.choices[0]?.message?.content || "";
          }
        } catch (visionErr: any) {
          console.error("Vision analysis failed:", visionErr.message);
          imageDescription = "Image could not be analyzed.";
        }
      }

      const hasCustomStyle = customPrompt?.trim();

      const systemPrompt = `You are an elite social engagement strategist specialized in generating high-visibility comments on X (Twitter).

Your job is to:
1. Analyze a rising topic (from Google Trends or other trend signals).
2. Analyze a specific X post (text + image if provided).
3. Evaluate both the trend momentum and the post's viral potential.
4. Generate 5 comments for the post.
${hasCustomStyle
  ? `\nCOMMENT STYLE — MANDATORY:
Every single comment you write MUST follow these style instructions from the user:
"${customPrompt!.trim()}"
This is the #1 priority. Apply it to tone, vocabulary, energy, length, slang, emoji usage, and personality.
Do NOT fall back to generic, balanced, or safe defaults. The user's style instruction overrides everything else about how the comments should sound.\n`
  : `\nCOMMENT STYLE:
- Comments must feel 100% human-written.
- No generic praise ("Love this!", "So true!").
- No spammy tone or bot-like enthusiasm.
- No emoji overload.
- Add insight, curiosity, perspective, or subtle authority.
- Comments must expand the conversation, not repeat the post.\n`}
- If engagement velocity is low relative to follower count, recommend skipping the post and explain why.

Optimize for:
- Early engagement advantage
- Psychological triggers
- Curiosity gaps
- Relatability
- Conversation expansion

If an image is provided, analyze:
- Scene content
- Emotional signals
- Meme structure
- Cultural references
- Visual irony or contrast
Integrate visual analysis into comment strategy.

You MUST return your response as valid JSON with this exact structure:
{
  "trendMomentumScore": <number 1-10>,
  "trendMomentumExplanation": "<string>",
  "postViralPotential": <number 1-10>,
  "postViralExplanation": "<string>",
  "toneAnalysis": {
    "emotionalTone": "<string>",
    "controversyLevel": "<string low/medium/high>",
    "authorityLevel": "<string low/medium/high>",
    "audienceType": "<string>",
    "memeVisualFactor": "<string or null>"
  },
  "bestStrategy": {
    "type": "<Authority/Curious/Contrarian/Relatable/Insightful>",
    "explanation": "<string>"
  },
  "comments": ["<comment1>", "<comment2>", "<comment3>", "<comment4>", "<comment5>"],
  "safestOption": {
    "index": <number 0-4>,
    "explanation": "<string>"
  },
  "highVisibilityOption": {
    "index": <number 0-4>,
    "explanation": "<string>"
  },
  "skipRecommended": <boolean>,
  "skipReason": "<string or null>"
}

Return ONLY the JSON. No markdown, no extra text.`;

      const userPrompt = `INPUT DATA:

TREND DATA:
Topic: ${trendTopic || "Not specified"}
Growth Rate: ${trendGrowth || "Unknown"}
Context: ${trendContext || "No additional context"}

POST TEXT:
${postText}

IMAGE DESCRIPTION:
${imageDescription || "No image provided"}

POST METRICS:
Author Followers: ${authorFollowers || "Unknown"}
Likes: ${likes || 0}
Replies: ${replies || 0}
Reposts: ${retweets || 0}
Time Since Posted: ${timeElapsed || "Unknown"}

NICHE:
${niche || "General"}
${hasCustomStyle ? `\nREMINDER — The user's style instruction for all 5 comments is: "${customPrompt!.trim()}". Follow it exactly.` : ""}`;

      console.log("[analyze-post] customPrompt received:", JSON.stringify(customPrompt || ""));
      console.log("[analyze-post] styleBlock active:", customPrompt?.trim() ? "CUSTOM OVERRIDE" : "DEFAULT");

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2048,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      let analysis;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        analysis = { raw, parseError: true };
      }

      res.json({ analysis, imageDescription: imageDescription || null });
    } catch (err: any) {
      console.error("Post analysis error:", err);
      res.status(500).json({ message: err.message || "Analysis failed" });
    }
  });

  // --- Screenshot Scan: Upload screenshot of X post, AI extracts everything + generates comments ---
  app.post("/api/scan-screenshot", (req, res, next) => {
    upload.single("screenshot")(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || "Upload failed" });
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No screenshot uploaded" });

      const trendTopic = (req.body.trendTopic as string) || "";
      const trendGrowth = (req.body.trendGrowth as string) || "";
      const trendContext = (req.body.trendContext as string) || "";
      const commentStyle = (req.body.commentStyle as string) || "Balanced";
      const niche = (req.body.niche as string) || "";
      const customPrompt = (req.body.customPrompt as string) || "";

      const imageData = await fs.promises.readFile(req.file.path);
      const base64Image = imageData.toString("base64");
      const ext = path.extname(req.file.originalname || ".png").toLowerCase();
      const mimeMap: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
      const mimeType = mimeMap[ext] || "image/png";

      const extractionResult = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `You are looking at a screenshot of an X (Twitter) post. Extract every piece of text and data you can see. Return ONLY valid JSON with this exact structure:
{
  "postText": "the full text content of the tweet/post",
  "authorUsername": "the @username if visible, else null",
  "authorDisplayName": "display name if visible, else null",
  "authorFollowers": "follower count if visible (e.g. '50K'), else null",
  "likes": <number or 0>,
  "replies": <number or 0>,
  "retweets": <number or 0>,
  "views": <number or 0>,
  "timeElapsed": "time since posted if visible (e.g. '2h', '3m'), else null",
  "hasImage": <true or false>,
  "imageDescription": "if the post contains an embedded image/meme, describe it in detail. Otherwise null",
  "hashtags": ["any", "hashtags", "visible"],
  "isQuotePost": <true or false>,
  "quotedText": "text of quoted post if visible, otherwise null"
}
Return ONLY the JSON object. No explanation, no markdown code fences.`
            },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          ],
        }],
        temperature: 0.1,
        max_tokens: 1500,
      });

      const extractedRaw = extractionResult.choices[0]?.message?.content || "";
      console.log("Vision extraction raw response:", extractedRaw.substring(0, 500));
      let extracted: any;
      try {
        const jsonMatch = extractedRaw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[0]);
        } else {
          extracted = { postText: extractedRaw.trim() || null };
        }
      } catch (parseErr: any) {
        console.error("JSON parse failed for vision response:", parseErr.message);
        const textContent = extractedRaw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
        try {
          extracted = JSON.parse(textContent);
        } catch {
          extracted = { postText: textContent.length > 20 ? textContent : null };
        }
      }

      if (!extracted.postText?.trim()) {
        fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          message: "Could not read the post from the screenshot. Try a clearer screenshot showing the full post.",
          extracted: { postText: "Could not extract post content from screenshot" },
        });
      }

      console.log("[scan-screenshot] customPrompt received:", JSON.stringify(customPrompt || ""));
      console.log("[scan-screenshot] styleBlock active:", customPrompt?.trim() ? "CUSTOM OVERRIDE" : "DEFAULT");

      const scanHasCustomStyle = customPrompt?.trim();

      const systemPrompt = `You are an elite social engagement strategist specialized in generating high-visibility comments on X (Twitter).

Your job is to:
1. Analyze a rising topic (from Google Trends or other trend signals).
2. Analyze a specific X post (text + image if provided).
3. Evaluate both the trend momentum and the post's viral potential.
4. Generate 5 comments for the post.
${scanHasCustomStyle
  ? `\nCOMMENT STYLE — MANDATORY:
Every single comment you write MUST follow these style instructions from the user:
"${customPrompt!.trim()}"
This is the #1 priority. Apply it to tone, vocabulary, energy, length, slang, emoji usage, and personality.
Do NOT fall back to generic, balanced, or safe defaults. The user's style instruction overrides everything else about how the comments should sound.\n`
  : `\nCOMMENT STYLE:
- Comments must feel 100% human-written.
- No generic praise ("Love this!", "So true!").
- No spammy tone or bot-like enthusiasm.
- No emoji overload.
- Add insight, curiosity, perspective, or subtle authority.
- Comments must expand the conversation, not repeat the post.\n`}
- If engagement velocity is low relative to follower count, recommend skipping the post and explain why.

Optimize for:
- Early engagement advantage
- Psychological triggers
- Curiosity gaps
- Relatability
- Conversation expansion

If an image is provided, integrate visual analysis into comment strategy.

You MUST return your response as valid JSON with this exact structure:
{
  "trendMomentumScore": <number 1-10>,
  "trendMomentumExplanation": "<string>",
  "postViralPotential": <number 1-10>,
  "postViralExplanation": "<string>",
  "toneAnalysis": {
    "emotionalTone": "<string>",
    "controversyLevel": "<string low/medium/high>",
    "authorityLevel": "<string low/medium/high>",
    "audienceType": "<string>",
    "memeVisualFactor": "<string or null>"
  },
  "bestStrategy": {
    "type": "<Authority/Curious/Contrarian/Relatable/Insightful>",
    "explanation": "<string>"
  },
  "comments": ["<comment1>", "<comment2>", "<comment3>", "<comment4>", "<comment5>"],
  "safestOption": {
    "index": <number 0-4>,
    "explanation": "<string>"
  },
  "highVisibilityOption": {
    "index": <number 0-4>,
    "explanation": "<string>"
  },
  "skipRecommended": <boolean>,
  "skipReason": "<string or null>"
}

Return ONLY the JSON. No markdown, no extra text.`;

      const userPrompt = `INPUT DATA:

TREND DATA:
Topic: ${trendTopic || "Not specified"}
Growth Rate: ${trendGrowth || "Unknown"}
Context: ${trendContext || "No additional context"}

POST TEXT:
${extracted.postText}

IMAGE DESCRIPTION:
${extracted.imageDescription || "No image in post"}

POST METRICS:
Author: ${extracted.authorDisplayName || "Unknown"} (${extracted.authorUsername || "Unknown"})
Author Followers: ${extracted.authorFollowers || "Unknown"}
Likes: ${extracted.likes || 0}
Replies: ${extracted.replies || 0}
Reposts: ${extracted.retweets || 0}
Views: ${extracted.views || "Unknown"}
Time Since Posted: ${extracted.timeElapsed || "Unknown"}
Hashtags: ${extracted.hashtags?.join(", ") || "None"}

NICHE:
${niche || "General"}
${scanHasCustomStyle ? `\nREMINDER — The user's style instruction for all 5 comments is: "${customPrompt!.trim()}". Follow it exactly.` : ""}`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2048,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      let analysis;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        analysis = { raw, parseError: true };
      }

      fs.promises.unlink(req.file.path).catch(() => {});

      res.json({ analysis, extracted });
    } catch (err: any) {
      console.error("Screenshot scan error:", err);
      if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
      res.status(500).json({ message: err.message || "Screenshot scan failed" });
    }
  });

  // --- Seed endpoint (populate initial data if empty) ---
  app.post("/api/seed", async (_req, res) => {
    const existingTweets = await storage.getTweets();
    if (existingTweets.length > 0) {
      return res.json({ message: "Data already seeded" });
    }

    await Promise.all([
      storage.createTweet({ text: "tell me honestly, am i your type? 🥺👉👈", style: "Direct Question", status: "queued", imageUrl: null }),
      storage.createTweet({ text: "can i dm youuuuu?!! 😩 don't ignore me", style: "Engagement Bait", status: "posted", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400" }),
      storage.createTweet({ text: "free pic if you stop scrolling and say hi 😇", style: "Soft Tease", status: "queued", imageUrl: null }),
    ]);

    await Promise.all([
      storage.createMediaItem({ url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400", mood: "Playful", outfit: "Summer Dress", usageCount: 2, lastUsed: "3 days ago", risk: "safe" }),
      storage.createMediaItem({ url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400", mood: "Confident", outfit: "Streetwear", usageCount: 0, lastUsed: "Never", risk: "safe" }),
      storage.createMediaItem({ url: "https://images.unsplash.com/photo-1529139513477-3235a14a139b?auto=format&fit=crop&q=80&w=400", mood: "Seductive", outfit: "Evening Wear", usageCount: 5, lastUsed: "12 hours ago", risk: "spicy" }),
    ]);

    await Promise.all([
      storage.createEngagement({ user: "@techbro_99", text: "AI is completely overhyped right now.", sentiment: "neutral", suggestedReply: "Is it? Or are you just not using the right prompts? 😉", time: "2m ago", status: "pending" }),
      storage.createEngagement({ user: "@founder_x", text: "Just deployed my first Next.js app! So exhausted but worth it.", sentiment: "positive", suggestedReply: "Love that energy. Rest up, you earned it. ☕️🖤", time: "15m ago", status: "pending" }),
      storage.createEngagement({ user: "@crypto_king", text: "Markets are bleeding today...", sentiment: "negative", suggestedReply: "Perfect time to look away from the charts and focus on building... or other things. 💅", time: "1h ago", status: "pending" }),
    ]);

    await Promise.all([
      storage.createFollowerInteraction({ user: "@new_fan_1", action: "Followed you", time: "5m ago" }),
      storage.createFollowerInteraction({ user: "@loyal_supporter", action: "Liked 3 posts", time: "1h ago" }),
    ]);

    await Promise.all([
      storage.createTrend({ tag: "#AIArtwork", volume: "124K", fitScore: 92, trending: "up" }),
      storage.createTrend({ tag: "Tech Layoffs", volume: "89K", fitScore: 45, trending: "down" }),
      storage.createTrend({ tag: "#BuildInPublic", volume: "45K", fitScore: 88, trending: "up" }),
      storage.createTrend({ tag: "Late Night Coding", volume: "12K", fitScore: 95, trending: "up" }),
    ]);

    // Activity logs, analytics, and peak times are now populated from live Twitter data — no seed needed

    const defaultSettings = [
      { key: "seductiveness", value: "60" },
      { key: "dominance", value: "35" },
      { key: "playfulness", value: "85" },
      { key: "dailyTweetTarget", value: "3" },
      { key: "maxDailyReplies", value: "50" },
      { key: "minDelay", value: "2" },
      { key: "maxDelay", value: "15" },
      { key: "humanTypingSimulation", value: "true" },
      { key: "randomJitterDelay", value: "true" },
      { key: "browserFingerprinting", value: "true" },
    ];
    for (const s of defaultSettings) {
      await storage.upsertSetting(s.key, s.value);
    }

    res.status(201).json({ message: "Seed data created successfully" });
  });

  // Scheduled post runner — checks every 60 seconds for due tweets
  setInterval(async () => {
    try {
      const now = new Date().toISOString();
      const allTweets = await storage.getTweets();
      const due = allTweets.filter(
        t => t.scheduledAt && t.status === "queued" && t.scheduledAt <= now
      );
      if (due.length === 0) return;
      const twitterClient = getTwitterClient();
      if (!twitterClient) return;
      for (const tweet of due) {
        try {
          await twitterClient.v2.tweet(tweet.text);
          await storage.updateTweet(tweet.id, { status: "posted" });
          await storage.createActivityLog({
            action: "Scheduled Tweet",
            detail: tweet.text.slice(0, 60) + (tweet.text.length > 60 ? "…" : ""),
            time: new Date().toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase().replace(" ", ""),
            status: "success",
          });
          console.log(`[scheduler] Posted tweet ${tweet.id}`);
        } catch (err: any) {
          console.error(`[scheduler] Failed tweet ${tweet.id}:`, err.message);
          await storage.updateTweet(tweet.id, { status: "failed" });
        }
      }
    } catch (err) {
      console.error("[scheduler] Tick error:", err);
    }
  }, 60_000);

  return httpServer;
}
