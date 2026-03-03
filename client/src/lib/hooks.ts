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
