export type Platform = "x" | "threads" | "instagram" | "tiktok";
export type SelectedPlatform = Platform | "all";

export interface PlatformConfig {
  id: Platform;
  label: string;
  charLimit: number;
  available: boolean;
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  x: { id: "x", label: "X", charLimit: 280, available: true },
  threads: { id: "threads", label: "Threads", charLimit: 500, available: true },
  instagram: { id: "instagram", label: "Instagram", charLimit: 2200, available: false },
  tiktok: { id: "tiktok", label: "TikTok", charLimit: 2200, available: false },
};

export interface ConnectedAccount {
  id: string;
  platform: Platform;
  username: string;
  displayName: string;
  avatarUrl?: string;
  connected: boolean;
  followers?: number;
}
