import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { queryClient, apiRequest } from "./queryClient";
import type {
  Tweet, MediaItem, Engagement, FollowerInteraction,
  LiveFollowerInteraction, CommentThread,
  Trend, ActivityLog, AnalyticsData, PeakTime, Setting,
} from "@shared/schema";

export function useTweets() {
  return useQuery<Tweet[]>({ queryKey: ["/api/tweets"] });
}

export function useCreateTweet() {
  return useMutation({
    mutationFn: async (data: Partial<Tweet>) => {
      const res = await apiRequest("POST", "/api/tweets", data);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tweets"] }),
  });
}

export function useUpdateTweet() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<Tweet>) => {
      const res = await apiRequest("PATCH", `/api/tweets/${id}`, data);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tweets"] }),
  });
}

export function useDeleteTweet() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tweets/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tweets"] }),
  });
}

export function useMediaItems() {
  return useQuery<MediaItem[]>({ queryKey: ["/api/media"] });
}

export function useCreateMediaItem() {
  return useMutation({
    mutationFn: async (data: Partial<MediaItem>) => {
      const res = await apiRequest("POST", "/api/media", data);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/media"] }),
  });
}

export function useEngagements() {
  return useQuery<Engagement[]>({ queryKey: ["/api/engagements"] });
}

export function useUpdateEngagement() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<Engagement>) => {
      const res = await apiRequest("PATCH", `/api/engagements/${id}`, data);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/engagements"] }),
  });
}

export function useFollowerInteractions() {
  return useQuery<FollowerInteraction[]>({ queryKey: ["/api/follower-interactions"] });
}

export function useTrends() {
  return useQuery<Trend[]>({ queryKey: ["/api/trends"] });
}

export function useActivityLogs() {
  return useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
    refetchInterval: 30_000,
  });
}

export function useAnalyticsData() {
  return useQuery<AnalyticsData[]>({ queryKey: ["/api/analytics"] });
}

export function usePeakTimes() {
  return useQuery<PeakTime[]>({ queryKey: ["/api/peak-times"] });
}

export type TwitterMetrics = {
  followers: number;
  following: number;
  tweetCount: number;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  engagementRate: number;
  dailyMetrics: { date: string; engagement: number; impressions: number; likes: number; retweets: number; replies: number; tweetCount: number }[];
  error?: string;
};

export function useTwitterMetrics() {
  return useQuery<TwitterMetrics>({
    queryKey: ["/api/twitter/metrics"],
    refetchInterval: 5 * 60 * 1000,
  });
}

export type TwitterPeakTime = {
  day: string;
  time: string;
  score: number;
  avgEngagement: number;
  tweetCount: number;
};

export function useTwitterPeakTimes() {
  return useQuery<{ peakTimes: TwitterPeakTime[]; topPeak: TwitterPeakTime | null }>({
    queryKey: ["/api/twitter/peak-times"],
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useSettings() {
  return useQuery<Setting[]>({ queryKey: ["/api/settings"] });
}

export function useUpdateSetting() {
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("PUT", `/api/settings/${key}`, { value });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/settings"] }),
  });
}

export function useUploadMedia() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/media"] }),
  });
}

