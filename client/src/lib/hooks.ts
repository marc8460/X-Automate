import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./queryClient";
import type {
  Tweet, MediaItem, Engagement, FollowerInteraction,
  Trend, ActivityLog, AnalyticsData, PeakTime, Setting,
  NicheProfile, TrendingPost, CommentSuggestion, BehaviorLimit,
} from "@shared/schema";

export function useNicheProfiles() {
  return useQuery<NicheProfile[]>({ queryKey: ["/api/niches"] });
}

export function useCreateNiche() {
  return useMutation({
    mutationFn: async (data: Partial<NicheProfile>) => {
      const res = await apiRequest("POST", "/api/niches", data);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/niches"] }),
  });
}

export function useDeleteNiche() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/niches/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/niches"] }),
  });
}

export function useTrendingPosts(nicheId?: number) {
  const queryKey = nicheId ? [`/api/trending-posts?nicheId=${nicheId}`] : ["/api/trending-posts"];
  return useQuery<(TrendingPost & { comments?: CommentSuggestion[] })[]>({ queryKey });
}

export function useDiscoverTrending() {
  return useMutation({
    mutationFn: async (nicheId: number) => {
      const res = await apiRequest("POST", "/api/trending-posts/discover", { nicheId });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/trending-posts"] }),
  });
}

export function useGenerateComments() {
  return useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest("POST", `/api/trending-posts/${postId}/generate-comments`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trending-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
    },
  });
}

export function useCommentSuggestions(postId?: number) {
  const queryKey = postId ? [`/api/comments?postId=${postId}`] : ["/api/comments"];
  return useQuery<CommentSuggestion[]>({ queryKey });
}

export function useUpdateComment() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<CommentSuggestion>) => {
      const res = await apiRequest("PATCH", `/api/comments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trending-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
    },
  });
}

export function usePostComment() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/comments/${id}/post`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trending-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
    },
  });
}

export function useDeleteTrendingPost() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/trending-posts/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/trending-posts"] }),
  });
}

export function useBehaviorLimits() {
  return useQuery<BehaviorLimit[]>({ queryKey: ["/api/behavior-limits"] });
}

export function useUpdateBehaviorLimit() {
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("POST", "/api/behavior-limits", { key, value });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/behavior-limits"] }),
  });
}

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
