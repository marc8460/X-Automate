import { TwitterApi } from "twitter-api-v2";

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
    const me = await client.v2.me({
      "user.fields": ["public_metrics", "name", "username"],
    });
    return {
      connected: true,
      handle: `@${me.data.username}`,
      name: me.data.name,
      followersCount: me.data.public_metrics?.followers_count,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || "Failed to connect to Twitter",
    };
  }
}
