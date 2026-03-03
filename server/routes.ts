import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import Groq from "groq-sdk";
import { getTwitterClient, testTwitterConnection, analyzeUserFeed, getCached, setCache } from "./twitter";
import { storage } from "./storage";
import type { TrendingPostFilters } from "./storage";
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
  insertCommentSuggestionSchema,
  insertBehaviorLimitSchema,
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

  // --- Niches ---
  app.get("/api/niches", async (_req, res) => {
    const niches = await storage.getNicheProfiles();
    res.json(niches);
  });

  app.post("/api/niches", async (req, res) => {
    const parsed = insertNicheProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const niche = await storage.createNicheProfile(parsed.data);
    res.status(201).json(niche);
  });

  app.delete("/api/niches/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteNicheProfile(id);
    res.status(204).send();
  });

  app.post("/api/niches/auto-detect", async (_req, res) => {
    try {
      const twitterClient = getTwitterClient();
      let suggestions: { name: string; keywords: string; confidence: number }[] = [];

      if (twitterClient) {
        try {
          suggestions = await analyzeUserFeed(twitterClient);
        } catch (twitterErr: any) {
          const errDetail = twitterErr?.message || "";
          console.warn("Twitter feed analysis failed, using AI fallback:", errDetail);
        }
      }

      if (suggestions.length === 0) {
        const systemPrompt = `You are a niche detection engine for a female influencer on Twitter/X.
Based on common high-engagement niches for influencer accounts, suggest 5-6 trending content niches.
Each niche should have a name and relevant search keywords.

Return ONLY a JSON array of objects with keys: name (string), keywords (comma-separated string), confidence (number 50-95).
Example: [{"name": "Tech & AI", "keywords": "ai, startup, saas, tech, coding", "confidence": 85}]
No explanation.`;

        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.7,
          response_format: { type: "json_object" }
        });

        const raw = completion.choices[0]?.message?.content || "{\"niches\": []}";
        const data = JSON.parse(raw);
        suggestions = Array.isArray(data) ? data : (data.niches || data.suggestions || []);
      }

      const created = [];
      for (const s of suggestions) {
        const niche = await storage.createNicheProfile({
          name: s.name,
          keywords: s.keywords,
          source: "auto",
          active: true,
        });
        created.push({ ...niche, confidence: s.confidence });
      }
      res.status(201).json(created);
    } catch (err: any) {
      console.error("Auto-detect error:", err);
      res.status(500).json({ message: err.message || "Failed to auto-detect niches" });
    }
  });

  // --- Trending Posts ---
  app.get("/api/trending-posts", async (req, res) => {
    const filters: TrendingPostFilters = {};
    if (req.query.nicheId) filters.nicheId = parseInt(req.query.nicheId as string);
    if (req.query.minLikes) filters.minLikes = parseInt(req.query.minLikes as string);
    if (req.query.minScore) filters.minTrendScore = parseInt(req.query.minScore as string);
    if (req.query.lang) filters.language = req.query.lang as string;
    if (req.query.hours) filters.hoursAgo = parseInt(req.query.hours as string);
    if (req.query.sort) filters.sortBy = req.query.sort as "score" | "velocity" | "recent";

    const hasFilters = Object.keys(filters).length > 0;
    const posts = hasFilters
      ? await storage.getTrendingPostsFiltered(filters)
      : await storage.getTrendingPosts();

    const postsWithComments = await Promise.all(posts.map(async (post) => {
      const comments = await storage.getCommentsByPost(post.id);
      return { ...post, comments };
    }));
    res.json(postsWithComments);
  });

  app.post("/api/trending-posts/discover", async (req, res) => {
    try {
      const { nicheId, language, minFaves, hoursBack } = req.body;
      if (!nicheId) return res.status(400).json({ message: "nicheId is required" });

      const niches = await storage.getNicheProfiles();
      const niche = niches.find(n => n.id === nicheId);
      if (!niche) return res.status(404).json({ message: "Niche not found" });

      const twitterClient = getTwitterClient();
      const lang = language || "en";
      const minFavesVal = minFaves || 10;

      const settingsData = await storage.getSettings();
      const n8nWebhookUrl = settingsData.find(s => s.key === "n8nWebhookUrl")?.value;

      if (n8nWebhookUrl) {
        try {
          console.log(`Triggering n8n webhook for niche "${niche.name}" with keywords: ${niche.keywords}`);
          const n8nPayload = {
            nicheId: niche.id,
            nicheName: niche.name,
            keywords: niche.keywords,
            language: lang,
            minFaves: minFavesVal,
            callbackUrl: `/api/trending-posts/import`,
          };
          const n8nRes = await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(n8nPayload),
            signal: AbortSignal.timeout(15000),
          });

          if (n8nRes.ok) {
            const n8nData = await n8nRes.json().catch(() => null);
            if (n8nData?.posts && Array.isArray(n8nData.posts) && n8nData.posts.length > 0) {
              const importedPosts = [];
              const maxRawScore = Math.max(...n8nData.posts.map((p: any) => {
                const ageMin = Math.max(1, p.postAge || p.post_age || 60);
                const likes = p.likes || p.favorite_count || p.like_count || 0;
                const replies = p.replies || p.reply_count || 0;
                const retweets = p.retweets || p.retweet_count || 0;
                const followers = p.authorFollowers || p.author_followers || p.followers_count || 1;
                const total = likes + replies + retweets;
                return (likes / ageMin * 3) + (replies / ageMin * 5) + (retweets / ageMin * 4) + (total / Math.max(followers, 1) * 100);
              }), 1);

              for (const p of n8nData.posts) {
                const handle = p.authorHandle || p.author_handle || p.username || p.screen_name || "@unknown";
                const tweetId = p.tweetId || p.tweet_id || p.id_str || p.id?.toString() || null;
                const likes = p.likes || p.favorite_count || p.like_count || 0;
                const replies = p.replies || p.reply_count || 0;
                const retweets = p.retweets || p.retweet_count || 0;
                const views = p.views || p.impression_count || p.impressions || 0;
                const followers = p.authorFollowers || p.author_followers || p.followers_count || p.user?.followers_count || 0;
                const text = p.postText || p.post_text || p.text || p.full_text || "";
                const ageMin = Math.max(1, p.postAge || p.post_age || 60);
                const total = likes + replies + retweets;
                const url = p.postUrl || p.post_url || p.url || (tweetId ? `https://x.com/i/status/${tweetId}` : "");
                const imageUrl = p.postImageUrl || p.post_image_url || p.image_url || p.media_url || null;

                const rawScore = (likes / ageMin * 3) + (replies / ageMin * 5) + (retweets / ageMin * 4) + (total / Math.max(followers, 1) * 100);
                const trendScore = Math.min(100, Math.round((rawScore / maxRawScore) * 100));
                const status = trendScore > 70 ? "viral" : trendScore >= 30 ? "trending" : "rising";
                const velocity = Math.round(total / Math.max(1, ageMin / 60));

                const existing = tweetId ? await storage.getTrendingPostByTweetId(tweetId) : null;
                if (existing) continue;

                const post = await storage.createTrendingPost({
                  nicheId: niche.id,
                  authorHandle: handle.startsWith("@") ? handle : `@${handle}`,
                  authorFollowers: followers,
                  postText: text,
                  postUrl: url,
                  postImageUrl: imageUrl,
                  tweetId,
                  likes, replies, retweets, views,
                  trendScore, status,
                  source: "n8n",
                  discoveredAt: new Date().toISOString(),
                  engagementVelocity: velocity,
                  language: lang,
                  postAge: Math.round(ageMin),
                  nicheMatchScore: null,
                });
                importedPosts.push(post);
              }
              console.log(`n8n returned ${n8nData.posts.length} posts, imported ${importedPosts.length}`);
              return res.status(201).json(importedPosts);
            }
            console.log("n8n webhook responded OK but returned no posts, triggering async scrape");
            return res.status(201).json([]);
          } else {
            console.warn(`n8n webhook returned ${n8nRes.status}, falling back`);
          }
        } catch (n8nErr: any) {
          console.warn("n8n webhook failed:", n8nErr.message);
        }
      }

      let useFallback = !twitterClient;
      
      if (twitterClient) {
        const cacheKey = `discover:${nicheId}:${lang}`;
        const cachedPosts = getCached(cacheKey);
        if (cachedPosts) {
          return res.status(200).json(cachedPosts);
        }

        try {
          const keywords = niche.keywords.split(",").map((k: string) => k.trim()).filter(Boolean);
          const query = `(${keywords.join(" OR ")}) -is:retweet lang:${lang}`;
          console.log(`Twitter v2 search query: "${query}"`);

          const searchResult = await twitterClient.v2.search(query, {
            max_results: 50,
            sort_order: "relevancy",
            "tweet.fields": ["public_metrics", "created_at", "attachments", "lang"],
            expansions: ["author_id", "attachments.media_keys"],
            "user.fields": ["username", "public_metrics", "profile_image_url"],
            "media.fields": ["url", "preview_image_url", "type"],
          });

          const users = searchResult.includes?.users || [];
          const media = searchResult.includes?.media || [];
          let tweetsArray: any[] = [];
          if (searchResult.tweets && Array.isArray(searchResult.tweets)) {
            tweetsArray = searchResult.tweets;
          } else if (searchResult.data && Array.isArray(searchResult.data)) {
            tweetsArray = searchResult.data;
          } else if (searchResult.data && typeof searchResult.data === 'object' && (searchResult.data as any).data) {
            tweetsArray = (searchResult.data as any).data || [];
          }

          console.log(`Twitter v2 search returned ${tweetsArray.length} tweets`);

          if (tweetsArray.length === 0) {
            console.log("Twitter returned 0 results for this query — returning empty (no fallback)");
            return res.status(201).json([]);
          }

          const rawPosts = [];
          for (const tweet of tweetsArray) {
            const author = users.find((u: any) => u.id === tweet.author_id);
            const tweetMedia = tweet.attachments?.media_keys?.map(
              (key: string) => media.find((m: any) => m.media_key === key)
            ).filter(Boolean) || [];
            const imageMedia = tweetMedia.find((m: any) => m.type === "photo");

            const metrics = tweet.public_metrics || { like_count: 0, reply_count: 0, retweet_count: 0 };
            
            if (metrics.like_count < minFavesVal) continue;
            const postAgeMinutes = tweet.created_at
              ? Math.max(1, (Date.now() - new Date(tweet.created_at).getTime()) / 60000)
              : 60;
            const authorFollowers = author?.public_metrics?.followers_count || 1;

            const likesPerMin = metrics.like_count / postAgeMinutes;
            const repliesPerMin = metrics.reply_count / postAgeMinutes;
            const retweetsPerMin = metrics.retweet_count / postAgeMinutes;
            const totalEngagement = metrics.like_count + metrics.reply_count + metrics.retweet_count;
            const engagementRatio = totalEngagement / Math.max(authorFollowers, 1);

            const rawScore = (likesPerMin * 3) + (repliesPerMin * 5) + (retweetsPerMin * 4) + (engagementRatio * 100);
            const velocity = Math.round(totalEngagement / Math.max(1, postAgeMinutes / 60));

            rawPosts.push({
              tweet,
              author,
              imageMedia,
              metrics,
              rawScore,
              velocity,
              postAgeMinutes: Math.round(postAgeMinutes),
            });
          }

          const maxRawScore = Math.max(...rawPosts.map(p => p.rawScore), 1);
          const discoveredPosts = [];

          for (const p of rawPosts) {
            const existing = await storage.getTrendingPostByTweetId(p.tweet.id);
            if (existing) continue;

            const trendScore = Math.min(100, Math.round((p.rawScore / maxRawScore) * 100));
            const status = trendScore > 70 ? "viral" : trendScore >= 30 ? "trending" : "rising";

            const post = await storage.createTrendingPost({
              nicheId,
              authorHandle: p.author ? `@${p.author.username}` : "@unknown",
              authorFollowers: p.author?.public_metrics?.followers_count || 0,
              postText: p.tweet.text,
              postUrl: `https://twitter.com/i/status/${p.tweet.id}`,
              postImageUrl: p.imageMedia?.url || p.imageMedia?.preview_image_url || null,
              tweetId: p.tweet.id,
              likes: p.metrics.like_count,
              replies: p.metrics.reply_count,
              retweets: p.metrics.retweet_count,
              views: p.metrics.impression_count || 0,
              trendScore,
              status,
              source: "live",
              discoveredAt: new Date().toISOString(),
              engagementVelocity: p.velocity,
              language: lang,
              postAge: p.postAgeMinutes,
              nicheMatchScore: null,
            });
            discoveredPosts.push(post);
          }

          setCache(cacheKey, discoveredPosts, 600);
          return res.status(201).json(discoveredPosts);
        } catch (twitterErr: any) {
          const errDetail = twitterErr?.data?.detail || twitterErr?.data?.title || twitterErr?.message || "";
          const errCode = twitterErr?.code || twitterErr?.data?.status || "";
          console.warn(`Twitter search failed [${errCode}]:`, errDetail);
          console.warn("Full Twitter error:", JSON.stringify(twitterErr?.data || twitterErr?.message || twitterErr, null, 2));
          useFallback = true;
        }
      }
      
      if (useFallback) {
        const systemPrompt = `You are a trend discovery engine for Twitter/X.
Generate 5-8 realistic trending posts for the niche: "${niche.name}" with keywords: "${niche.keywords}".
Language preference: ${lang}.
For each post, include:
- authorHandle: a realistic twitter handle
- authorFollowers: realistic follower count (10k to 500k)
- postText: high-engagement tweet content relevant to the niche
- postUrl: a dummy twitter URL
- postImageUrl: For about 60% of posts, include a realistic Unsplash image URL. For the remaining ~40%, set to null.
- likes: realistic engagement (500 to 50000)
- replies: realistic engagement (50 to 5000)
- retweets: realistic engagement (100 to 10000)
- views: realistic view count (likes * 10 to likes * 50)
- postAge: minutes since posted (5 to 720)
- engagementVelocity: points per hour (10 to 1000)

Return ONLY a JSON array wrapped in a "posts" key. No explanation.`;

        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.8,
          response_format: { type: "json_object" }
        });

        const raw = completion.choices[0]?.message?.content || "{\"posts\": []}";
        const data = JSON.parse(raw);
        const generatedPosts = Array.isArray(data) 
          ? data 
          : (data.posts || data.trending_posts || data.results || data.tweets || Object.values(data).find(v => Array.isArray(v)) || []);

        const maxRawScore = Math.max(...generatedPosts.map((p: any) => {
          const ageMin = Math.max(1, p.postAge || 60);
          const total = (p.likes || 0) + (p.replies || 0) + (p.retweets || 0);
          return ((p.likes || 0) / ageMin * 3) + ((p.replies || 0) / ageMin * 5) + ((p.retweets || 0) / ageMin * 4) + (total / Math.max(p.authorFollowers || 1, 1) * 100);
        }), 1);

        const discoveredPosts = [];
        for (const p of generatedPosts) {
          const ageMin = Math.max(1, p.postAge || 60);
          const total = (p.likes || 0) + (p.replies || 0) + (p.retweets || 0);
          const rawScore = ((p.likes || 0) / ageMin * 3) + ((p.replies || 0) / ageMin * 5) + ((p.retweets || 0) / ageMin * 4) + (total / Math.max(p.authorFollowers || 1, 1) * 100);
          const trendScore = Math.min(100, Math.round((rawScore / maxRawScore) * 100));
          const status = trendScore > 70 ? "viral" : trendScore >= 30 ? "trending" : "rising";
          const velocity = Math.round(total / Math.max(1, ageMin / 60));

          const post = await storage.createTrendingPost({
            nicheId,
            authorHandle: p.authorHandle || "@user",
            authorFollowers: p.authorFollowers || 1000,
            postText: p.postText || "",
            postUrl: p.postUrl || "https://twitter.com/status/123",
            postImageUrl: p.postImageUrl || null,
            tweetId: null,
            likes: p.likes || 0,
            replies: p.replies || 0,
            retweets: p.retweets || 0,
            views: p.views || Math.round((p.likes || 500) * (15 + Math.random() * 35)),
            trendScore,
            status,
            source: "simulated",
            discoveredAt: new Date().toISOString(),
            engagementVelocity: velocity,
            language: lang,
            postAge: Math.round(ageMin),
            nicheMatchScore: null,
          });
          discoveredPosts.push(post);
        }

        res.status(201).json(discoveredPosts);
      }
    } catch (err: any) {
      console.error("Discovery error:", err);
      res.status(500).json({ message: err.message || "Discovery failed" });
    }
  });

  app.post("/api/trending-posts/import", async (req, res) => {
    try {
      const { posts, nicheId } = req.body;
      if (!Array.isArray(posts) || posts.length === 0) {
        return res.status(400).json({ message: "Expected an array of posts" });
      }

      const allNiches = await storage.getNicheProfiles();
      const niche = nicheId ? allNiches.find(n => n.id === nicheId) : null;
      const targetNicheId = niche?.id || nicheId || 0;

      const imported = [];
      const now = new Date();

      const maxRawScore = Math.max(...posts.map((p: any) => {
        const ageMin = Math.max(1, p.postAge || p.post_age || 60);
        const likes = p.likes || p.favorite_count || p.like_count || 0;
        const replies = p.replies || p.reply_count || 0;
        const retweets = p.retweets || p.retweet_count || 0;
        const followers = p.authorFollowers || p.author_followers || p.followers_count || 1;
        const total = likes + replies + retweets;
        return (likes / ageMin * 3) + (replies / ageMin * 5) + (retweets / ageMin * 4) + (total / Math.max(followers, 1) * 100);
      }), 1);

      for (const p of posts) {
        const handle = p.authorHandle || p.author_handle || p.username || p.screen_name || p.user?.screen_name || "@unknown";
        const tweetId = p.tweetId || p.tweet_id || p.id_str || p.id?.toString() || null;
        const likes = p.likes || p.favorite_count || p.like_count || 0;
        const replies = p.replies || p.reply_count || 0;
        const retweets = p.retweets || p.retweet_count || 0;
        const views = p.views || p.impression_count || p.impressions || 0;
        const followers = p.authorFollowers || p.author_followers || p.followers_count || p.user?.followers_count || 0;
        const text = p.postText || p.post_text || p.text || p.full_text || "";
        const ageMin = Math.max(1, p.postAge || p.post_age || 60);
        const total = likes + replies + retweets;

        const url = p.postUrl || p.post_url || p.url || (tweetId ? `https://x.com/i/status/${tweetId}` : "");
        const imageUrl = p.postImageUrl || p.post_image_url || p.image_url || p.media_url || null;
        const lang = p.language || p.lang || "en";

        const rawScore = (likes / ageMin * 3) + (replies / ageMin * 5) + (retweets / ageMin * 4) + (total / Math.max(followers, 1) * 100);
        const trendScore = Math.min(100, Math.round((rawScore / maxRawScore) * 100));
        const status = trendScore > 70 ? "viral" : trendScore >= 30 ? "trending" : "rising";
        const velocity = Math.round(total / Math.max(1, ageMin / 60));

        const existing = tweetId ? await storage.getTrendingPostByTweetId(tweetId) : null;
        if (existing) continue;

        const post = await storage.createTrendingPost({
          nicheId: targetNicheId,
          authorHandle: handle.startsWith("@") ? handle : `@${handle}`,
          authorFollowers: followers,
          postText: text,
          postUrl: url,
          postImageUrl: imageUrl,
          tweetId,
          likes,
          replies,
          retweets,
          views,
          trendScore,
          status,
          source: "n8n",
          discoveredAt: now.toISOString(),
          engagementVelocity: velocity,
          language: lang,
          postAge: Math.round(ageMin),
          nicheMatchScore: null,
        });
        imported.push(post);
      }

      console.log(`n8n import: ${imported.length} posts imported, ${posts.length - imported.length} skipped (duplicates)`);
      res.status(201).json({ imported: imported.length, skipped: posts.length - imported.length, posts: imported });
    } catch (err: any) {
      console.error("n8n import error:", err);
      res.status(500).json({ message: err.message || "Import failed" });
    }
  });

  app.post("/api/trending-posts/:id/generate-comments", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getTrendingPost(id);
      if (!post) return res.status(404).json({ message: "Post not found" });

      const settingsData = await storage.getSettings();
      const getSetting = (key: string, fallback: string) => {
        const s = settingsData.find((s) => s.key === key);
        return s ? s.value : fallback;
      };
      const seductiveness = getSetting("seductiveness", "60");
      const playfulness = getSetting("playfulness", "85");
      const dominance = getSetting("dominance", "35");

      let imageContext = "";
      if (post.postImageUrl) {
        try {
          const imageResponse = await fetch(post.postImageUrl);
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString("base64");
            const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

            const visionCompletion = await groq.chat.completions.create({
              model: "meta-llama/llama-4-scout-17b-16e-instruct",
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: "Describe this image in detail for social media context. What is shown — subject, setting, mood, style, colors, any notable elements. Be specific and concise. 2-3 sentences max." },
                  { type: "image_url", image_url: { url: `data:${contentType};base64,${base64Image}` } }
                ]
              }],
              temperature: 0.4,
              max_tokens: 200,
            });
            imageContext = visionCompletion.choices[0]?.message?.content || "";
          }
        } catch (imgErr) {
          console.error("Image analysis failed for trending post, continuing without:", imgErr);
        }
      }

      const imageInstruction = imageContext
        ? `\n\nIMAGE CONTEXT: The post includes a photo showing: ${imageContext}\nYour comments should reference or react to what's in the image when relevant. This is critical — many viral comments engage with the visual content, not just the caption.`
        : "";

      const systemPrompt = `You are the ghost-writer for a popular female influencer on Twitter/X. She is confident, magnetic, and human.
Her persona dials: Seductiveness ${seductiveness}/100, Playfulness ${playfulness}/100, Dominance ${dominance}/100.
Voice: lowercase casual twitter voice, natural emojis, spontaneous, real.

Analyze this trending post:
"${post.postText}" by ${post.authorHandle}${imageInstruction}

Generate 5 different contextual comments she would leave on this post.
Generate exactly one of each type:
1. "witty": Clever, sharp, or funny
2. "flirty": Suggestive, teasing, or charming
3. "insightful": Thoughtful, adding value, or perspective
4. "disagreement": Playful disagreement, challenging the author
5. "question": Engagement-focused question

Rules:
- Blend naturally, no spam, no self-promo, no links.
- Human variability, slight imperfections.
- Match her persona dials.
- If the post has an image, at least 2-3 comments should engage with the visual content.
- For each comment, assign a "riskLevel": "low", "medium", or "high".

Return ONLY a JSON array of objects with keys: commentText, commentType, riskLevel. No explanation.`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.9,
        response_format: { type: "json_object" }
      });

      const raw = completion.choices[0]?.message?.content || "{\"comments\": []}";
      const data = JSON.parse(raw);
      const generatedComments = Array.isArray(data) ? data : (data.comments || []);

      const suggestions = [];
      for (const c of generatedComments) {
        const suggestion = await storage.createCommentSuggestion({
          trendingPostId: id,
          commentText: c.commentText,
          commentType: c.commentType,
          riskLevel: c.riskLevel || "low",
          status: "pending",
        });
        suggestions.push(suggestion);
      }

      res.status(201).json(suggestions);
    } catch (err: any) {
      console.error("Comment generation error:", err);
      res.status(500).json({ message: err.message || "Generation failed" });
    }
  });

  app.delete("/api/trending-posts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTrendingPost(id);
    res.status(204).send();
  });

  // --- Comments ---
  app.patch("/api/comments/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const data = req.body;
    if (data.status === "approved") {
      data.approvedAt = new Date().toISOString();
    }
    const comment = await storage.updateCommentSuggestion(id, data);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    res.json(comment);
  });

  app.post("/api/comments/:id/post", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const allComments = await storage.getCommentSuggestions();
      const existing = allComments.find(c => c.id === id);
      if (!existing) {
        return res.status(404).json({ message: "Comment not found" });
      }
      if (existing.status !== "approved") {
        return res.status(400).json({ message: "Only approved comments can be posted" });
      }

      const limits = await storage.getBehaviorLimits();
      const getLimit = (key: string, fallback: number) => {
        const l = limits.find(l => l.key === key);
        return l ? parseInt(l.value) : fallback;
      };
      const dailyCap = getLimit("daily_cap", 15);
      const hourlyLimit = getLimit("hourly_limit", 3);
      const cooldownMinutes = getLimit("cooldown_minutes", 10);

      const postedComments = allComments.filter(c => c.status === "posted" && c.postedAt);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const hourAgo = new Date(now.getTime() - 3600000).toISOString();
      const cooldownAgo = new Date(now.getTime() - cooldownMinutes * 60000).toISOString();

      const todayCount = postedComments.filter(c => c.postedAt! >= todayStart).length;
      const hourCount = postedComments.filter(c => c.postedAt! >= hourAgo).length;
      const recentPost = postedComments.find(c => c.postedAt! >= cooldownAgo);

      if (todayCount >= dailyCap) {
        return res.status(429).json({ message: `Daily cap reached (${dailyCap} comments). Try again tomorrow.` });
      }
      if (hourCount >= hourlyLimit) {
        return res.status(429).json({ message: `Hourly limit reached (${hourlyLimit} comments). Wait a bit.` });
      }
      if (recentPost) {
        return res.status(429).json({ message: `Cooldown active. Wait ${cooldownMinutes} minutes between comments.` });
      }

      const twitterClient = getTwitterClient();
      const trendingPost = (await storage.getTrendingPosts()).find(p => p.id === existing.trendingPostId);

      if (twitterClient && trendingPost?.tweetId) {
        try {
          await twitterClient.v2.reply(existing.commentText, trendingPost.tweetId);
        } catch (twitterErr: any) {
          const errorMsg = twitterErr?.data?.detail || twitterErr?.message || "Twitter API error";
          return res.status(502).json({ message: `Twitter error: ${errorMsg}` });
        }
      }

      const comment = await storage.updateCommentSuggestion(id, {
        status: "posted",
        postedAt: new Date().toISOString(),
      });
      res.json(comment);
    } catch (err: any) {
      console.error("Post comment error:", err);
      res.status(500).json({ message: err.message || "Failed to post comment" });
    }
  });

  // --- Behavior Limits ---
  app.get("/api/behavior-limits", async (_req, res) => {
    const limits = await storage.getBehaviorLimits();
    res.json(limits);
  });

  app.post("/api/behavior-limits", async (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ message: "key and value are required" });
    const limit = await storage.upsertBehaviorLimit(key, String(value));
    res.json(limit);
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
