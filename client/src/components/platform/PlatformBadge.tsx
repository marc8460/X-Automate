import { cn } from "@/lib/utils";
import type { Platform } from "@/types/platform";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-current", className)}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 192 192" className={cn("fill-current", className)}>
      <path d="M141.537 88.988c-.827-.394-1.667-.776-2.518-1.143-1.482-27.307-16.403-42.94-41.457-43.1h-.338c-15 0-27.457 6.397-35.128 18.037l13.779 9.452c5.731-8.695 14.724-10.548 21.347-10.548h.077c8.25.053 14.474 2.451 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.049-7.314-1.243-15.224-1.625-23.68-1.14-23.82 1.372-39.134 15.265-38.106 34.569.52 9.792 5.399 18.216 13.734 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.23-5.436 29.05-14.127 5.178-6.6 8.453-15.153 9.9-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.059-7.484-51.275-21.742-10.502-13.351-15.93-32.635-16.133-57.317.203-24.682 5.631-43.966 16.133-57.317 11.216-14.258 28.466-21.573 51.275-21.742 22.975.17 40.526 7.511 52.171 21.838 5.71 7.025 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.607-16.22-32.643C147.036 10.296 125.202 1.063 97.07.928h-.111C68.88 1.063 47.292 10.274 32.788 27.974 19.882 43.807 13.224 66.174 13.001 95.933L13 96l.001.067c.223 29.759 6.881 52.126 19.787 67.959 14.504 17.7 36.094 26.91 64.169 27.046h.111c24.96-.121 44.456-6.856 58.857-20.853 19.126-18.66 18.752-42.139 12.402-56.747-4.918-11.815-13.874-20.696-26.79-26.484zM98.44 129.507c-10.44.588-21.286-4.098-21.82-14.135-.384-7.442 5.308-15.746 22.473-16.736 1.966-.113 3.896-.168 5.79-.168 6.235 0 12.068.606 17.372 1.766-1.978 24.702-13.58 28.713-23.815 29.273z" />
    </svg>
  );
}

const CONFIGS: Record<Platform, { label: string; Icon: React.FC<{ className?: string }>; className: string }> = {
  x: {
    label: "X",
    Icon: XIcon,
    className: "bg-white/10 text-white border-white/20",
  },
  threads: {
    label: "Threads",
    Icon: ThreadsIcon,
    className: "bg-neutral-900 text-white border-white/10",
  },
  instagram: {
    label: "Instagram",
    Icon: ({ className }) => <span className={className}>IG</span>,
    className: "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0",
  },
  tiktok: {
    label: "TikTok",
    Icon: ({ className }) => <span className={className}>TT</span>,
    className: "bg-black text-white border-red-500/40",
  },
};

interface PlatformBadgeProps {
  platform: Platform;
  size?: "xs" | "sm";
  showLabel?: boolean;
  className?: string;
}

export function PlatformBadge({
  platform,
  size = "xs",
  showLabel = false,
  className,
}: PlatformBadgeProps) {
  const { label, Icon, className: badgeClass } = CONFIGS[platform];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        badgeClass,
        className,
      )}
    >
      <Icon className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {showLabel && <span>{label}</span>}
    </span>
  );
}
