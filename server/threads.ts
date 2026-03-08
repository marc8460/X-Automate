import { storage } from "./storage";

export async function getThreadsAccessToken(): Promise<string | null> {
  const token = process.env.THREADS_ACCESS_TOKEN;
  if (token) return token;
  
  const setting = await storage.getSetting("threads_access_token");
  return setting?.value || null;
}

export async function getThreadsAccessTokenForUser(userId: string): Promise<string | null> {
  const account = await storage.getConnectedAccount(userId, "threads");
  if (account) return account.accessToken;
  return getThreadsAccessToken();
}

export async function getThreadsProfile(accessToken?: string | null) {
  const token = accessToken || await getThreadsAccessToken();
  if (!token) return null;

  const res = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch Threads profile");
  }
  return res.json();
}

export async function getThreadsUserMetrics(accessToken?: string | null) {
  const token = accessToken || await getThreadsAccessToken();
  if (!token) return null;

  const res = await fetch(`https://graph.threads.net/v1.0/me?fields=follower_count,following_count,post_count&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch Threads metrics");
  }
  return res.json();
}

export async function getThreadsPosts(accessToken?: string | null, limit = 25) {
  const token = accessToken || await getThreadsAccessToken();
  if (!token) return [];

  const res = await fetch(`https://graph.threads.net/v1.0/me/threads?fields=id,media_product_type,media_type,media_url,thumbnail_url,text,timestamp,shortcode,is_quote_post,like_count,reply_count,quote_count,repost_count&limit=${limit}&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch Threads posts");
  }
  const data = await res.json();
  return data.data || [];
}

export async function getThreadsPostInsights(mediaId: string, accessToken?: string | null) {
  const token = accessToken || await getThreadsAccessToken();
  if (!token) return null;

  const res = await fetch(`https://graph.threads.net/v1.0/${mediaId}?fields=id,text,timestamp,media_type,media_url,thumbnail_url,like_count,reply_count,quote_count,repost_count&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch post insights");
  }
  return res.json();
}

export async function getThreadsConversation(mediaId: string, accessToken?: string | null) {
  const token = accessToken || await getThreadsAccessToken();
  if (!token) return [];

  const res = await fetch(`https://graph.threads.net/v1.0/${mediaId}/conversation?fields=id,text,timestamp,username,media_url,thumbnail_url&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch conversation");
  }
  const data = await res.json();
  return data.data || [];
}

export async function getThreadsPostMetrics(mediaId: string, accessToken?: string | null) {
  const token = accessToken || await getThreadsAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://graph.threads.net/v1.0/${mediaId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${token}`);
    if (!res.ok) return null;
    const data = await res.json();
    const metrics: Record<string, number> = {};
    for (const entry of data.data || []) {
      metrics[entry.name] = entry.values?.[0]?.value ?? 0;
    }
    return metrics;
  } catch {
    return null;
  }
}

