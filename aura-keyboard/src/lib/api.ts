import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "aura_api_token";
const BASE_URL_KEY = "aura_base_url";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getBaseUrl(): Promise<string> {
  const url = await SecureStore.getItemAsync(BASE_URL_KEY);
  return url || "";
}

export async function setBaseUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(BASE_URL_KEY, url.replace(/\/$/, ""));
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const baseUrl = await getBaseUrl();
  if (!token || !baseUrl) throw new Error("Not configured");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((options.headers as Record<string, string>) || {}),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const resp = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`API ${resp.status}: ${body}`);
  }
  return resp;
}

export async function fetchPersona() {
  const resp = await authFetch("/api/mobile/persona");
  return resp.json();
}

export async function generateReply(chatContext: string, customInstruction?: string) {
  const resp = await authFetch("/api/mobile/generate-reply", {
    method: "POST",
    body: JSON.stringify({ chatContext, customInstruction }),
  });
  return resp.json();
}

export async function generateComments(postContext: string, imageAnalysis?: string, customInstruction?: string) {
  const resp = await authFetch("/api/mobile/generate-comments", {
    method: "POST",
    body: JSON.stringify({ postContext, imageAnalysis, customInstruction }),
  });
  return resp.json();
}

export async function fetchMediaVault() {
  const resp = await authFetch("/api/mobile/media");
  return resp.json();
}

export async function analyzeScreenshot(uri: string) {
  const formData = new FormData();
  formData.append("screenshot", {
    uri,
    name: "screenshot.jpg",
    type: "image/jpeg",
  } as any);

  const resp = await authFetch("/api/mobile/analyze-screenshot", {
    method: "POST",
    body: formData,
  });
  return resp.json();
}

export async function testConnection(): Promise<boolean> {
  try {
    const resp = await authFetch("/api/mobile/persona");
    return resp.ok;
  } catch {
    return false;
  }
}
