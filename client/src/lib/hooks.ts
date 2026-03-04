import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./queryClient";
import type {
  Tweet, MediaItem, Engagement, FollowerInteraction,
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
  return useQuery<ActivityLog[]>({ queryKey: ["/api/activity-logs"] });
}

export function useAnalyticsData() {
  return useQuery<AnalyticsData[]>({ queryKey: ["/api/analytics"] });
}

export function usePeakTimes() {
  return useQuery<PeakTime[]>({ queryKey: ["/api/peak-times"] });
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

export function useTestTwitterConnection() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/twitter/status");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/twitter/status"] }),
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
