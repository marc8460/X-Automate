import { TwitterApi, type TweetV2 } from "twitter-api-v2";

export function getTwitterClient(): TwitterApi | null {
  const appKey = process.env.TWITTER_APP_KEY;
  const appSecret = process.env.TWITTER_APP_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    return null;
  }

  return new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });
}

export async function testTwitterConnection(): Promise<{
  connected: boolean;
  handle?: string;
  name?: string;
  followersCount?: number;
  error?: string;
}> {
  const client = getTwitterClient();
  if (!client) {
    return { connected: false, error: "Twitter credentials not configured" };
  }

  try {
    try {
      const me = await client.v2.me({
        "user.fields": ["public_metrics", "name", "username"],
      });
      return {
        connected: true,
        handle: `@${me.data.username}`,
        name: me.data.name,
        followersCount: me.data.public_metrics?.followers_count,
      };
    } catch (meErr: any) {
      if (meErr.code === 401) {
        const v1client = client.v1;
        const v1user = await v1client.verifyCredentials();
        return {
          connected: true,
          handle: `@${v1user.screen_name}`,
          name: v1user.name,
          followersCount: v1user.followers_count,
        };
      }
      throw meErr;
    }
  } catch (err: any) {
    const detail = err.data?.detail || err.data?.errors?.[0]?.message || err.message || "Failed to connect to Twitter";
    console.error("Twitter connection error:", detail);
    return {
      connected: false,
      error: detail,
    };
  }
}

const apiCache = new Map<string, { data: any; expiresAt: number }>();

export function getCached(key: string): any | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key: string, data: any, ttlSeconds: number): void {
  apiCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function analyzeUserFeed(client: TwitterApi): Promise<{
  niches: Array<{ name: string; keywords: string; confidence: number }>;
  error?: string;
}> {
  try {
    const me = await client.v2.me();
    const userId = me.data.id;

    const cacheKey = `feed_analysis:${userId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const timeline = await client.v2.userTimeline(userId, {
      max_results: 100,
      "tweet.fields": ["entities", "text", "created_at"],
      exclude: ["replies"],
    });

    const hashtagCounts = new Map<string, number>();
    const wordCounts = new Map<string, number>();
    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could",
      "should", "may", "might", "shall", "can", "to", "of", "in", "for",
      "on", "with", "at", "by", "from", "as", "into", "through", "during",
      "before", "after", "and", "but", "or", "nor", "not", "so", "yet",
      "both", "either", "neither", "each", "every", "all", "any", "few",
      "more", "most", "other", "some", "such", "no", "only", "own", "same",
      "than", "too", "very", "just", "because", "about", "up", "out",
      "this", "that", "these", "those", "it", "its", "my", "your", "his",
      "her", "our", "their", "i", "me", "we", "you", "he", "she", "they",
      "him", "them", "what", "which", "who", "whom", "when", "where",
      "why", "how", "if", "then", "also", "like", "get", "got", "new",
      "one", "two", "now", "even", "still", "already", "much", "many",
      "rt", "amp", "https", "http", "co",
    ]);

    for (const tweet of timeline.data?.data || []) {
      if (tweet.entities?.hashtags) {
        for (const ht of tweet.entities.hashtags) {
          const tag = ht.tag.toLowerCase();
          hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
        }
      }

      const words = tweet.text
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    const topHashtags = [...hashtagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const topWords = [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    const clusters: Array<{ name: string; keywords: string[]; score: number }> = [];

    const categoryMap: Record<string, string[]> = {
      Tech: ["tech", "code", "coding", "developer", "software", "programming", "javascript", "python", "react", "startup", "saas", "devops", "cloud", "data", "machine"],
      AI: ["ai", "artificial", "intelligence", "chatgpt", "openai", "llm", "gpt", "claude", "gemini", "neural", "deeplearning", "machinelearning"],
      Crypto: ["crypto", "bitcoin", "ethereum", "blockchain", "defi", "nft", "web3", "token", "wallet", "solana"],
      Fashion: ["fashion", "style", "outfit", "dress", "beauty", "makeup", "skincare", "aesthetic", "ootd", "model"],
      Fitness: ["fitness", "gym", "workout", "health", "training", "body", "muscle", "nutrition", "diet", "protein"],
      Entertainment: ["movie", "film", "music", "album", "series", "netflix", "show", "gaming", "game", "anime"],
      Business: ["business", "marketing", "brand", "sales", "revenue", "growth", "entrepreneur", "founder", "ceo", "money"],
      Sports: ["sports", "football", "soccer", "basketball", "nba", "nfl", "match", "team", "player", "goal"],
    };

    const allTopWords = [...topHashtags.map(([w]) => w), ...topWords.map(([w]) => w)];

    for (const [category, catWords] of Object.entries(categoryMap)) {
      const matchedKeywords = allTopWords.filter((w) => catWords.some((cw) => w.includes(cw)));
      if (matchedKeywords.length >= 2) {
        clusters.push({
          name: category,
          keywords: matchedKeywords.slice(0, 8),
          score: Math.min(100, matchedKeywords.length * 15),
        });
      }
    }

    if (topHashtags.length > 0 && clusters.length < 3) {
      const hashtagKeywords = topHashtags.slice(0, 5).map(([tag]) => tag);
      clusters.push({
        name: "Your Top Hashtags",
        keywords: hashtagKeywords,
        score: 70,
      });
    }

    clusters.sort((a, b) => b.score - a.score);

    const result = {
      niches: clusters.slice(0, 5).map((c) => ({
        name: c.name,
        keywords: c.keywords.join(", "),
        confidence: c.score,
      })),
    };

    setCache(cacheKey, result, 15 * 60);
    return result;
  } catch (err: any) {
    console.error("Feed analysis error:", err.message);
    return {
      niches: [],
      error: err.data?.detail || err.message || "Failed to analyze feed",
    };
  }
}
