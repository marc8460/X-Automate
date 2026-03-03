import { TwitterApi } from "twitter-api-v2";

export const apiCache = new Map<string, { data: any; expiresAt: number }>();

export function getCached(key: string): any | null {
  const entry = apiCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  if (entry) apiCache.delete(key);
  return null;
}

export function setCache(key: string, data: any, ttlSeconds: number): void {
  apiCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function analyzeUserFeed(client: TwitterApi): Promise<Array<{ name: string; keywords: string; confidence: number }>> {
  const cached = getCached("user_feed_niches");
  if (cached) return cached;

  try {
    const me = await client.v2.me();
    const userId = me.data.id;

    const timeline = await client.v2.userTimeline(userId, {
      max_results: 100,
      "tweet.fields": ["entities", "text"],
      exclude: ["replies", "retweets"],
    });

    const hashtagCounts = new Map<string, number>();
    const wordCounts = new Map<string, number>();
    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could",
      "should", "may", "might", "shall", "can", "need", "dare", "ought",
      "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
      "as", "into", "through", "during", "before", "after", "above",
      "below", "between", "out", "off", "over", "under", "again",
      "further", "then", "once", "here", "there", "when", "where", "why",
      "how", "all", "each", "every", "both", "few", "more", "most",
      "other", "some", "such", "no", "nor", "not", "only", "own", "same",
      "so", "than", "too", "very", "just", "because", "but", "and", "or",
      "if", "while", "about", "up", "its", "it", "this", "that", "i",
      "me", "my", "we", "our", "you", "your", "he", "him", "his", "she",
      "her", "they", "them", "their", "what", "which", "who", "whom",
      "rt", "amp", "like", "get", "got", "go", "going", "know", "think",
      "make", "see", "come", "want", "take", "give", "say", "said", "new",
      "one", "two", "also", "back", "even", "still", "way", "us", "don",
      "re", "ve", "ll", "didn", "doesn", "isn", "wasn", "won", "wouldn",
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

    const clusters: Array<{ name: string; keywords: string[]; score: number }> = [];

    const themeMap: Record<string, string[]> = {
      "Tech & AI": ["ai", "tech", "code", "coding", "developer", "programming", "software", "startup", "crypto", "blockchain", "web3", "data", "machine", "learning", "python", "javascript"],
      "Lifestyle & Fashion": ["fashion", "style", "outfit", "beauty", "skincare", "makeup", "aesthetic", "vibes", "mood", "lifestyle", "self", "care", "wellness"],
      "Finance & Business": ["money", "finance", "investing", "business", "entrepreneur", "wealth", "stocks", "trading", "income", "growth", "revenue", "market"],
      "Entertainment": ["movie", "music", "gaming", "game", "anime", "series", "netflix", "film", "album", "song", "concert", "stream"],
      "Fitness & Health": ["fitness", "workout", "gym", "health", "diet", "protein", "muscle", "training", "exercise", "weight", "cardio", "nutrition"],
      "Social & Relationships": ["love", "dating", "relationship", "friend", "people", "social", "community", "connection", "conversation", "vibe"],
    };

    for (const [themeName, themeKeywords] of Object.entries(themeMap)) {
      let matchScore = 0;
      const matchedKeywords: string[] = [];

      for (const [word, count] of topWords) {
        if (themeKeywords.includes(word)) {
          matchScore += count;
          matchedKeywords.push(word);
        }
      }

      for (const [tag, count] of topHashtags) {
        if (themeKeywords.some(k => tag.includes(k))) {
          matchScore += count * 2;
          matchedKeywords.push(`#${tag}`);
        }
      }

      if (matchScore > 2) {
        clusters.push({ name: themeName, keywords: matchedKeywords, score: matchScore });
      }
    }

    const uncategorizedTags = topHashtags
      .filter(([tag]) => !Object.values(themeMap).flat().some(k => tag.includes(k)))
      .slice(0, 5);

    if (uncategorizedTags.length >= 2) {
      clusters.push({
        name: `#${uncategorizedTags[0][0]} Niche`,
        keywords: uncategorizedTags.map(([t]) => `#${t}`),
        score: uncategorizedTags.reduce((sum, [, c]) => sum + c, 0),
      });
    }

    clusters.sort((a, b) => b.score - a.score);
    const maxScore = clusters[0]?.score || 1;

    const results = clusters.slice(0, 5).map(c => ({
      name: c.name,
      keywords: c.keywords.join(", "),
      confidence: Math.min(100, Math.round((c.score / maxScore) * 100)),
    }));

    setCache("user_feed_niches", results, 600);
    return results;
  } catch (err: any) {
    console.error("Feed analysis error:", err.message);
    throw new Error(`Failed to analyze feed: ${err.message}`);
  }
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