export function useDeleteMediaItem() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/media/${id}`);
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/media"] }),
  });
}

export function useGenerateTweets() {
  return useMutation({
    mutationFn: async (data: { style: string; topic?: string; seductiveness?: number; imageUrl?: string }) => {
      const res = await apiRequest("POST", "/api/generate", data);
      return res.json() as Promise<{ tweets: string[] }>;
    },
  });
}

export function useTwitterStatus() {
  return useQuery<{
    connected: boolean;
    handle?: string;
    name?: string;
    followersCount?: number;
    error?: string;
  }>({
    queryKey: ["/api/twitter/status"],
    staleTime: 30000,
    retry: false,
  });
}

export function useTwitterHomeTimeline() {
  return useQuery<any[]>({
    queryKey: ["/api/twitter/home-timeline"],
    staleTime: 2 * 60 * 1000,
  });
}

export function useTestTwitterConnection() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/twitter/status");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/twitter/status"] }),
  });
}

export function useThreadsStatus() {
  return useQuery<{
    connected: boolean;
    username?: string;
    error?: string;
  }>({
    queryKey: ["/api/threads/status"],
    staleTime: 30000,
    retry: false,
  });
}

export function useConnectedAccounts() {
  return useQuery<any[]>({
    queryKey: ["/api/auth/connected-accounts"],
    staleTime: 30000,
    retry: false,
  });
}

export function useTestThreadsConnection() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/threads/status");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/threads/status"] }),
  });
}

export type TrendTopic = {
  id: number;
  title: string;
  traffic: string;
  trafficNumber: number;
  growthPercent: string;
  status: string;
  startedAgo: string;
  startedAgoMinutes: number;
  relatedQueries: string[];
  articles: Array<{ title: string; url: string; source: string }>;
  searchQuery: string;
  category?: string;
};

export type TrendsFilters = {
  geo: string;
  category: string;
  timeWindow: string;
  sortBy: string;
};

export function useTrendingTopics(filters: TrendsFilters) {
  return useQuery<{
    topics: TrendTopic[];
    geo: string;
    category: string;
    timeWindow: string;
    sortBy: string;
    source?: string;
    fetchedAt: string;
  }>({
    queryKey: ["/api/trending-topics", filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        geo: filters.geo,
        category: filters.category,
        timeWindow: filters.timeWindow,
        sortBy: filters.sortBy,
      });
      const res = await fetch(`/api/trending-topics?${params}`);
      if (!res.ok) throw new Error("Failed to fetch trends");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useAnalyzePost() {
  return useMutation({
    mutationFn: async (data: {
      trendTopic?: string;
      trendGrowth?: string;
      trendContext?: string;
      postText: string;
      imageUrl?: string;
      authorFollowers?: string;
      likes?: number;
      replies?: number;
      retweets?: number;
      timeElapsed?: string;
      niche?: string;
      commentStyle?: string;
      customPrompt?: string;
    }) => {
      const res = await apiRequest("POST", "/api/analyze-post", data);
      return res.json();
    },
  });
}

export function useAnalyzeFeedPost() {
  return useMutation({
    mutationFn: async (data: {
      postText: string;
      imageUrl?: string;
      authorFollowers?: string;
      likes?: number;
      replies?: number;
      retweets?: number;
      timeElapsed?: string;
      niche?: string;
      customPrompt?: string;
      authorName?: string;
      authorUsername?: string;
    }) => {
      const res = await apiRequest("POST", "/api/analyze-feed-post", data);
      return res.json();
    },
  });
}

export function useScanScreenshot() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/scan-screenshot", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Screenshot scan failed");
      }
      return res.json();
    },
  });
}

export function useSeedData() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/seed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

// Legacy type kept for backward compat
export type XComment = {
  commentId: string;
  commentAuthor: string;
  commentAuthorName: string;
  commentText: string;
  parentTweetId: string;
  parentTweetText: string;
  createdAt: string;
  threadId?: string;
};

export function useFetchXComments(enabled: boolean) {
  return useQuery<{ comments: XComment[] }>({
    queryKey: ["/api/engagement/comments"],
    queryFn: () => fetchJson<{ comments: XComment[] }>("/api/engagement/comments"),
    enabled,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

/** Parse a fetch Response as JSON safely — throws a readable error if HTML is returned. */
async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      `Expected JSON from ${res.url} but got: ${text.slice(0, 120)}`,
    );
  }
  return res.json() as Promise<T>;
}

/** Fetch a JSON endpoint, throwing a clean error on non-OK or non-JSON responses. */
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    // Try to extract a message from the body, fall back to status text
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || `HTTP ${res.status}`);
    }
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return safeJson<T>(res);
}

export function useLiveCommentThreads(platform?: string) {
  const url = platform && platform !== "all"
    ? `/api/engagement/live-comments?platform=${platform}`
    : "/api/engagement/live-comments";
  return useQuery<{ threads: CommentThread[] }>({
    queryKey: ["/api/engagement/live-comments", platform],
    queryFn: () => fetchJson<{ threads: CommentThread[] }>(url),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useLiveFollowerInteractions(platform?: string) {
  const url = platform && platform !== "all"
    ? `/api/engagement/live-interactions?platform=${platform}`
    : "/api/engagement/live-interactions";
  return useQuery<{ interactions: LiveFollowerInteraction[] }>({
    queryKey: ["/api/engagement/live-interactions", platform],
    queryFn: () => fetchJson<{ interactions: LiveFollowerInteraction[] }>(url),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  });
}

// Poller status
export function useEngagementStatus() {
  return useQuery<{ running: boolean; paused: boolean; lastPollAt: string | null; error: string | null; hasCredentials: boolean }>({
    queryKey: ["/api/engagement/status"],
    queryFn: () => fetchJson("/api/engagement/status"),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

// SSE subscription — invalidates queries when backend emits an update
export function useEngagementSSE() {
  const qc = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/engagement/events");
    sourceRef.current = source;

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "update") {
          qc.invalidateQueries({ queryKey: ["/api/engagement/live-comments"] });
          qc.invalidateQueries({ queryKey: ["/api/engagement/live-interactions"] });
          qc.invalidateQueries({ queryKey: ["/api/engagement/status"] });
        }
      } catch {
        // ignore parse errors
      }
    };

    source.onerror = () => {
      // EventSource auto-reconnects — no action needed
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [qc]);
}

export function useGenerateEngagementReply() {
  return useMutation({
    mutationFn: async (data: { parentTweetText: string; commentText: string; customPrompt?: string }) => {
      const res = await apiRequest("POST", "/api/engagement/generate-reply", data);
      return res.json() as Promise<{ reply: string; sentiment: string }>;
    },
  });
}

export function useSendEngagementReply() {
  return useMutation({
    mutationFn: async (data: { commentId: string; threadId?: string; replyText: string; platform?: string }) => {
      const res = await apiRequest("POST", "/api/engagement/send-reply", data);
      return res.json() as Promise<{ success: boolean; tweetId: string; threadId: string }>;
    },
  });
}

export function usePauseEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/engagement/pause");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/engagement/status"] }),
  });
}

export function useResumeEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/engagement/resume");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/engagement/status"] }),
  });
}

export function usePostNow() {
  return useMutation({
    mutationFn: async (data: { text: string; imageUrl?: string; platform?: "x" | "threads" }) => {
      const res = await apiRequest("POST", "/api/content/post-now", data);
      return res.json() as Promise<{ success: boolean; tweetId: string }>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tweets"] }),
  });
}
