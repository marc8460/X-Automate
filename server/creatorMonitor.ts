import { storage } from "./storage";
import { sendPushToUser } from "./pushNotifications";
import { log } from "./index";
import { eq } from "drizzle-orm";

const POLL_INTERVAL_MS = 45_000;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000;

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollCreators() {
  try {
    const creators = await storage.getCreatorsToCheck(45);
    if (creators.length === 0) return;

    log(`Checking ${creators.length} creators for new posts`, "creator-monitor");

    for (let i = 0; i < creators.length; i += BATCH_SIZE) {
      const batch = creators.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (creator) => {
        try {
          let latestPostId: string | null = null;

          if (creator.platform === "threads") {
            latestPostId = await fetchLatestThreadsPost(creator.username);
          }

          if (!latestPostId) {
            await storage.updateCreatorLastPost(creator.id, creator.lastPostId || "");
            return;
          }

          const previousPostId = creator.lastPostId;
          await storage.updateCreatorLastPost(creator.id, latestPostId);

          if (previousPostId && previousPostId !== latestPostId) {
            let postUrl = "";
            if (creator.platform === "threads") {
              postUrl = `https://www.threads.net/@${creator.username}/post/${latestPostId}`;
            }

            log(`New post from @${creator.username}: ${postUrl}`, "creator-monitor");

            const allCreatorsForUser = await storage.getWatchedCreators(creator.userId);
            const usersWatching = new Set<string>();

            const allSameCreator = await storage.getAllWatchedCreatorsByPlatform(creator.platform);
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
            }
          }
        } catch (err: any) {
          log(`Error checking @${creator.username}: ${err.message}`, "creator-monitor");
        }
      }));

      if (i + BATCH_SIZE < creators.length) {
        await sleep(BATCH_DELAY_MS);
      }
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
