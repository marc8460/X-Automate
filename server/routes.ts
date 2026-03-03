import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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

  // --- Media Items ---
  app.get("/api/media", async (_req, res) => {
    const data = await storage.getMediaItems();
    res.json(data);
  });

  app.post("/api/media", async (req, res) => {
    const parsed = insertMediaItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const item = await storage.createMediaItem(parsed.data);
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

    await Promise.all([
      storage.createActivityLog({ action: "Tweet Posted", detail: "can i dm youuuuu?!! 😩", time: "2m ago", status: "success" }),
      storage.createActivityLog({ action: "Auto-Reply", detail: "to @techbro_99", time: "15m ago", status: "success" }),
      storage.createActivityLog({ action: "Media Upload", detail: "Summer Dress (Vault #12)", time: "1h ago", status: "success" }),
      storage.createActivityLog({ action: "Trend Detected", detail: "#AIArtwork (92% fit)", time: "2h ago", status: "info" }),
    ]);

    await Promise.all([
      storage.createAnalyticsData({ name: "Mon", engagement: 400, followers: 240 }),
      storage.createAnalyticsData({ name: "Tue", engagement: 300, followers: 139 }),
      storage.createAnalyticsData({ name: "Wed", engagement: 550, followers: 980 }),
      storage.createAnalyticsData({ name: "Thu", engagement: 278, followers: 390 }),
      storage.createAnalyticsData({ name: "Fri", engagement: 189, followers: 480 }),
      storage.createAnalyticsData({ name: "Sat", engagement: 239, followers: 380 }),
      storage.createAnalyticsData({ name: "Sun", engagement: 349, followers: 430 }),
    ]);

    await Promise.all([
      storage.createPeakTime({ day: "Mon", time: "10:00 PM", score: 95 }),
      storage.createPeakTime({ day: "Tue", time: "11:30 PM", score: 88 }),
      storage.createPeakTime({ day: "Wed", time: "09:15 PM", score: 92 }),
      storage.createPeakTime({ day: "Thu", time: "10:45 PM", score: 98 }),
      storage.createPeakTime({ day: "Fri", time: "12:00 AM", score: 85 }),
      storage.createPeakTime({ day: "Sat", time: "01:30 AM", score: 78 }),
      storage.createPeakTime({ day: "Sun", time: "10:00 PM", score: 82 }),
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
      await storage.upsertSetting(s.key, s.value);
    }

    res.status(201).json({ message: "Seed data created successfully" });
  });

  return httpServer;
}
