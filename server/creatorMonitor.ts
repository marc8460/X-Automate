import { storage } from "./storage";
import { sendPushToUser } from "./pushNotifications";
import { log } from "./index";
import { eq } from "drizzle-orm";
import { getTwitterClient, getTwitterClientForUser } from "./twitter";
import type { TwitterApi } from "twitter-api-v2";

const twitterUserIdCache = new Map<string, string>();

const POLL_INTERVAL_MS = 45_000;
const THREADS_BATCH_SIZE = 10;
const THREADS_BATCH_DELAY_MS = 2000;
const X_CHECK_INTERVAL_MS = 5 * 60_000;
let lastXCheckTime = 0;

async function fetchLatestThreadsPost(username: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://www.threads.net/@${username}`, {
      headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; AuraBot/1.0)" },
    });
    if (!resp.ok) return null;
    const html = await resp.text();

    const postPattern = new RegExp(`/@${username}/post/([A-Za-z0-9_-]+)`, "g");
    const matches: string[] = [];
    let match;
    while ((match = postPattern.exec(html)) !== null) {
      if (!matches.includes(match[1])) matches.push(match[1]);
    }

    return matches.length > 0 ? matches[0] : null;
  } catch (err: any) {
    log(`Fetch error for @${username}: ${err.message}`, "creator-monitor");
    return null;
  }
}

async function fetchLatestXPost(username: string, client: TwitterApi): Promise<string | null> {
  try {
    let twitterUserId = twitterUserIdCache.get(username);
    if (!twitterUserId) {
      const userResult = await client.v2.userByUsername(username);
      if (!userResult.data?.id) return null;
      twitterUserId = userResult.data.id;
      twitterUserIdCache.set(username, twitterUserId);
    }

    const timeline = await client.v2.userTimeline(twitterUserId, {
      max_results: 5,
      exclude: ["retweets", "replies"],
    });

    const tweets = timeline.data?.data;
    if (!tweets || tweets.length === 0) return null;

    return tweets[0].id;
  } catch (err: any) {
    log(`Twitter fetch error for @${username}: ${err.message}`, "creator-monitor");
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleNewPost(creator: any, latestPostId: string) {
  const previousPostId = creator.lastPostId;
  await storage.updateCreatorLastPost(creator.id, latestPostId);

  if (previousPostId && previousPostId !== latestPostId) {
    let postUrl = "";
    if (creator.platform === "threads") {
      postUrl = `https://www.threads.net/@${creator.username}/post/${latestPostId}`;
    } else if (creator.platform === "x") {
      postUrl = `https://x.com/${creator.username}/status/${latestPostId}`;
    }

    log(`New post from @${creator.username}: ${postUrl}`, "creator-monitor");

    const allSameCreator = await storage.getAllWatchedCreatorsByPlatform(creator.platform);
    const usersWatching = new Set<string>();
    for (const wc of allSameCreator) {
      if (wc.username === creator.username) {
        usersWatching.add(wc.userId);
      }
    }

    for (const uid of usersWatching) {
      await sendPushToUser(uid, {
        title: `🔥 New post from @${creator.username}`,
        body: "Posted just now — Reply early for maximum reach",
        url: postUrl,
      });

      await storage.createCreatorAlert({
        userId: uid,
        creatorUsername: creator.username,
        platform: creator.platform,
        postId: latestPostId,
        postUrl,
      });
    }
  }
}

async function pollCreators() {
  try {
    const creators = await storage.getCreatorsToCheck(45);
    if (creators.length === 0) return;

    const threadsCreators = creators.filter(c => c.platform === "threads");
    const xCreators = creators.filter(c => c.platform === "x");

    log(`Checking ${threadsCreators.length} Threads + ${xCreators.length} X creators`, "creator-monitor");

    for (let i = 0; i < threadsCreators.length; i += THREADS_BATCH_SIZE) {
      const batch = threadsCreators.slice(i, i + THREADS_BATCH_SIZE);
      await Promise.all(batch.map(async (creator) => {
        try {
          const latestPostId = await fetchLatestThreadsPost(creator.username);
          if (!latestPostId) {
            await storage.updateCreatorLastPost(creator.id, creator.lastPostId || "");
            return;
          }
          await handleNewPost(creator, latestPostId);
        } catch (err: any) {
          log(`Error checking @${creator.username}: ${err.message}`, "creator-monitor");
        }
      }));
      if (i + THREADS_BATCH_SIZE < threadsCreators.length) await sleep(THREADS_BATCH_DELAY_MS);
    }

    const now = Date.now();
    if (xCreators.length > 0 && now - lastXCheckTime >= X_CHECK_INTERVAL_MS) {
      lastXCheckTime = now;

      for (const creator of xCreators) {
        try {
          const userClient = await getTwitterClientForUser(creator.userId);
          const client = userClient || getTwitterClient();
          if (!client) {
            await storage.updateCreatorLastPost(creator.id, creator.lastPostId || "");
            continue;
          }
          const latestPostId = await fetchLatestXPost(creator.username, client);
          if (!latestPostId) {
            await storage.updateCreatorLastPost(creator.id, creator.lastPostId || "");
          } else {
            await handleNewPost(creator, latestPostId);
          }
          log(`X check: @${creator.username} done`, "creator-monitor");
        } catch (err: any) {
          if (err.message?.includes("429")) {
            lastXCheckTime = now + X_CHECK_INTERVAL_MS;
            log(`X rate limited, backing off for 10 min`, "creator-monitor");
            break;
          } else {
            log(`Error checking @${creator.username}: ${err.message}`, "creator-monitor");
            await storage.updateCreatorLastPost(creator.id, creator.lastPostId || "");
          }
        }
        await sleep(2000);
      }
      log(`X batch done: checked ${xCreators.length} creators`, "creator-monitor");
    }
  } catch (err: any) {
    log(`Creator monitor cycle error: ${err.message}`, "creator-monitor");
  }
}

let monitorInterval: ReturnType<typeof setInterval> | null = null;

export function startCreatorMonitor() {
  if (monitorInterval) return;
  log("Creator monitor started (polling every 45s)", "creator-monitor");
  monitorInterval = setInterval(pollCreators, POLL_INTERVAL_MS);
  setTimeout(pollCreators, 5000);
}

export function stopCreatorMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    log("Creator monitor stopped", "creator-monitor");
  }
}
