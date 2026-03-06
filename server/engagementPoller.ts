import { EventEmitter } from "events";
import type { Response } from "express";
import { getTwitterClient, getTwitterClientForUser } from "./twitter";
import { getThreadsPosts, getThreadsReplies, getThreadsUserMetrics, getThreadsAccessTokenForUser } from "./threads";
import { storage } from "./storage";

const sseClients = new Set<Response>();

export function addSseClient(res: Response) {
  sseClients.add(res);
}

export function removeSseClient(res: Response) {
  sseClients.delete(res);
}

function broadcastUpdate(payload: object) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  const dead: Response[] = [];
  sseClients.forEach((client) => {
    try {
      client.write(data);
    } catch {
      dead.push(client);
    }
  });
  dead.forEach(c => sseClients.delete(c));
}

let pollInterval: ReturnType<typeof setInterval> | null = null;
let isPaused = false;
let lastPollAt: Date | null = null;
let pollError: string | null = null;

export const engagementEmitter = new EventEmitter();

export function startEngagementPoller() {
  if (pollInterval) return;
  runPoll();
  pollInterval = setInterval(runPoll, 60_000);
}

export function stopEngagementPoller() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

export function pausePoller() {
  isPaused = true;
}

export function resumePoller() {
  isPaused = false;
  runPoll();
}

export function getPollerStatus() {
  return {
    running: pollInterval !== null && !isPaused,
    paused: isPaused,
    lastPollAt: lastPollAt?.toISOString() ?? null,
    error: pollError,
  };
}

async function runPoll() {
  if (isPaused) return;

  try {
    const xAccounts = await storage.getAllConnectedAccountsForPlatform("x");
    const threadsAccounts = await storage.getAllConnectedAccountsForPlatform("threads");

    for (const account of xAccounts) {
      try {
        await pollUserX(account.userId);
      } catch (err: any) {
        console.error(`[EngagementPoller] X poll error for user ${account.userId}:`, err.message);
      }
    }

    if (xAccounts.length === 0) {
      const legacyClient = getTwitterClient();
      if (legacyClient) {
        try {
          await pollLegacyX(legacyClient);
        } catch (err: any) {
          console.error("[EngagementPoller] Legacy X poll error:", err.message);
        }
      }
    }

    for (const account of threadsAccounts) {
      try {
        await pollUserThreads(account.userId);
      } catch (err: any) {
        console.error(`[EngagementPoller] Threads poll error for user ${account.userId}:`, err.message);
      }
    }

    lastPollAt = new Date();
    pollError = null;

    broadcastUpdate({ type: "update", timestamp: lastPollAt.toISOString() });
    engagementEmitter.emit("update");
  } catch (err: any) {
    pollError = err.message || "Poll failed";
    console.error("[EngagementPoller] Poll error:", pollError);
    broadcastUpdate({ type: "error", message: pollError });
  }
}

async function pollUserX(userId: string) {
  const client = await getTwitterClientForUser(userId);
  if (!client) return;

  const me = await client.v2.me({ "user.fields": ["public_metrics"] });
  const twitterUserId = me.data.id;
  const currentFollowers = me.data.public_metrics?.followers_count ?? 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [commentCheckedSetting, followerCheckedSetting] = await Promise.all([
    storage.getSetting("engagement_comments_last_checked", userId),
    storage.getSetting("engagement_followers_last_checked", userId),
  ]);

  const commentsLastChecked = commentCheckedSetting
    ? new Date(commentCheckedSetting.value)
    : sevenDaysAgo;

  const commentsStartTime = commentsLastChecked > sevenDaysAgo
    ? commentsLastChecked
    : sevenDaysAgo;

  await Promise.allSettled([
    fetchCommentThreads(client, twitterUserId, commentsStartTime, userId),
    fetchFollowerActivityDelta(client, twitterUserId, currentFollowers, userId),
    snapshotMetrics(client, twitterUserId, userId),
  ]);

  const now = new Date().toISOString();
  await Promise.all([
    storage.upsertSetting("engagement_comments_last_checked", now, userId),
    storage.upsertSetting("engagement_followers_last_checked", now, userId),
  ]);
}

async function pollLegacyX(client: any) {
  const me = await client.v2.me({ "user.fields": ["public_metrics"] });
  const userId = me.data.id;
  const currentFollowers = me.data.public_metrics?.followers_count ?? 0;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [commentCheckedSetting] = await Promise.all([
    storage.getSetting("engagement_comments_last_checked"),
  ]);

  const commentsLastChecked = commentCheckedSetting
    ? new Date(commentCheckedSetting.value)
    : sevenDaysAgo;

  const commentsStartTime = commentsLastChecked > sevenDaysAgo
    ? commentsLastChecked
    : sevenDaysAgo;

  await Promise.allSettled([
    fetchCommentThreads(client, userId, commentsStartTime),
    fetchFollowerActivityDelta(client, userId, currentFollowers),
    snapshotMetrics(client, userId),
  ]);

  const now = new Date().toISOString();
  await Promise.all([
    storage.upsertSetting("engagement_comments_last_checked", now),
    storage.upsertSetting("engagement_followers_last_checked", now),
  ]);
}

