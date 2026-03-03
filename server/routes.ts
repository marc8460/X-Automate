import type { Express } from "express";
import { createServer, type Server } from "http";
import https from "https";
import path from "path";
import fs from "fs";
import multer from "multer";
import Groq from "groq-sdk";
import { testTwitterConnection, getTwitterClient, analyzeUserFeed, getCached, setCache } from "./twitter";
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
  insertNicheProfileSchema,
  insertTrendingPostSchema,
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

  // --- Twitter Connection ---
  app.get("/api/twitter/status", async (_req, res) => {
    try {
      const result = await testTwitterConnection();
      res.json(result);
    } catch (err: any) {
      res.json({ connected: false, error: err.message || "Unknown error" });
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
  const trendsCache = new Map<string, { data: any; expiresAt: number }>();

  async function fetchGoogleTrendsRSS(geo: string): Promise<any[]> {
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

            let startedAgoMinutes = 60;
            let startedAgo = "recently";
            if (pubDate) {
              const pubTime = new Date(pubDate).getTime();
              const diff = Date.now() - pubTime;
              startedAgoMinutes = Math.max(1, Math.round(diff / 60000));
              if (startedAgoMinutes < 60) {
                startedAgo = `${startedAgoMinutes} min ago`;
              } else if (startedAgoMinutes < 1440) {
                startedAgo = `${Math.round(startedAgoMinutes / 60)} hours ago`;
              } else {
                startedAgo = `${Math.round(startedAgoMinutes / 1440)} days ago`;
              }
            }

            return {
              id: i + 1,
              title,
              traffic: trafficRaw,
              trafficNumber: parseTrafficNumber(trafficRaw),
              growthPercent: "+1,000%",
              status: "Active",
              startedAgo,
              startedAgoMinutes,
              relatedQueries,
              articles,
              searchQuery: title,
              image: picture,
            };
          });
          resolve(topics);
        });
        res.on("error", reject);
      }).on("error", reject);
    });
  }

  app.get("/api/trending-topics", async (req, res) => {
    try {
      const geo = (req.query.geo as string) || "US";
      const category = (req.query.category as string) || "all";
      const timeWindow = (req.query.timeWindow as string) || "24h";
      const sortBy = (req.query.sortBy as string) || "volume";

      const cacheKey = `trends:${geo}:${category}:${timeWindow}`;
      const cached = trendsCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        let topics = [...cached.data.topics];
        if (sortBy === "volume") {
          topics.sort((a: any, b: any) => parseTrafficNumber(b.trafficNumber) - parseTrafficNumber(a.trafficNumber));
        } else if (sortBy === "recent") {
          topics.sort((a: any, b: any) => (a.startedAgoMinutes || 999) - (b.startedAgoMinutes || 999));
        }
        return res.json({ ...cached.data, topics, sortBy });
      }

      let topics: any[] = [];
      let source = "google_trends";

      try {
        topics = await fetchGoogleTrendsRSS(geo);
        source = "google_trends";
      } catch (rssErr: any) {
        console.error("Google Trends RSS failed, using AI fallback:", rssErr.message);
        source = "ai_generated";

        const countryNames: Record<string, string> = {
          US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
          DE: "Germany", FR: "France", BR: "Brazil", IN: "India", JP: "Japan",
          KR: "South Korea", MX: "Mexico", IT: "Italy", ES: "Spain", NL: "Netherlands",
          SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", PL: "Poland",
          AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru", NG: "Nigeria",
          ZA: "South Africa", EG: "Egypt", SA: "Saudi Arabia", AE: "UAE",
          TR: "Turkey", RU: "Russia", UA: "Ukraine", ID: "Indonesia",
          PH: "Philippines", TH: "Thailand", VN: "Vietnam", MY: "Malaysia",
          SG: "Singapore", TW: "Taiwan", HK: "Hong Kong", NZ: "New Zealand",
          IE: "Ireland", PT: "Portugal", CH: "Switzerland", AT: "Austria",
          BE: "Belgium", CZ: "Czech Republic", RO: "Romania", GR: "Greece",
          IL: "Israel", PK: "Pakistan", BD: "Bangladesh",
        };
        const countryName = countryNames[geo] || geo;

        const categoryLabels: Record<string, string> = {
          all: "all categories",
          entertainment: "entertainment, celebrities, movies, music, gaming",
          business: "business, finance, economy",
          technology: "technology, AI, software, crypto",
          sports: "sports, football, basketball, soccer, F1",
          health: "health, medicine, fitness",
          science: "science, space, climate",
          politics: "politics, elections, government",
        };

        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `Generate trending topics matching Google Trends "Trending Now". Return ONLY a JSON array, 20 items. No markdown.
[{"title":"...","traffic":"500K+","trafficNumber":500000,"growthPercent":"+1,000%","startedAgo":"2 hours ago","startedAgoMinutes":120,"relatedQueries":["q1","q2","q3"],"category":"..."}]`,
            },
            {
              role: "user",
              content: `Generate 20 trending topics for ${countryName} (${geo}), focusing on: ${categoryLabels[category] || "all categories"}. Topics must be SPECIFIC — real people, events, matches, not generic themes. Sorted by search volume.`,
            },
          ],
          temperature: 0.85,
          max_tokens: 4096,
        });

        const raw = completion.choices[0]?.message?.content || "[]";
        try {
          const jsonMatch = raw.match(/\[[\s\S]*\]/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
          topics = parsed.map((t: any, i: number) => ({
            id: i + 1,
            title: t.title || "Unknown",
            traffic: t.traffic || "10K+",
            trafficNumber: t.trafficNumber || (20 - i) * 10000,
            growthPercent: t.growthPercent || "+500%",
            status: "Active",
            startedAgo: t.startedAgo || "recently",
            startedAgoMinutes: t.startedAgoMinutes || (i + 1) * 30,
            relatedQueries: t.relatedQueries || [],
            articles: [],
            searchQuery: t.title || "",
            category: t.category || "general",
          }));
        } catch {
          topics = [];
        }
      }

      if (sortBy === "volume") {
        topics.sort((a, b) => (b.trafficNumber || 0) - (a.trafficNumber || 0));
      } else if (sortBy === "recent") {
        topics.sort((a, b) => (a.startedAgoMinutes || 999) - (b.startedAgoMinutes || 999));
      }

      const result = { topics, geo, category, timeWindow, sortBy, source, fetchedAt: new Date().toISOString() };
      trendsCache.set(cacheKey, { data: result, expiresAt: Date.now() + 5 * 60 * 1000 });

      res.json(result);
    } catch (err: any) {
      console.error("Trending topics error:", err);
      res.status(500).json({ message: err.message || "Failed to fetch trends" });
    }
  });

  function parseTrafficNumber(traffic: string | number): number {
    if (typeof traffic === "number") return traffic;
    if (!traffic) return 0;
    const cleaned = traffic.replace(/[+,]/g, "").trim();
    const match = cleaned.match(/([\d.]+)\s*(M|K)?/i);
    if (!match) return parseInt(cleaned) || 0;
    const num = parseFloat(match[1]);
    const suffix = (match[2] || "").toUpperCase();
    if (suffix === "M") return num * 1000000;
    if (suffix === "K") return num * 1000;
    return num;
  }

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

      const systemPrompt = `You are an elite social engagement strategist specialized in identifying emerging trends and generating high-visibility comments on X (Twitter).

Your job is to:
1. Analyze a rising topic (from Google Trends or other trend signals).
2. Analyze a specific X post (text + image if provided).
3. Evaluate both the trend momentum and the post's viral potential.
4. Generate high-quality, human-like comments optimized for visibility and engagement.

IMPORTANT RULES:
- Comments must feel 100% human.
- No generic praise (avoid "Love this!", "So true!", etc.).
- No spammy tone.
- No emojis overload.
- No bot-like enthusiasm.
- Add insight, curiosity, perspective, or subtle authority.
- Comments must expand the conversation, not repeat the post.
- If engagement velocity is low relative to follower count, recommend skipping the post and explain why.

Optimize for:
- Early engagement advantage
- Psychological triggers
- Curiosity gaps
- Authority positioning
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

COMMENT STYLE MODE:
${commentStyle || "Balanced"}`;

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
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            {
              type: "text",
              text: `This is a screenshot of an X/Twitter post. Extract ALL information you can see. Return ONLY valid JSON:
{
  "postText": "the full text content of the post/tweet",
  "authorUsername": "the @username if visible",
  "authorDisplayName": "display name if visible",
  "authorFollowers": "follower count if visible (e.g. '50K')",
  "likes": number or 0,
  "replies": number or 0,
  "retweets": number or 0,
  "views": number or 0,
  "timeElapsed": "time since posted if visible (e.g. '2h', '3m')",
  "hasImage": true/false if the post contains an image,
  "imageDescription": "if the post contains an image, describe what's in it in detail - scene, emotions, meme structure, cultural references. Otherwise null",
  "hashtags": ["any", "hashtags", "visible"],
  "isQuotePost": true/false,
  "quotedText": "text of quoted post if it's a quote post, otherwise null"
}
Return ONLY the JSON. No markdown, no extra text.`
            },
          ],
        }],
        temperature: 0.2,
        max_tokens: 1000,
      });

      const extractedRaw = extractionResult.choices[0]?.message?.content || "{}";
      let extracted: any;
      try {
        const jsonMatch = extractedRaw.match(/\{[\s\S]*\}/);
        extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        extracted = { postText: "Could not extract post content from screenshot" };
      }

      if (!extracted.postText || extracted.postText === "Could not extract post content from screenshot") {
        fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: "Could not read the post from the screenshot. Try a clearer screenshot showing the full post.", extracted });
      }

      const systemPrompt = `You are an elite social engagement strategist specialized in identifying emerging trends and generating high-visibility comments on X (Twitter).

Your job is to:
1. Analyze a rising topic (from Google Trends or other trend signals).
2. Analyze a specific X post (text + image if provided).
3. Evaluate both the trend momentum and the post's viral potential.
4. Generate high-quality, human-like comments optimized for visibility and engagement.

IMPORTANT RULES:
- Comments must feel 100% human.
- No generic praise (avoid "Love this!", "So true!", etc.).
- No spammy tone.
- No emojis overload.
- No bot-like enthusiasm.
- Add insight, curiosity, perspective, or subtle authority.
- Comments must expand the conversation, not repeat the post.
- If engagement velocity is low relative to follower count, recommend skipping the post and explain why.

Optimize for:
- Early engagement advantage
- Psychological triggers
- Curiosity gaps
- Authority positioning
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

COMMENT STYLE MODE:
${commentStyle}`;

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
