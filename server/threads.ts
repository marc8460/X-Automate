import { storage } from "./storage";

export async function getThreadsAccessToken(): Promise<string | null> {
  const token = process.env.THREADS_ACCESS_TOKEN;
  if (token) return token;
  
  const setting = await storage.getSetting("threads_access_token");
  return setting?.value || null;
}

export async function getThreadsProfile() {
  const token = await getThreadsAccessToken();
  if (!token) return null;

  const res = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch Threads profile");
  }
  return res.json();
}

export async function getThreadsUserMetrics() {
  const token = await getThreadsAccessToken();
  if (!token) return null;

  const res = await fetch(`https://graph.threads.net/v1.0/me?fields=follower_count,following_count,post_count&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch Threads metrics");
  }
  return res.json();
}

export async function getThreadsPosts() {
  const token = await getThreadsAccessToken();
  if (!token) return [];

  const res = await fetch(`https://graph.threads.net/v1.0/me/threads?fields=id,media_product_type,media_type,text,timestamp,shortcode,is_quote_post&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch Threads posts");
  }
  const data = await res.json();
  return data.data || [];
}

export async function getThreadsReplies(mediaId: string) {
  const token = await getThreadsAccessToken();
  if (!token) return [];

  const res = await fetch(`https://graph.threads.net/v1.0/${mediaId}/replies?fields=id,text,timestamp,username,user_id&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch Threads replies");
  }
  const data = await res.json();
  return data.data || [];
}

export async function testThreadsConnection() {
  try {
    const profile = await getThreadsProfile();
    return { connected: !!profile, username: profile?.username };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}

async function getThreadsUserId(): Promise<string> {
  const profile = await getThreadsProfile();
  if (!profile?.id) throw new Error("Could not resolve Threads user ID");
  return profile.id;
}

export async function createThreadsPost(text: string, imageUrl?: string): Promise<{ id: string }> {
  const token = await getThreadsAccessToken();
  if (!token) throw new Error("Threads access token not configured");
  const userId = await getThreadsUserId();

  // Step 1: create media container
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

  // Step 2: publish the container
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

export async function replyToThreadsComment(mediaId: string, replyText: string): Promise<{ id: string }> {
  const token = await getThreadsAccessToken();
  if (!token) throw new Error("Threads access token not configured");
  const userId = await getThreadsUserId();

  // Step 1: create reply container
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

  // Step 2: publish the reply
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
