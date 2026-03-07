import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import https from "https";
import path from "path";
import fs from "fs";
import multer from "multer";
import Groq from "groq-sdk";
import { getTwitterClient, getTwitterClientForUser, testTwitterConnectionForUser, generateTwitterOAuthUrl, handleTwitterOAuthCallback } from "./twitter";
import { testThreadsConnectionForUser, getThreadsAccessTokenForUser, createThreadsPost, replyToThreadsComment, generateThreadsOAuthUrl, storeThreadsOAuthState, handleThreadsOAuthCallback } from "./threads";
import { storage } from "./storage";
import { addSseClient, removeSseClient, getPollerStatus, pausePoller, resumePoller } from "./engagementPoller";
import { rankTweets } from "./ranking";
import { isAuthenticated } from "./replit_integrations/auth";
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

function getUserId(req: Request): string {
  return (req as any).user?.claims?.sub ?? "anonymous";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- OAuth Connect Routes (must be before isAuthenticated middleware for callbacks) ---

  app.get("/api/auth/x/connect", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const callbackUrl = `${protocol}://${req.hostname}/api/auth/x/callback`;
      const { url, state } = await generateTwitterOAuthUrl(userId, callbackUrl);
      res.json({ url, state });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to generate OAuth URL" });
    }
  });

  app.get("/api/auth/x/callback", async (req: Request, res: Response) => {
    const { state, code } = req.query as { state: string; code: string };
    if (!state || !code) return res.redirect("/settings?error=missing_params");
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const callbackUrl = `${protocol}://${req.hostname}/api/auth/x/callback`;
    const result = await handleTwitterOAuthCallback(state, code, callbackUrl);
    if (result.success) {
      res.redirect(`/settings?connected=x&username=${result.username}`);
    } else {
      res.redirect(`/settings?error=${encodeURIComponent(result.error || "OAuth failed")}`);
    }
  });

  app.get("/api/auth/threads/connect", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const callbackUrl = `${protocol}://${req.hostname}/api/auth/threads/callback`;
      const { url, state } = generateThreadsOAuthUrl(userId, callbackUrl);
      storeThreadsOAuthState(state, userId);
      res.json({ url, state });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to generate OAuth URL" });
    }
  });

  app.get("/api/auth/threads/callback", async (req: Request, res: Response) => {
    const { state, code } = req.query as { state: string; code: string };
    if (!state || !code) return res.redirect("/settings?error=missing_params");
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const callbackUrl = `${protocol}://${req.hostname}/api/auth/threads/callback`;
    const result = await handleThreadsOAuthCallback(state, code, callbackUrl);
    if (result.success) {
      res.redirect(`/settings?connected=threads&username=${result.username}`);
    } else {
      res.redirect(`/settings?error=${encodeURIComponent(result.error || "OAuth failed")}`);
    }
  });

  app.delete("/api/auth/disconnect/:platform", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { platform } = req.params;
    if (platform !== "x" && platform !== "threads") {
      return res.status(400).json({ message: "Invalid platform" });
    }
    await storage.deleteConnectedAccount(userId, platform);
    res.json({ success: true });
  });

  app.get("/api/auth/connected-accounts", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const accounts = await storage.getConnectedAccounts(userId);
    const safe = accounts.map(a => ({
      id: a.id,
      platform: a.platform,
      platformUserId: a.platformUserId,
      platformUsername: a.platformUsername,
      tokenExpiresAt: a.tokenExpiresAt,
      createdAt: a.createdAt,
    }));
    res.json(safe);
  });

  // --- Tweets ---
  app.get("/api/tweets", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const data = await storage.getTweets(userId);
    res.json(data);
  });

  app.post("/api/tweets", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const parsed = insertTweetSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const tweet = await storage.createTweet(parsed.data);
    res.status(201).json(tweet);
  });

  app.patch("/api/tweets/:id", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    const tweet = await storage.updateTweet(id, req.body, userId);
    if (!tweet) return res.status(404).json({ message: "Tweet not found" });
    res.json(tweet);
  });

  app.delete("/api/tweets/:id", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    await storage.deleteTweet(id, userId);
    res.status(204).send();
  });

  app.post("/api/content/post-now", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { text, imageUrl, platform = "x" } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "text is required" });

    if (platform === "threads") {
      try {
        const token = await getThreadsAccessTokenForUser(userId);
        const result = await createThreadsPost(text.trim(), imageUrl || undefined, token);
        await storage.createActivityLog({
          userId,
          action: "Threads Post Published",
          detail: text.trim().slice(0, 60) + (text.trim().length > 60 ? "…" : ""),
          time: new Date().toISOString(),
          status: "success",
        });
        return res.json({ success: true, tweetId: result.id });
      } catch (err: any) {
        console.error("[post-now] Threads API error:", err.message);
        return res.status(500).json({ message: err.message || "Failed to post to Threads" });
      }
    }

    const twitterClient = await getTwitterClientForUser(userId) || getTwitterClient();
    if (!twitterClient) {
      return res.status(400).json({ message: "X account not connected. Go to Settings to connect your account." });
    }
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
          const mimeType = imageUrl.endsWith(".png") ? "image/png"
            : imageUrl.endsWith(".gif") ? "image/gif"
            : imageUrl.endsWith(".webp") ? "image/webp"
            : "image/jpeg";
          mediaId = await twitterClient.v1.uploadMedia(imageBuffer, { mimeType });
        } catch (mediaErr: any) {
          console.error("[post-now] Media upload failed:", mediaErr.data || mediaErr.message);
          const uploadClient = getTwitterClient();
          if (uploadClient) {
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
              const mimeType = imageUrl.endsWith(".png") ? "image/png"
                : imageUrl.endsWith(".gif") ? "image/gif"
                : imageUrl.endsWith(".webp") ? "image/webp"
                : "image/jpeg";
              mediaId = await uploadClient.v1.uploadMedia(imageBuffer, { mimeType });
              console.log("[post-now] Media uploaded via OAuth 1.0a fallback");
            } catch (fallbackErr: any) {
              console.error("[post-now] OAuth 1.0a media upload also failed:", fallbackErr.message);
            }
          }
        }
      }

      const tweetPayload: any = { text: text.trim() };
      if (mediaId) {
        tweetPayload.media = { media_ids: [mediaId] };
      }
      const result = await twitterClient.v2.tweet(tweetPayload);
      await storage.createActivityLog({
        userId,
        action: "Tweet Posted",
        detail: text.trim().slice(0, 60) + (text.trim().length > 60 ? "…" : ""),
        time: new Date().toISOString(),
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
  app.get("/api/media", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const data = await storage.getMediaItems(userId);
    res.json(data);
  });

  app.post("/api/media", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const parsed = insertMediaItemSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const item = await storage.createMediaItem(parsed.data);
    await storage.createActivityLog({
      userId,
      action: "Media Upload",
      detail: `${parsed.data.mood} / ${parsed.data.outfit}`,
      time: new Date().toISOString(),
      status: "success",
    });
    res.status(201).json(item);
  });

  app.patch("/api/media/:id", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    const item = await storage.updateMediaItem(id, req.body, userId);
    if (!item) return res.status(404).json({ message: "Media item not found" });
    res.json(item);
  });

  app.delete("/api/media/:id", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    const items = await storage.getMediaItems(userId);
    const item = items.find((m) => m.id === id);
    if (item && item.url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), item.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await storage.deleteMediaItem(id, userId);
    res.status(204).send();
  });

  // --- Engagements ---
  app.get("/api/engagements", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const data = await storage.getEngagements(userId);
    res.json(data);
  });

  app.post("/api/engagements", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const parsed = insertEngagementSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const engagement = await storage.createEngagement(parsed.data);
    res.status(201).json(engagement);
  });

  app.patch("/api/engagements/:id", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    const engagement = await storage.updateEngagement(id, req.body, userId);
    if (!engagement) return res.status(404).json({ message: "Engagement not found" });
    res.json(engagement);
  });

  // --- Live Engagement Engine Endpoints ---
  app.use("/api/engagement", (_req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    next();
  });

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

  app.get("/api/engagement/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const status = getPollerStatus();
      const xAccount = await storage.getConnectedAccount(userId, "x");
      const hasCredentials = !!xAccount || !!getTwitterClient();
      res.json({ ...status, hasCredentials });
    } catch (err: any) {
      res.json({ running: false, paused: false, lastPollAt: null, error: err.message, hasCredentials: false });
    }
  });

  app.post("/api/engagement/pause", isAuthenticated, (_req: Request, res: Response) => {
    pausePoller();
    res.json({ paused: true });
  });

  app.post("/api/engagement/resume", isAuthenticated, (_req: Request, res: Response) => {
    resumePoller();
    res.json({ paused: false });
  });

  app.get("/api/engagement/live-comments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const platform = req.query.platform as string | undefined;
      const threads = await storage.getActiveCommentThreads(userId, platform);
      res.json({ threads });
    } catch (err: any) {
      console.error("[engagement/live-comments]", err.message);
      res.status(500).json({ threads: [], error: err.message });
    }
  });

  app.get("/api/engagement/live-interactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const platform = req.query.platform as string | undefined;
      const interactions = await storage.getLiveFollowerInteractions(userId, 168, platform);
      res.json({ interactions });
    } catch (err: any) {
      console.error("[engagement/live-interactions]", err.message);
      res.status(500).json({ interactions: [], error: err.message });
    }
  });

  app.get("/api/engagement/comments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const threads = await storage.getActiveCommentThreads(userId);
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

  app.post("/api/engagement/generate-reply", isAuthenticated, async (req: Request, res: Response) => {
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

  app.post("/api/engagement/send-reply", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { commentId, threadId, replyText, platform = "x" } = req.body;
    if (!commentId || !replyText) {
      return res.status(400).json({ message: "commentId and replyText are required" });
    }

    if (platform === "threads") {
      try {
        const token = await getThreadsAccessTokenForUser(userId);
        const result = await replyToThreadsComment(commentId, replyText, token);
        const resolvedThreadId = threadId || commentId;
        await storage.markThreadReplied(resolvedThreadId);
        await storage.createActivityLog({
          userId,
          action: "Threads Reply Sent",
          detail: replyText.slice(0, 60) + (replyText.length > 60 ? "…" : ""),
          time: new Date().toISOString(),
          status: "success",
        });
        return res.json({ success: true, tweetId: result.id, threadId: resolvedThreadId });
      } catch (err: any) {
        console.error("Send Threads reply error:", err);
        return res.status(500).json({ message: err.message || "Failed to send Threads reply" });
      }
    }

    const twitterClient = await getTwitterClientForUser(userId) || getTwitterClient();
    if (!twitterClient) {
      return res.status(400).json({ message: "X account not connected" });
    }
    try {
      const result = await twitterClient.v2.reply(replyText, commentId);
      const resolvedThreadId = threadId || commentId;
      await storage.markThreadReplied(resolvedThreadId);
      await storage.createActivityLog({
        userId,
        action: "Reply Sent",
        detail: replyText.slice(0, 60) + (replyText.length > 60 ? "…" : ""),
        time: new Date().toISOString(),
        status: "success",
      });
      res.json({ success: true, tweetId: result.data.id, threadId: resolvedThreadId });
    } catch (err: any) {
      console.error("Send reply error:", err);
      res.status(500).json({ message: err.message || "Failed to send reply" });
    }
  });

  // --- Follower Interactions ---
  app.get("/api/follower-interactions", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const data = await storage.getFollowerInteractions(userId);
    res.json(data);
  });

  app.post("/api/follower-interactions", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const parsed = insertFollowerInteractionSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const interaction = await storage.createFollowerInteraction(parsed.data);
    res.status(201).json(interaction);
  });

  // --- Trends ---
  app.get("/api/trends", isAuthenticated, async (_req: Request, res: Response) => {
    const data = await storage.getTrends();
    res.json(data);
  });

  app.post("/api/trends", isAuthenticated, async (req: Request, res: Response) => {
    const parsed = insertTrendSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const trend = await storage.createTrend(parsed.data);
    res.status(201).json(trend);
  });

  // --- Activity Logs ---
  app.get("/api/activity-logs", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const data = await storage.getActivityLogs(userId);
    res.json(data);
  });

  app.post("/api/activity-logs", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const parsed = insertActivityLogSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const log = await storage.createActivityLog(parsed.data);
    res.status(201).json(log);
  });

  // --- Analytics ---
  app.get("/api/analytics", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const data = await storage.getAnalyticsData(userId);
    res.json(data);
  });

  app.post("/api/analytics", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const parsed = insertAnalyticsDataSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const analytics = await storage.createAnalyticsData(parsed.data);
    res.status(201).json(analytics);
  });

  // --- Peak Times ---
  app.get("/api/peak-times", isAuthenticated, async (_req: Request, res: Response) => {
    const data = await storage.getPeakTimes();
    res.json(data);
  });

  app.post("/api/peak-times", isAuthenticated, async (req: Request, res: Response) => {
    const parsed = insertPeakTimeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const peakTime = await storage.createPeakTime(parsed.data);
    res.status(201).json(peakTime);
  });

  // --- Twitter Connection ---
  app.get("/api/twitter/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const result = await testTwitterConnectionForUser(userId);
      res.json(result);
    } catch (err: any) {
      res.json({ connected: false, error: err.message || "Unknown error" });
    }
  });

  app.get("/api/threads/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const result = await testThreadsConnectionForUser(userId);
      res.json(result);
    } catch (err: any) {
      res.json({ connected: false, error: err.message || "Unknown error" });
    }
  });

  const timelineCache = new Map<string, { data: any; fetchedAt: number }>();
  const TIMELINE_CACHE_TTL = 2 * 60 * 1000;

  app.get("/api/twitter/home-timeline", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const hasSinceId = !!req.query.since_id;
    const hasPagination = !!req.query.pagination_token;

    if (!hasSinceId && !hasPagination) {
      const cached = timelineCache.get(userId);
      if (cached && Date.now() - cached.fetchedAt < TIMELINE_CACHE_TTL) {
        return res.json(cached.data);
      }
    }

    const twitterClient = await getTwitterClientForUser(userId) || getTwitterClient();
    if (!twitterClient) {
      return res.status(400).json({ message: "X account not connected" });
    }

    try {
      const params: any = {
        max_results: 20,
        "tweet.fields": ["public_metrics", "created_at", "author_id", "entities"],
        "user.fields": ["name", "username", "profile_image_url"],
        expansions: ["author_id", "attachments.media_keys"],
        "media.fields": ["url", "preview_image_url", "type", "width", "height"],
      };

      if (req.query.since_id) {
        params.since_id = req.query.since_id as string;
      }
      if (req.query.pagination_token) {
        params.pagination_token = req.query.pagination_token as string;
      }

      const timeline = await twitterClient.v2.homeTimeline(params);

      const tweets = timeline.data.data || [];
      const includes = timeline.data.includes || {};
      const users = includes.users || [];
      const media = includes.media || [];

      const mapped = tweets.map((tweet: any) => {
        const author = users.find((u: any) => u.id === tweet.author_id);
        const tweetMedia = tweet.attachments?.media_keys?.map((key: string) =>
          media.find((m: any) => m.media_key === key)
        ).filter(Boolean);

        return {
          id: tweet.id,
          text: tweet.text,
          createdAt: tweet.created_at,
          publicMetrics: tweet.public_metrics,
          author: author ? {
            name: author.name,
            username: author.username,
            profileImageUrl: author.profile_image_url,
          } : null,
          media: tweetMedia,
        };
      });

      const ranked = rankTweets(mapped);
      const nextToken = timeline.data.meta?.next_token || null;
      const result = { posts: ranked, nextToken };

      if (!hasSinceId && !hasPagination) {
        timelineCache.set(userId, { data: result, fetchedAt: Date.now() });
      }

      res.json(result);
    } catch (err: any) {
      console.error("[twitter/home-timeline] Error:", err.data || err.message);

      if (err.code === 429 || err.data?.status === 429 || (err.data?.detail || "").includes("Too Many")) {
        const cached = timelineCache.get(userId);
        if (cached) {
          return res.json(cached.data);
        }
        return res.status(429).json({ message: "Rate limited by X. Please wait a minute and try again.", posts: [], nextToken: null });
      }

      const msg = err.data?.detail || err.message || "Failed to fetch home timeline";
      res.status(500).json({ message: msg });
    }
  });

  // --- Dashboard Stats (Free tier + internal data, cached 2 min) ---
  const dashStatsCacheMap = new Map<string, { data: any; fetchedAt: number }>();
  const DASH_STATS_TTL = 2 * 60 * 1000;

  app.get("/api/dashboard/stats", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const cached = dashStatsCacheMap.get(userId);
    if (cached && Date.now() - cached.fetchedAt < DASH_STATS_TTL) {
      return res.json(cached.data);
    }

    try {
      let followers = 0, following = 0, tweetCount = 0, listedCount = 0;
      let apiSucceeded = false;

      const twitterClient = await getTwitterClientForUser(userId) || getTwitterClient();
      if (twitterClient) {
        try {
          const me = await twitterClient.v2.me({ "user.fields": ["public_metrics"] });
          const pm = me.data.public_metrics;
          followers = pm?.followers_count ?? 0;
          following = pm?.following_count ?? 0;
          tweetCount = pm?.tweet_count ?? 0;
          listedCount = (pm as any)?.listed_count ?? 0;
          apiSucceeded = true;
        } catch (apiErr: any) {
          console.warn("[dashboard/stats] v2.me() failed, falling back to snapshots:", apiErr.message);
        }
      }

      if (!apiSucceeded) {
        const latestSnaps = await storage.getFollowerSnapshots(userId, 1);
        if (latestSnaps.length > 0) {
          const snap = latestSnaps[0];
          followers = snap.followerCount;
          following = snap.followingCount;
          tweetCount = snap.tweetCount;
        }
      }

      const allLogs = await storage.getActivityLogs(userId);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      let postsToday = 0, postsThisWeek = 0, repliesToday = 0, repliesThisWeek = 0;
      const postingMap: Record<string, number> = {};

      for (let i = 13; i >= 0; i--) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        postingMap[d.toISOString().slice(0, 10)] = 0;
      }

      const todayKey = todayStart.toISOString().slice(0, 10);

      for (const log of allLogs) {
        const logDate = new Date(log.time);
        const validDate = !isNaN(logDate.getTime());
        const dayKey = validDate ? logDate.toISOString().slice(0, 10) : todayKey;
        const isPost = log.action.toLowerCase().includes("post") || log.action.toLowerCase().includes("tweet");
        const isReply = log.action.toLowerCase().includes("reply") || log.action.toLowerCase().includes("comment");

        if (dayKey in postingMap) {
          postingMap[dayKey] += 1;
        }

        if (!validDate || logDate >= todayStart) {
          if (isPost) postsToday++;
          if (isReply) repliesToday++;
        }
        if (!validDate || logDate >= weekStart) {
          if (isPost) postsThisWeek++;
          if (isReply) repliesThisWeek++;
        }
      }

      const postingHistory = Object.entries(postingMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
          date: new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
          posts: count,
        }));

      const snapshots = await storage.getFollowerSnapshots(userId, 60);
      const followerHistory = snapshots.reverse().map(s => ({
        date: new Date(s.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        followers: s.followerCount,
        following: s.followingCount,
        tweets: s.tweetCount,
      }));

      let followerGrowthToday = 0, followerGrowthWeek = 0;
      if (snapshots.length > 0) {
        const latestFollowers = snapshots[snapshots.length - 1].followerCount;
        const todaySnaps = snapshots.filter(s => new Date(s.recordedAt) >= todayStart);
        if (todaySnaps.length > 0) {
          followerGrowthToday = latestFollowers - todaySnaps[0].followerCount;
        }
        const weekSnaps = snapshots.filter(s => new Date(s.recordedAt) >= weekStart);
        if (weekSnaps.length > 0) {
          followerGrowthWeek = latestFollowers - weekSnaps[0].followerCount;
        }
      }

      const data = {
        followers,
        following,
        tweetCount,
        listedCount,
        postsToday,
        postsThisWeek,
        repliesToday,
        repliesThisWeek,
        followerGrowthToday,
        followerGrowthWeek,
        followerHistory,
        postingHistory,
      };

      dashStatsCacheMap.set(userId, { data, fetchedAt: Date.now() });
      res.json(data);
    } catch (err: any) {
      console.error("[dashboard/stats] error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  // --- Live Twitter Metrics (cached 5 min) ---
  const metricsCacheMap = new Map<string, { data: any; fetchedAt: number }>();
  const METRICS_CACHE_TTL = 5 * 60 * 1000;

  app.get("/api/twitter/metrics", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const twitterClient = await getTwitterClientForUser(userId) || getTwitterClient();
    if (!twitterClient) {
      return res.json({ error: "X account not connected" });
    }

    const cached = metricsCacheMap.get(userId);
    if (cached && Date.now() - cached.fetchedAt < METRICS_CACHE_TTL) {
      return res.json(cached.data);
    }

    try {
      const me = await twitterClient.v2.me({ "user.fields": ["public_metrics"] });
      const twitterUserId = me.data.id;
      const publicMetrics = me.data.public_metrics;

      let totalImpressions = 0;
      let totalLikes = 0;
      let totalRetweets = 0;
      let totalReplies = 0;
      let dailyMetrics: any[] = [];

      try {
        const timelineResult = await twitterClient.v2.userTimeline(twitterUserId, {
          max_results: 100,
          "tweet.fields": ["public_metrics", "created_at"],
          exclude: ["retweets"],
        });

        const tweets: any[] = timelineResult.data?.data ?? [];
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

        dailyMetrics = Object.entries(dailyMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v);
      } catch (timelineErr: any) {
        console.warn("[twitter/metrics] Timeline unavailable (likely needs Basic tier):", timelineErr.message);
        if (cached) {
          totalImpressions = cached.data.impressions ?? 0;
          totalLikes = cached.data.likes ?? 0;
          totalRetweets = cached.data.retweets ?? 0;
          totalReplies = cached.data.replies ?? 0;
          dailyMetrics = cached.data.dailyMetrics ?? [];
        }
      }

      const totalEngagement = totalLikes + totalRetweets + totalReplies;
      const engagementRate = totalImpressions > 0
        ? ((totalEngagement / totalImpressions) * 100).toFixed(2)
        : "0";

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

      metricsCacheMap.set(userId, { data: result, fetchedAt: Date.now() });
      res.json(result);
    } catch (err: any) {
      console.error("[twitter/metrics] Error:", err.message);
      if (cached) {
        return res.json(cached.data);
      }
      res.status(500).json({ error: err.message || "Failed to fetch metrics" });
    }
  });

  // --- Live Audience Peak Times ---
  const peakCacheMap = new Map<string, { data: any; fetchedAt: number }>();

  app.get("/api/twitter/peak-times", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const twitterClient = await getTwitterClientForUser(userId) || getTwitterClient();
    if (!twitterClient) {
      return res.json({ peakTimes: [], topPeak: null });
    }

    const cached = peakCacheMap.get(userId);
    if (cached && Date.now() - cached.fetchedAt < METRICS_CACHE_TTL) {
      return res.json(cached.data);
    }

    try {
      const me = await twitterClient.v2.me();
      const twitterUserId = me.data.id;

      let tweets: any[] = [];
      try {
        const timelineResult = await twitterClient.v2.userTimeline(twitterUserId, {
          max_results: 100,
          "tweet.fields": ["public_metrics", "created_at"],
          exclude: ["retweets"],
        });
        tweets = timelineResult.data?.data ?? [];
      } catch (timelineErr: any) {
        console.warn("[twitter/peak-times] Timeline unavailable (likely needs Basic tier):", timelineErr.message);
        if (cached) {
          return res.json(cached.data);
        }
        return res.json({ peakTimes: [], topPeak: null });
      }

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
      peakCacheMap.set(userId, { data: result, fetchedAt: Date.now() });
      res.json(result);
    } catch (err: any) {
      console.error("[twitter/peak-times] Error:", err.message);
      if (cached) {
        return res.json(cached.data);
      }
      res.status(500).json({ error: err.message || "Failed to fetch peak times" });
    }
  });

  // --- Settings ---
  app.get("/api/settings", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const data = await storage.getSettings(userId);
    res.json(data);
  });

  app.put("/api/settings/:key", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { key } = req.params;
    const { value } = req.body;
    if (!value && value !== "") return res.status(400).json({ message: "value is required" });
    const setting = await storage.upsertSetting(key, value, userId);
    res.json(setting);
  });

  // --- Media Upload ---
  app.post("/api/media/upload", isAuthenticated, (req: any, res: any, next: any) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Maximum size is 50MB." });
        }
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const userId = getUserId(req);
      const url = `/uploads/${req.file.filename}`;
      const mood = (req.body.mood as string) || "Neutral";
      const outfit = (req.body.outfit as string) || "Untagged";
      const item = await storage.createMediaItem({
        userId,
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

  // --- Niche Profiles ---
  app.get("/api/niche-profiles", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const data = await storage.getNicheProfiles(userId);
    res.json(data);
  });

  app.post("/api/niche-profiles", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const profile = await storage.createNicheProfile({ ...req.body, userId });
    res.status(201).json(profile);
  });

  app.delete("/api/niche-profiles/:id", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    await storage.deleteNicheProfile(id, userId);
    res.status(204).send();
  });

  // --- AI Content Generation (Groq) ---
  app.post("/api/generate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { style, topic, seductiveness: sliderValue, imageUrl } = req.body;
      if (!style) return res.status(400).json({ message: "style is required" });

      const settingsData = await storage.getSettings(userId);
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

  app.get("/api/trending-topics", isAuthenticated, async (req: Request, res: Response) => {
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
  app.post("/api/analyze-feed-post", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const {
        postText,
        imageUrl,
        authorFollowers,
        likes,
        replies,
        retweets,
        timeElapsed,
        niche,
        customPrompt,
        authorName,
        authorUsername,
      } = req.body;

      if (!postText) return res.status(400).json({ message: "postText is required" });

      let imageDescription = "";
      if (imageUrl) {
        try {
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
        } catch (visionErr: any) {
          console.error("Vision analysis failed for feed post:", visionErr.message);
          imageDescription = "Image could not be analyzed.";
        }
      }

      const hasCustomStyle = customPrompt?.trim();

      const systemPrompt = `You are an elite social engagement strategist specialized in generating high-visibility comments on X (Twitter).

Your job is to:
1. Analyze a specific X post (text + image if provided).
2. Evaluate the post's viral potential.
3. Generate 5 comments for the post.
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

POST TEXT:
${postText}

IMAGE DESCRIPTION:
${imageDescription || "No image provided"}

POST METRICS:
Author: ${authorName || "Unknown"} (@${authorUsername || "Unknown"})
Author Followers: ${authorFollowers || "Unknown"}
Likes: ${likes || 0}
Replies: ${replies || 0}
Reposts: ${retweets || 0}
Time Since Posted: ${timeElapsed || "Recently"}

NICHE:
${niche || "General"}
${hasCustomStyle ? `\nREMINDER — The user's style instruction for all 5 comments is: "${customPrompt!.trim()}". Follow it exactly.` : ""}`;

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
      console.error("Feed post analysis error:", err);
      res.status(500).json({ message: err.message || "Analysis failed" });
    }
  });

  // --- Extension: Generate Viral Replies ---
  app.post("/api/extension/generate-replies", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const {
        tweetText,
        authorName,
        authorUsername,
        likes,
        replies,
        retweets,
        views,
        customInstruction,
        screenshotBase64,
      } = req.body;

      let extractedText = tweetText || "";
      let extractedMetrics: any = { likes, replies, retweets, views };
      let imageDescription = "";

      if (screenshotBase64 && !tweetText) {
        try {
          const visionResult = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [{
              role: "user",
              content: [
                { type: "image_url", image_url: { url: screenshotBase64 } },
                { type: "text", text: "Extract from this tweet screenshot: 1) The tweet text 2) Author name and handle 3) Metrics (likes, replies, retweets, views if visible). Return as JSON: {\"tweetText\": \"...\", \"authorName\": \"...\", \"authorUsername\": \"...\", \"likes\": 0, \"replies\": 0, \"retweets\": 0, \"views\": 0}" },
              ],
            }],
            temperature: 0.2,
            max_tokens: 500,
          });
          const visionRaw = visionResult.choices[0]?.message?.content || "";
          try {
            const jsonMatch = visionRaw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              extractedText = parsed.tweetText || extractedText;
              extractedMetrics = {
                likes: parsed.likes ?? likes ?? 0,
                replies: parsed.replies ?? replies ?? 0,
                retweets: parsed.retweets ?? retweets ?? 0,
                views: parsed.views ?? views ?? 0,
              };
            }
          } catch { /* keep original values */ }
        } catch (visionErr: any) {
          console.error("[extension/generate-replies] Vision error:", visionErr.message);
        }
      }

      if (!extractedText) {
        return res.status(400).json({ message: "tweetText or screenshotBase64 is required" });
      }

      const likeCount = extractedMetrics.likes || 0;
      const replyCount = extractedMetrics.replies || 0;
      const retweetCount = extractedMetrics.retweets || 0;
      const viewCount = extractedMetrics.views || 0;

      const replyRatio = likeCount > 0 ? replyCount / likeCount : 0;
      const engagementRate = viewCount > 0 ? ((likeCount + replyCount + retweetCount) / viewCount) * 100 : 0;
      let opportunityScore = 50;
      if (replyRatio < 0.05 && likeCount > 10) opportunityScore += 20;
      if (engagementRate > 2) opportunityScore += 15;
      if (viewCount > 1000 && replyCount < 20) opportunityScore += 10;
      if (likeCount > 50) opportunityScore += 5;
      opportunityScore = Math.min(100, Math.max(0, opportunityScore));

      const insights: string[] = [];
      if (replyRatio < 0.05 && likeCount > 5) insights.push("Low reply competition");
      if (engagementRate > 3) insights.push("High engagement velocity");
      if (viewCount > 5000 && replyCount < 30) insights.push("Viral potential — under-replied");
      if (likeCount > 100) insights.push("High-visibility post");

      const hasCustomStyle = customInstruction?.trim();

      const systemPrompt = `You are an elite social engagement strategist. Generate 5 viral reply suggestions for a tweet on X (Twitter).

${hasCustomStyle
  ? `REPLY STYLE — MANDATORY:
