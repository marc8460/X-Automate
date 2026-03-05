/**
 * Engagement Poller
 *
 * Background worker that polls the X API every 60 seconds to:
 * 1. Fetch recent mentions/replies → upsert into comment_threads
 * 2. Fetch new followers → upsert into live_follower_interactions
 * 3. Fetch recent retweets → upsert into live_follower_interactions
 *
 * Emits SSE events to connected frontend clients after each poll.
 * Respects X API rate limits by tracking lastCheckedAt per data type.
 */

import { EventEmitter } from "events";
import type { Response } from "express";
import { getTwitterClient } from "./twitter";
import { storage } from "./storage";

// SSE client management
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

// Poller state
let pollInterval: ReturnType<typeof setInterval> | null = null;
let isPaused = false;
let lastPollAt: Date | null = null;
let pollError: string | null = null;

export const engagementEmitter = new EventEmitter();

export function startEngagementPoller() {
  if (pollInterval) return;
  // Run immediately on start, then every 60s
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

  const client = getTwitterClient();
  if (!client) {
    // Credentials not configured — skip silently, do NOT call any API
    return;
  }

  try {
    const me = await client.v2.me({ "user.fields": ["public_metrics"] });
    const userId = me.data.id;
    const currentFollowers = me.data.public_metrics?.followers_count ?? 0;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [commentCheckedSetting, followerCheckedSetting] = await Promise.all([
      storage.getSetting("engagement_comments_last_checked"),
      storage.getSetting("engagement_followers_last_checked"),
    ]);

    const commentsLastChecked = commentCheckedSetting
      ? new Date(commentCheckedSetting.value)
      : sevenDaysAgo;

    const followersLastChecked = followerCheckedSetting
      ? new Date(followerCheckedSetting.value)
      : new Date(Date.now() - 48 * 60 * 60 * 1000);

    const commentsStartTime = commentsLastChecked > sevenDaysAgo
      ? commentsLastChecked
      : sevenDaysAgo;

    await Promise.allSettled([
      fetchCommentThreads(client, userId, commentsStartTime),
      fetchFollowerActivityDelta(client, userId, currentFollowers),
      snapshotMetrics(client, userId),
    ]);

    // Update timestamps
    const now = new Date().toISOString();
    await Promise.all([
      storage.upsertSetting("engagement_comments_last_checked", now),
      storage.upsertSetting("engagement_followers_last_checked", now),
    ]);

    lastPollAt = new Date();
    pollError = null;

    broadcastUpdate({ type: "update", timestamp: lastPollAt.toISOString() });
    engagementEmitter.emit("update");
  } catch (err: any) {
    // Rate limit or auth error — log but don't crash
    pollError = err.message || "Poll failed";
    console.error("[EngagementPoller] Poll error:", pollError);
    broadcastUpdate({ type: "error", message: pollError });
  }
}