export async function getThreadsReplies(mediaId: string, accessToken?: string | null) {
  const token = accessToken || await getThreadsAccessToken();
  if (!token) return [];

  const res = await fetch(`https://graph.threads.net/v1.0/${mediaId}/replies?fields=id,text,timestamp,username,user_id&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch Threads replies");
  }
  const data = await res.json();
  return data.data || [];
}

export async function testThreadsConnection(accessToken?: string | null) {
  try {
    const profile = await getThreadsProfile(accessToken);
    return { connected: !!profile, username: profile?.username };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}

export async function testThreadsConnectionForUser(userId: string) {
  const token = await getThreadsAccessTokenForUser(userId);
  return testThreadsConnection(token);
}

async function getThreadsUserId(accessToken?: string | null): Promise<string> {
  const profile = await getThreadsProfile(accessToken);
  if (!profile?.id) throw new Error("Could not resolve Threads user ID");
  return profile.id;
}

export async function createThreadsPost(text: string, imageUrl?: string, accessToken?: string | null): Promise<{ id: string }> {
  const token = accessToken || await getThreadsAccessToken();
  if (!token) throw new Error("Threads access token not configured");
  const userId = await getThreadsUserId(token);

  const containerParams = new URLSearchParams({
    media_type: imageUrl ? "IMAGE" : "TEXT",
    text,
    access_token: token,
  });
  if (imageUrl) containerParams.set("image_url", imageUrl);

  const containerRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads`,
    { method: "POST", body: containerParams },
  );
  if (!containerRes.ok) {
    const err = await containerRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to create Threads post container");
  }
  const { id: creationId } = await containerRes.json();

  const publishParams = new URLSearchParams({ creation_id: creationId, access_token: token });
  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads_publish`,
    { method: "POST", body: publishParams },
  );
  if (!publishRes.ok) {
    const err = await publishRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to publish Threads post");
  }
  const { id } = await publishRes.json();
  return { id };
}

export async function replyToThreadsComment(mediaId: string, replyText: string, accessToken?: string | null): Promise<{ id: string }> {
  const token = accessToken || await getThreadsAccessToken();
  if (!token) throw new Error("Threads access token not configured");
  const userId = await getThreadsUserId(token);

  const containerParams = new URLSearchParams({
    media_type: "TEXT",
    text: replyText,
    reply_to_id: mediaId,
    access_token: token,
  });
  const containerRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads`,
    { method: "POST", body: containerParams },
  );
  if (!containerRes.ok) {
    const err = await containerRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to create Threads reply container");
  }
  const { id: creationId } = await containerRes.json();

  const publishParams = new URLSearchParams({ creation_id: creationId, access_token: token });
  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads_publish`,
    { method: "POST", body: publishParams },
  );
  if (!publishRes.ok) {
    const err = await publishRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to publish Threads reply");
  }
  const { id } = await publishRes.json();
  return { id };
}

export function generateThreadsOAuthUrl(userId: string, callbackUrl: string): { url: string; state: string } {
  const appId = process.env.THREADS_APP_ID;
  if (!appId) throw new Error("THREADS_APP_ID not configured");

  const state = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: callbackUrl,
    scope: "threads_basic,threads_content_publish,threads_manage_replies,threads_manage_insights,threads_read_replies",
    response_type: "code",
    state,
  });

  return {
    url: `https://threads.net/oauth/authorize?${params.toString()}`,
    state,
  };
}

const threadsOAuthStates = new Map<string, { userId: string; createdAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [state, data] of threadsOAuthStates) {
    if (now - data.createdAt > 10 * 60 * 1000) threadsOAuthStates.delete(state);
  }
}, 60_000);

export function storeThreadsOAuthState(state: string, userId: string) {
  threadsOAuthStates.set(state, { userId, createdAt: Date.now() });
}

export async function handleThreadsOAuthCallback(state: string, code: string, callbackUrl: string): Promise<{ success: boolean; username?: string; error?: string }> {
  const stateData = threadsOAuthStates.get(state);
  if (!stateData) return { success: false, error: "Invalid or expired OAuth state" };

  threadsOAuthStates.delete(state);

  const appId = process.env.THREADS_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;
  if (!appId || !appSecret) return { success: false, error: "Threads app credentials not configured" };

  try {
    const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      return { success: false, error: err.error_message || "Token exchange failed" };
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;

    const longLivedRes = await fetch(`https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`);
    let accessToken = shortLivedToken;
    let expiresIn = 3600;

    if (longLivedRes.ok) {
      const longData = await longLivedRes.json();
      accessToken = longData.access_token || shortLivedToken;
      expiresIn = longData.expires_in || 5184000;
    }

    const profile = await getThreadsProfile(accessToken);

    await storage.upsertConnectedAccount({
      userId: stateData.userId,
      platform: "threads",
      platformUserId: profile?.id || tokenData.user_id?.toString() || null,
      platformUsername: profile?.username || null,
      accessToken,
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    });

    return { success: true, username: profile?.username };
  } catch (err: any) {
    console.error("[threads] OAuth callback error:", err.message);
    return { success: false, error: err.message || "OAuth failed" };
  }
}