async function pollUserThreads(userId: string) {
  try {
    const token = await getThreadsAccessTokenForUser(userId);
    if (!token) return;

    const posts = await getThreadsPosts(token);
    if (!posts || posts.length === 0) return;

    for (const post of posts.slice(0, 5)) {
      const replies = await getThreadsReplies(post.id, token);
      for (const reply of replies) {
        const createdAt = new Date(reply.timestamp);
        const existing = await storage.getActiveCommentThreads(userId, "threads");
        const existingThread = existing.find(t => t.id === reply.id);
        if (existingThread) continue;

        await storage.upsertCommentThread({
          id: reply.id,
          userId,
          rootTweetId: post.id,
          lastCommentId: reply.id,
          lastCommentText: reply.text,
          lastCommentAuthor: `@${reply.username}`,
          lastCommentAuthorName: reply.username,
          lastCommentAt: createdAt,
          replied: false,
          needsAttention: true,
          parentTweetText: post.text || "Threads Post",
          platform: "threads",
        });
      }
    }

    const metrics = await getThreadsUserMetrics(token);
    if (metrics) {
      const currentFollowers = metrics.follower_count || 0;
      const prevSetting = await storage.getSetting("threads_prev_follower_count", userId);
      const prevCount = prevSetting ? parseInt(prevSetting.value, 10) : currentFollowers;

      if (currentFollowers > prevCount) {
        const gained = currentFollowers - prevCount;
        const eventKey = `threads:follow:delta:${currentFollowers}:${Date.now()}`;
        await storage.upsertLiveFollowerInteraction({
          type: "follow",
          userId,
          username: `+${gained} new follower${gained > 1 ? "s" : ""}`,
          tweetId: null,
          xEventKey: eventKey,
          seen: false,
          createdAt: new Date(),
          platform: "threads",
        });
      }
      await storage.upsertSetting("threads_prev_follower_count", String(currentFollowers), userId);
    }
  } catch (err: any) {
    console.error("[EngagementPoller] Threads poll error:", err.message);
  }
}

async function fetchCommentThreads(client: any, twitterUserId: string, startTime: Date, userId?: string) {
  try {
    const result = await client.v2.userMentionTimeline(twitterUserId, {
      start_time: startTime.toISOString(),
      max_results: 100,
      "tweet.fields": ["conversation_id", "in_reply_to_user_id", "created_at", "referenced_tweets", "author_id"],
      "expansions": ["author_id", "referenced_tweets.id"],
      "user.fields": ["name", "username"],
    });

    const tweets: any[] = result.data?.data ?? [];
    const users: any[] = (result.data?.includes as any)?.users ?? [];
    const refTweets: any[] = (result.data?.includes as any)?.tweets ?? [];

    const userMap: Record<string, { name: string; username: string }> = {};
    for (const u of users) userMap[u.id] = { name: u.name, username: u.username };

    const refTweetMap: Record<string, string> = {};
    for (const t of refTweets) refTweetMap[t.id] = t.text;

    const replies = tweets.filter((t: any) => t.in_reply_to_user_id === twitterUserId);

    for (const tweet of replies) {
      const author = userMap[tweet.author_id ?? ""] ?? { name: "Unknown", username: "unknown" };
      const parentRef = tweet.referenced_tweets?.find((r: any) => r.type === "replied_to");
      const parentTweetId = parentRef?.id ?? tweet.conversation_id ?? "";
      const conversationId = tweet.conversation_id ?? tweet.id;
      const createdAt = tweet.created_at ? new Date(tweet.created_at) : new Date();

      const existing = userId
        ? await storage.getActiveCommentThreads(userId)
        : [];
      const existingThread = existing.find(t => t.id === conversationId);

      if (existingThread?.replied && existingThread.lastCommentId === tweet.id) continue;

      if (existingThread?.replied && new Date(tweet.created_at) > existingThread.lastCommentAt) {
        await storage.setThreadNeedsAttention(
          conversationId,
          tweet.id,
          tweet.text,
          `@${author.username}`,
          author.name,
          createdAt,
        );
        continue;
      }

      if (existingThread?.replied) continue;

      await storage.upsertCommentThread({
        id: conversationId,
        userId: userId || null,
        rootTweetId: parentTweetId || conversationId,
        lastCommentId: tweet.id,
        lastCommentText: tweet.text,
        lastCommentAuthor: `@${author.username}`,
        lastCommentAuthorName: author.name,
        lastCommentAt: createdAt,
        replied: false,
        needsAttention: true,
        parentTweetText: refTweetMap[parentTweetId] ?? "",
      });
    }
  } catch (err: any) {
    console.error("[EngagementPoller] fetchCommentThreads error:", err.message);
  }
}

