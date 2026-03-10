import { useState, useEffect } from "react";

function usernameColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-pink-500/20 text-pink-300 border-pink-500/30",
    "bg-purple-500/20 text-purple-300 border-purple-500/30",
    "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    "bg-amber-500/20 text-amber-300 border-amber-500/30",
    "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    "bg-rose-500/20 text-rose-300 border-rose-500/30",
    "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  ];
  return colors[Math.abs(hash) % colors.length];
}

interface ThreadsAvatarProps {
  username: string | null | undefined;
  ownProfilePicUrl?: string | null;
}

export function ThreadsAvatar({ username, ownProfilePicUrl }: ThreadsAvatarProps) {
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const safeUsername = username && username !== "unknown" ? username : null;

  // Reset fallback chain whenever the identity or own pic changes
  useEffect(() => {
    setFallbackIndex(0);
  }, [username, ownProfilePicUrl]);

  const sources: string[] = [];
  if (ownProfilePicUrl) sources.push(ownProfilePicUrl);
  if (safeUsername) {
    sources.push(`https://unavatar.io/threads/${safeUsername}`);
    sources.push(`https://unavatar.io/instagram/${safeUsername}`);
    sources.push(`https://unavatar.io/${safeUsername}`);
  }

  const currentSrc = fallbackIndex < sources.length ? sources[fallbackIndex] : undefined;

  if (currentSrc) {
    return (
      <img
        src={currentSrc}
        alt={safeUsername ?? "user"}
        className="w-8 h-8 rounded-full shrink-0 border border-border/20"
        onError={() => setFallbackIndex((i) => Math.min(i + 1, sources.length))}
      />
    );
  }

  const display = safeUsername ? safeUsername.charAt(0).toUpperCase() : "?";
  const colorClass = safeUsername ? usernameColor(safeUsername) : "bg-muted text-muted-foreground border-border/30";

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border ${colorClass}`}>
      {display}
    </div>
  );
}