async function fetchCommentThreads(client: any, userId: string, startTime: Date) {
  try {
    const result = await client.v2.userMentionTimeline(userId, {
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

    // Only process replies directed at us (not mentions in general)
    const replies = tweets.filter((t: any) => t.in_reply_to_user_id === userId);

    for (const tweet of replies) {
      const author = userMap[tweet.author_id ?? ""] ?? { name: "Unknown", username: "unknown" };
      const parentRef = tweet.referenced_tweets?.find((r: any) => r.type === "replied_to");
      const parentTweetId = parentRef?.id ?? tweet.conversation_id ?? "";
      const conversationId = tweet.conversation_id ?? tweet.id;
      const createdAt = tweet.created_at ? new Date(tweet.created_at) : new Date();

      // Skip threads where we already replied AND this comment is not newer than our last reply
      // (The upsert logic handles the "if newer comment arrives, re-open thread" case)
      const existing = await storage.getActiveCommentThreads();
      const existingThread = existing.find(t => t.id === conversationId);

      if (existingThread?.replied && existingThread.lastCommentId === tweet.id) {
        // Same comment, already replied — skip
        continue;
      }

      if (existingThread?.replied && new Date(tweet.created_at) > existingThread.lastCommentAt) {
        // New comment in a replied thread — re-open it
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

      if (existingThread?.replied) {
        // Replied and no newer comment — skip
        continue;
      }

      await storage.upsertCommentThread({
        id: conversationId,
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

async function fetchFollowerActivityDelta(client: any, userId: string, currentFollowers: number) {
  // --- Follower delta: detect new followers by comparing count ---
  try {
    const prevSetting = await storage.getSetting("prev_follower_count");
    const prevCount = prevSetting ? parseInt(prevSetting.value, 10) : currentFollowers;

    if (currentFollowers > prevCount) {
      const gained = currentFollowers - prevCount;
      const eventKey = `follow:delta:${currentFollowers}`;
      await storage.upsertLiveFollowerInteraction({
        type: "follow",
        username: `+${gained} new follower${gained > 1 ? "s" : ""}`,
        tweetId: null,
        xEventKey: eventKey,
        seen: false,
        createdAt: new Date(),
      });
      console.log(`[EngagementPoller] Detected ${gained} new follower(s) (${prevCount} → ${currentFollowers})`);
    }

    await storage.upsertSetting("prev_follower_count", String(currentFollowers));
  } catch (err: any) {
    console.error("[EngagementPoller] follower delta error:", err.message);
  }

  // --- Like / Retweet delta: compare tweet public_metrics with stored snapshot ---
  try {
    const tweetsResult = await client.v2.userTimeline(userId, {
      max_results: 10,
      "tweet.fields": ["public_metrics", "created_at", "text"],
      exclude: ["retweets"],
    });

    const userTweets: any[] = tweetsResult.data?.data ?? [];
    if (userTweets.length === 0) return;

    const snapshotSetting = await storage.getSetting("tweet_metrics_snapshot");
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
          const eventKey = `like:init:${tweet.id}`;
          await storage.upsertLiveFollowerInteraction({
            type: "like",
            username: `${likes} like${likes > 1 ? "s" : ""} on "${tweetText}…"`,
            tweetId: tweet.id,
            xEventKey: eventKey,
            seen: false,
            createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
          });
        }
        if (retweets > 0) {
          const eventKey = `retweet:init:${tweet.id}`;
          await storage.upsertLiveFollowerInteraction({
            type: "retweet",
            username: `${retweets} retweet${retweets > 1 ? "s" : ""} on "${tweetText}…"`,
            tweetId: tweet.id,
            xEventKey: eventKey,
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
        const eventKey = `like:delta:${tweet.id}:${likes}`;
        await storage.upsertLiveFollowerInteraction({
          type: "like",
          username: `+${newLikes} new like${newLikes > 1 ? "s" : ""} on "${tweetText}…"`,
          tweetId: tweet.id,
          xEventKey: eventKey,
          seen: false,
          createdAt: new Date(),
        });
        console.log(`[EngagementPoller] +${newLikes} like(s) on tweet ${tweet.id}`);
      }

      if (newRetweets > 0) {
        const eventKey = `retweet:delta:${tweet.id}:${retweets}`;
        await storage.upsertLiveFollowerInteraction({
          type: "retweet",
          username: `+${newRetweets} new retweet${newRetweets > 1 ? "s" : ""} on "${tweetText}…"`,
          tweetId: tweet.id,
          xEventKey: eventKey,
          seen: false,
          createdAt: new Date(),
        });
        console.log(`[EngagementPoller] +${newRetweets} retweet(s) on tweet ${tweet.id}`);
      }
    }

    await storage.upsertSetting("tweet_metrics_snapshot", JSON.stringify(newSnapshot));
    if (isFirstRun) {
      console.log(`[EngagementPoller] Initial tweet metrics snapshot stored (${userTweets.length} tweets)`);
    }
  } catch (err: any) {
    console.error("[EngagementPoller] tweet metrics delta error:", err.message);
  }
}

let lastSnapshotDate = "";

async function snapshotMetrics(client: any, userId: string) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (today === lastSnapshotDate) return;

    const me = await client.v2.me({ "user.fields": ["public_metrics"] });
    const followers = me.data.public_metrics?.followers_count ?? 0;

    const timelineResult = await client.v2.userTimeline(userId, {
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
      name: dayLabel,
      engagement: todayEngagement,
      followers,
    });

    lastSnapshotDate = today;
    console.log(`[EngagementPoller] Metrics snapshot: ${dayLabel} engagement=${todayEngagement} followers=${followers}`);
  } catch (err: any) {
    console.error("[EngagementPoller] snapshotMetrics error:", err.message);
  }
}
