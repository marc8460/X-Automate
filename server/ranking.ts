interface TweetMetrics {
  like_count?: number;
  retweet_count?: number;
  reply_count?: number;
  quote_count?: number;
  impression_count?: number;
}

interface TweetForScoring {
  id: string;
  createdAt?: string;
  publicMetrics?: TweetMetrics;
  [key: string]: any;
}

export function computeCommentOpportunityScore(
  tweet: TweetForScoring,
  batchStats: { maxEngagement: number; maxVelocity: number }
): number {
  const m = tweet.publicMetrics;
  if (!m) return 0;

  const L = m.like_count ?? 0;
  const R = m.retweet_count ?? 0;
  const C = m.reply_count ?? 0;
  const Q = m.quote_count ?? 0;
  const V = m.impression_count ?? 0;

  const ageMs = tweet.createdAt
    ? Date.now() - new Date(tweet.createdAt).getTime()
    : 60 * 60 * 1000;
  const T = Math.max(ageMs / 60000, 1);

  const weightedEngagement = L + 2 * R + 3 * C + 2 * Q;

  let engagementSignal: number;
  if (V > 0) {
    engagementSignal = weightedEngagement / V;
  } else {
    engagementSignal = weightedEngagement;
  }

  const velocity = weightedEngagement / T;

  const replyGapFactor = 1 - C / (L + R + Q + 1);

  const normEngagement =
    batchStats.maxEngagement > 0
      ? engagementSignal / batchStats.maxEngagement
      : 0;
  const normVelocity =
    batchStats.maxVelocity > 0 ? velocity / batchStats.maxVelocity : 0;

  const scoreRaw =
    0.4 * normEngagement + 0.4 * normVelocity + 0.2 * Math.max(0, replyGapFactor);

  return Math.min(100, Math.round(scoreRaw * 100));
}

export function rankTweets<T extends TweetForScoring>(tweets: T[]): (T & { score: number })[] {
  if (!tweets.length) return [];

  let maxEngagement = 0;
  let maxVelocity = 0;

  for (const tweet of tweets) {
    const m = tweet.publicMetrics;
    if (!m) continue;

    const L = m.like_count ?? 0;
    const R = m.retweet_count ?? 0;
    const C = m.reply_count ?? 0;
    const Q = m.quote_count ?? 0;
    const V = m.impression_count ?? 0;

    const weightedEngagement = L + 2 * R + 3 * C + 2 * Q;
    const engagementSignal = V > 0 ? weightedEngagement / V : weightedEngagement;

    const ageMs = tweet.createdAt
      ? Date.now() - new Date(tweet.createdAt).getTime()
      : 60 * 60 * 1000;
    const T = Math.max(ageMs / 60000, 1);
    const velocity = weightedEngagement / T;

    if (engagementSignal > maxEngagement) maxEngagement = engagementSignal;
    if (velocity > maxVelocity) maxVelocity = velocity;
  }

  return tweets.map((tweet) => ({
    ...tweet,
    score: computeCommentOpportunityScore(tweet, { maxEngagement, maxVelocity }),
  }));
}
