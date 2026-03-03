import { TwitterApi } from "twitter-api-v2";

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

export interface NicheSuggestion {
  name: string;
  keywords: string;
  confidence: number;
}

export async function analyzeUserFeed(client: TwitterApi): Promise<NicheSuggestion[]> {
  const cacheKey = "niche_detection";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const me = await client.v2.me();
    const userId = me.data.id;

    const timeline = await client.v2.userTimeline(userId, {
      max_results: 100,
      "tweet.fields": ["entities", "text"],
      exclude: ["retweets"],
    });

    const hashtagCounts = new Map<string, number>();
    const wordCounts = new Map<string, number>();
    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could",
      "should", "may", "might", "shall", "can", "need", "dare", "to", "of",
      "in", "for", "on", "with", "at", "by", "from", "as", "into", "through",
      "during", "before", "after", "above", "below", "between", "out", "off",
      "over", "under", "again", "further", "then", "once", "it", "its",
      "this", "that", "these", "those", "i", "me", "my", "we", "our",
      "you", "your", "he", "him", "his", "she", "her", "they", "them",
      "what", "which", "who", "when", "where", "why", "how", "all", "each",
      "every", "both", "few", "more", "most", "other", "some", "such", "no",
      "nor", "not", "only", "own", "same", "so", "than", "too", "very",
      "just", "don", "now", "also", "but", "and", "or", "if", "about",
      "up", "get", "got", "like", "going", "go", "one", "know", "think",
      "make", "really", "still", "even", "back", "much", "right", "here",
      "https", "http", "com", "rt", "amp", "lol", "omg", "via",
    ]);

    for await (const tweet of timeline) {
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
        .filter(w => w.length > 3 && !stopWords.has(w));

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

    const clusters = new Map<string, { words: string[]; score: number }>();
    const nichePatterns: Record<string, string[]> = {
      "Tech & AI": ["ai", "tech", "code", "software", "developer", "programming", "data", "machine", "learning", "startup", "saas", "product", "build", "ship", "deploy", "api"],
      "Crypto & Web3": ["crypto", "bitcoin", "ethereum", "blockchain", "defi", "nft", "web3", "token", "trading", "wallet"],
      "Fitness & Health": ["fitness", "workout", "gym", "health", "training", "muscle", "diet", "nutrition", "body", "weight", "exercise"],
      "Fashion & Beauty": ["fashion", "style", "beauty", "outfit", "makeup", "skincare", "brand", "wear", "look", "aesthetic"],
      "Finance & Investing": ["money", "invest", "stock", "market", "finance", "income", "wealth", "portfolio", "trading", "revenue"],
      "Creator Economy": ["content", "creator", "audience", "growth", "followers", "engagement", "viral", "brand", "influence", "monetize"],
      "Lifestyle & Travel": ["travel", "life", "food", "coffee", "city", "morning", "routine", "experience", "explore", "adventure"],
      "Gaming": ["game", "gaming", "play", "player", "stream", "twitch", "console", "esports"],
    };

    const allTopTerms = new Set([
      ...topHashtags.map(([tag]) => tag),
      ...topWords.map(([word]) => word),
    ]);

    for (const [nicheName, patterns] of Object.entries(nichePatterns)) {
      const matchedWords: string[] = [];
      let score = 0;

      for (const pattern of patterns) {
        if (allTopTerms.has(pattern)) {
          matchedWords.push(pattern);
          const htCount = hashtagCounts.get(pattern) || 0;
          const wdCount = wordCounts.get(pattern) || 0;
          score += htCount * 3 + wdCount;
        }
      }

      if (matchedWords.length >= 2) {
        clusters.set(nicheName, { words: matchedWords, score });
      }
    }

    for (const [tag, count] of topHashtags) {
      if (count >= 3 && !clusters.has(tag)) {
        const relatedWords = topWords
          .filter(([w]) => w !== tag)
          .slice(0, 3)
          .map(([w]) => w);
        const name = tag.charAt(0).toUpperCase() + tag.slice(1);
        clusters.set(name, { words: [tag, ...relatedWords], score: count * 2 });
      }
    }

    const maxScore = Math.max(...[...clusters.values()].map(c => c.score), 1);
    const suggestions: NicheSuggestion[] = [...clusters.entries()]
      .map(([name, { words, score }]) => ({
        name,
        keywords: words.join(", "),
        confidence: Math.min(100, Math.round((score / maxScore) * 100)),
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);

    setCache(cacheKey, suggestions, 600);
    return suggestions;
  } catch (err: any) {
    console.error("Feed analysis error:", err?.data || err?.message || err);
    throw new Error(err?.data?.detail || err?.message || "Failed to analyze feed");
  }
}
