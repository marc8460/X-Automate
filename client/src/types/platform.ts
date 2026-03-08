export type Platform = "x" | "threads" | "instagram" | "tiktok" | "reddit";
export type SelectedPlatform = Platform | "all";

export interface PlatformConfig {
  id: Platform;
  label: string;
  charLimit: number;
  available: boolean;
  hasApi: boolean;
  postingMethod: "extension" | "api" | "none";
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  x:         { id: "x",         label: "X",         charLimit: 280,   available: true,  hasApi: false, postingMethod: "extension" },
  threads:   { id: "threads",   label: "Threads",   charLimit: 500,   available: true,  hasApi: true,  postingMethod: "api" },
  instagram: { id: "instagram", label: "Instagram", charLimit: 2200,  available: false, hasApi: false, postingMethod: "none" },
  tiktok:    { id: "tiktok",    label: "TikTok",    charLimit: 2200,  available: false, hasApi: false, postingMethod: "none" },
  reddit:    { id: "reddit",    label: "Reddit",    charLimit: 40000, available: false, hasApi: false, postingMethod: "none" },
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