async function fetchFollowerActivityDelta(client: any, twitterUserId: string, currentFollowers: number, userId?: string) {
  try {
    const prevSetting = await storage.getSetting("prev_follower_count", userId);
    const prevCount = prevSetting ? parseInt(prevSetting.value, 10) : currentFollowers;

    if (currentFollowers > prevCount) {
      const gained = currentFollowers - prevCount;
      const eventKey = `follow:delta:${currentFollowers}`;
      await storage.upsertLiveFollowerInteraction({
        type: "follow",
        userId: userId || null,
        username: `+${gained} new follower${gained > 1 ? "s" : ""}`,
        tweetId: null,
        xEventKey: eventKey,
        seen: false,
        createdAt: new Date(),
      });
    }

    await storage.upsertSetting("prev_follower_count", String(currentFollowers), userId);
  } catch (err: any) {
    console.error("[EngagementPoller] follower delta error:", err.message);
  }

  try {
    const tweetsResult = await client.v2.userTimeline(twitterUserId, {
      max_results: 10,
      "tweet.fields": ["public_metrics", "created_at", "text"],
      exclude: ["retweets"],
    });

    const userTweets: any[] = tweetsResult.data?.data ?? [];
    if (userTweets.length === 0) return;

    const snapshotSetting = await storage.getSetting("tweet_metrics_snapshot", userId);
    const prevSnapshot: Record<string, { likes: number; retweets: number }> = snapshotSetting
      ? JSON.parse(snapshotSetting.value)
      : {};

    const newSnapshot: Record<string, { likes: number; retweets: number }> = {};
    const isFirstRun = Object.keys(prevSnapshot).length === 0;

    for (const tweet of userTweets) {
      const pm = tweet.public_metrics ?? {};
      const likes = pm.like_count ?? 0;
      const retweets = pm.retweet_count ?? 0;
      const tweetText = (tweet.text ?? "").slice(0, 40);

      newSnapshot[tweet.id] = { likes, retweets };

      if (isFirstRun) {
        if (likes > 0) {
          await storage.upsertLiveFollowerInteraction({
            type: "like",
            userId: userId || null,
            username: `${likes} like${likes > 1 ? "s" : ""} on "${tweetText}…"`,
            tweetId: tweet.id,
            xEventKey: `like:init:${tweet.id}`,
            seen: false,
            createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
          });
        }
        if (retweets > 0) {
          await storage.upsertLiveFollowerInteraction({
            type: "retweet",
            userId: userId || null,
            username: `${retweets} retweet${retweets > 1 ? "s" : ""} on "${tweetText}…"`,
            tweetId: tweet.id,
            xEventKey: `retweet:init:${tweet.id}`,
            seen: false,
            createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
          });
        }
        continue;
      }

      const prev = prevSnapshot[tweet.id];
      if (!prev) continue;

      const newLikes = likes - prev.likes;
      const newRetweets = retweets - prev.retweets;

      if (newLikes > 0) {
        await storage.upsertLiveFollowerInteraction({
          type: "like",
          userId: userId || null,
          username: `+${newLikes} new like${newLikes > 1 ? "s" : ""} on "${tweetText}…"`,
          tweetId: tweet.id,
          xEventKey: `like:delta:${tweet.id}:${likes}`,
          seen: false,
          createdAt: new Date(),
        });
      }

      if (newRetweets > 0) {
        await storage.upsertLiveFollowerInteraction({
          type: "retweet",
          userId: userId || null,
          username: `+${newRetweets} new retweet${newRetweets > 1 ? "s" : ""} on "${tweetText}…"`,
          tweetId: tweet.id,
          xEventKey: `retweet:delta:${tweet.id}:${retweets}`,
          seen: false,
          createdAt: new Date(),
        });
      }
    }

    await storage.upsertSetting("tweet_metrics_snapshot", JSON.stringify(newSnapshot), userId);
  } catch (err: any) {
    console.error("[EngagementPoller] tweet metrics delta error:", err.message);
  }
}

let lastSnapshotDate = "";

async function snapshotMetrics(client: any, twitterUserId: string, userId?: string) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (today === lastSnapshotDate) return;

    const me = await client.v2.me({ "user.fields": ["public_metrics"] });
    const followers = me.data.public_metrics?.followers_count ?? 0;

    const timelineResult = await client.v2.userTimeline(twitterUserId, {
      max_results: 20,
      "tweet.fields": ["public_metrics", "created_at"],
      exclude: ["retweets"],
    });

    const tweets: any[] = timelineResult.data?.data ?? [];
    let todayEngagement = 0;
    for (const tweet of tweets) {
      if (!tweet.created_at) continue;
      const tweetDate = new Date(tweet.created_at).toISOString().slice(0, 10);
      if (tweetDate !== today) continue;
      const pm = tweet.public_metrics ?? {};
      todayEngagement += (pm.like_count ?? 0) + (pm.retweet_count ?? 0) + (pm.reply_count ?? 0);
    }

    const dayLabel = new Date().toLocaleDateString("en-US", { weekday: "short" });
    await storage.createAnalyticsData({
      userId: userId || null,
      name: dayLabel,
      engagement: todayEngagement,
      followers,
    });

    lastSnapshotDate = today;
  } catch (err: any) {
    console.error("[EngagementPoller] snapshotMetrics error:", err.message);
  }
}
