import { TwitterApi } from "twitter-api-v2";
import { storage } from "./storage";

export function getTwitterClient(): TwitterApi | null {
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;
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

export async function getTwitterClientForUser(userId: string): Promise<TwitterApi | null> {
  const account = await storage.getConnectedAccount(userId, "x");
  if (!account) return null;

  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now()) {
    if (account.refreshToken) {
      try {
        const refreshed = await refreshUserTwitterToken(userId, account.refreshToken);
        if (refreshed) return refreshed;
      } catch (err: any) {
        console.error("[twitter] Token refresh failed for user", userId, err.message);
        return null;
      }
    }
    return null;
  }

  return new TwitterApi(account.accessToken);
}

async function refreshUserTwitterToken(userId: string, refreshToken: string): Promise<TwitterApi | null> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) return null;

  try {
    const client = new TwitterApi({
      clientId,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });
    const { accessToken, refreshToken: newRefreshToken, expiresIn } = await client.refreshOAuth2Token(refreshToken);

    await storage.upsertConnectedAccount({
      userId,
      platform: "x",
      accessToken,
      refreshToken: newRefreshToken,
      tokenExpiresAt: new Date(Date.now() + (expiresIn || 7200) * 1000),
    });

    return new TwitterApi(accessToken);
  } catch (err: any) {
    console.error("[twitter] OAuth2 token refresh error:", err.message);
    return null;
  }
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

export async function testTwitterConnectionForUser(userId: string): Promise<{
  connected: boolean;
  handle?: string;
  name?: string;
  followersCount?: number;
  error?: string;
}> {
  const client = await getTwitterClientForUser(userId);
  if (!client) {
    return { connected: false, error: "X account not connected" };
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
    const detail = err.data?.detail || err.data?.errors?.[0]?.message || err.message || "Failed to connect to Twitter";
    return { connected: false, error: detail };
  }
}

const oauthStates = new Map<string, { codeVerifier: string; userId: string; createdAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates) {
    if (now - data.createdAt > 10 * 60 * 1000) oauthStates.delete(state);
  }
}, 60_000);

export async function generateTwitterOAuthUrl(userId: string, callbackUrl: string): Promise<{ url: string; state: string }> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) throw new Error("TWITTER_CLIENT_ID not configured");

  const client = new TwitterApi({
    clientId,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  });

  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
    scope: ["tweet.read", "tweet.write", "users.read", "follows.read", "follows.write", "like.read", "like.write", "offline.access"],
  });

  oauthStates.set(state, { codeVerifier, userId, createdAt: Date.now() });

  return { url, state };
}

export async function handleTwitterOAuthCallback(state: string, code: string, callbackUrl: string): Promise<{ success: boolean; username?: string; error?: string }> {
  const stateData = oauthStates.get(state);
  if (!stateData) return { success: false, error: "Invalid or expired OAuth state" };

  oauthStates.delete(state);

  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) return { success: false, error: "TWITTER_CLIENT_ID not configured" };

  try {
    const client = new TwitterApi({
      clientId,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code,
      codeVerifier: stateData.codeVerifier,
      redirectUri: callbackUrl,
    });

    const loggedClient = new TwitterApi(accessToken);
    const me = await loggedClient.v2.me({ "user.fields": ["username", "name"] });

    await storage.upsertConnectedAccount({
      userId: stateData.userId,
      platform: "x",
      platformUserId: me.data.id,
      platformUsername: me.data.username,
      accessToken,
      refreshToken: refreshToken || null,
      tokenExpiresAt: new Date(Date.now() + (expiresIn || 7200) * 1000),
    });

    return { success: true, username: me.data.username };
  } catch (err: any) {
    console.error("[twitter] OAuth callback error:", err.message);
    return { success: false, error: err.message || "OAuth failed" };
  }
}
