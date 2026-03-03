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
    console.error("Twitter auth error details:", JSON.stringify({
      message: err.message,
      code: err.code,
      data: err.data,
      errors: err.errors,
      rateLimit: err.rateLimit,
      hasAppKey: !!process.env.TWITTER_APP_KEY,
      appKeyLength: process.env.TWITTER_APP_KEY?.length,
      hasAppSecret: !!process.env.TWITTER_APP_SECRET,
      appSecretLength: process.env.TWITTER_APP_SECRET?.length,
      hasAccessToken: !!process.env.TWITTER_ACCESS_TOKEN,
      accessTokenLength: process.env.TWITTER_ACCESS_TOKEN?.length,
      hasAccessSecret: !!process.env.TWITTER_ACCESS_SECRET,
      accessSecretLength: process.env.TWITTER_ACCESS_SECRET?.length,
    }, null, 2));
    const detail = err.data?.detail || err.data?.errors?.[0]?.message || err.message || "Failed to connect to Twitter";
    return {
      connected: false,
      error: detail,
    };
  }
}