Every reply MUST follow these style instructions from the user:
"${customInstruction!.trim()}"
This is the #1 priority. Apply it to tone, vocabulary, energy, length, slang, emoji usage, and personality.
Do NOT fall back to generic or safe defaults.\n`
  : `REPLY STYLE:
- Replies must feel 100% human-written
- No generic praise ("Love this!", "So true!")
- No spammy tone or bot-like enthusiasm
- No emoji overload
- Add insight, curiosity, perspective, or subtle authority
- Replies must expand the conversation\n`}

Generate 5 different reply options with varied strategies:
1. Authority/Expert angle
2. Curious/Question angle
3. Relatable/Personal angle
4. Witty/Clever angle
5. Contrarian/Fresh perspective angle

Return ONLY a JSON object with this structure:
{
  "replies": ["reply1", "reply2", "reply3", "reply4", "reply5"]
}

Return ONLY the JSON. No markdown, no extra text.`;

      const userPrompt = `TWEET TO REPLY TO:
"${extractedText}"

Author: ${authorName || "Unknown"} (@${authorUsername || "unknown"})
Likes: ${likeCount}
Replies: ${replyCount}
Reposts: ${retweetCount}
Views: ${viewCount}
${hasCustomStyle ? `\nREMINDER — Style instruction: "${customInstruction!.trim()}". Follow it exactly for all 5 replies.` : ""}`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 1024,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      let replySuggestions: string[] = [];
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          replySuggestions = parsed.replies || [];
        }
      } catch {
        replySuggestions = [raw.trim()];
      }

      res.json({
        replies: replySuggestions,
        opportunityScore,
        insights,
        tweetText: extractedText,
      });
    } catch (err: any) {
      console.error("[extension/generate-replies] error:", err.message);
      res.status(500).json({ message: err.message || "Failed to generate replies" });
    }
  });

  app.post("/api/analyze-post", isAuthenticated, async (req: Request, res: Response) => {
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

  // --- Screenshot Scan ---
  app.post("/api/scan-screenshot", isAuthenticated, (req: any, res: any, next: any) => {
    upload.single("screenshot")(req, res, (err: any) => {
      if (err) return res.status(400).json({ message: err.message || "Upload failed" });
      next();
    });
  }, async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No screenshot uploaded" });

      const trendTopic = (req.body.trendTopic as string) || "";
      const trendGrowth = (req.body.trendGrowth as string) || "";
      const trendContext = (req.body.trendContext as string) || "";
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
      let extracted: any;
      try {
        const jsonMatch = extractedRaw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[0]);
        } else {
          extracted = { postText: extractedRaw.trim() || null };
        }
      } catch (parseErr: any) {
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

  // --- Seed endpoint ---
  app.post("/api/seed", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const existingTweets = await storage.getTweets(userId);
    if (existingTweets.length > 0) {
      return res.json({ message: "Data already seeded" });
    }

    await Promise.all([
      storage.createTweet({ userId, text: "tell me honestly, am i your type? \u{1f97a}\u{1f449}\u{1f448}", style: "Direct Question", status: "queued", imageUrl: null }),
      storage.createTweet({ userId, text: "can i dm youuuuu?!! \u{1f629} don't ignore me", style: "Engagement Bait", status: "posted", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400" }),
      storage.createTweet({ userId, text: "free pic if you stop scrolling and say hi \u{1f607}", style: "Soft Tease", status: "queued", imageUrl: null }),
    ]);

    await Promise.all([
      storage.createMediaItem({ userId, url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400", mood: "Playful", outfit: "Summer Dress", usageCount: 2, lastUsed: "3 days ago", risk: "safe" }),
      storage.createMediaItem({ userId, url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400", mood: "Confident", outfit: "Streetwear", usageCount: 0, lastUsed: "Never", risk: "safe" }),
      storage.createMediaItem({ userId, url: "https://images.unsplash.com/photo-1529139513477-3235a14a139b?auto=format&fit=crop&q=80&w=400", mood: "Seductive", outfit: "Evening Wear", usageCount: 5, lastUsed: "12 hours ago", risk: "spicy" }),
    ]);

    await Promise.all([
      storage.createEngagement({ userId, user: "@techbro_99", text: "AI is completely overhyped right now.", sentiment: "neutral", suggestedReply: "Is it? Or are you just not using the right prompts? \u{1f609}", time: "2m ago", status: "pending" }),
      storage.createEngagement({ userId, user: "@founder_x", text: "Just deployed my first Next.js app! So exhausted but worth it.", sentiment: "positive", suggestedReply: "Love that energy. Rest up, you earned it. \u2615\ufe0f\u{1f5a4}", time: "15m ago", status: "pending" }),
      storage.createEngagement({ userId, user: "@crypto_king", text: "Markets are bleeding today...", sentiment: "negative", suggestedReply: "Perfect time to look away from the charts and focus on building... or other things. \u{1f485}", time: "1h ago", status: "pending" }),
    ]);

    await Promise.all([
      storage.createFollowerInteraction({ userId, user: "@new_fan_1", action: "Followed you", time: "5m ago" }),
      storage.createFollowerInteraction({ userId, user: "@loyal_supporter", action: "Liked 3 posts", time: "1h ago" }),
    ]);

    await Promise.all([
      storage.createTrend({ tag: "#AIArtwork", volume: "124K", fitScore: 92, trending: "up" }),
      storage.createTrend({ tag: "Tech Layoffs", volume: "89K", fitScore: 45, trending: "down" }),
      storage.createTrend({ tag: "#BuildInPublic", volume: "45K", fitScore: 88, trending: "up" }),
      storage.createTrend({ tag: "Late Night Coding", volume: "12K", fitScore: 95, trending: "up" }),
    ]);

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
      await storage.upsertSetting(s.key, s.value, userId);
    }

    res.status(201).json({ message: "Seed data created successfully" });
  });

  return httpServer;
}
