import { useState, useEffect, useRef, useCallback } from "react";

interface ThreadsAvatarProps {
  username: string | null | undefined;
  ownProfilePicUrl?: string | null;
  size?: "sm" | "md";
}

export function ThreadsAvatar({ username, ownProfilePicUrl, size = "md" }: ThreadsAvatarProps) {
  const safeUsername = username && username !== "unknown" ? username.replace(/^@/, "") : null;
  const [src, setSrc] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    retryRef.current = 0;
    setShowFallback(false);
    if (ownProfilePicUrl) {
      setSrc(ownProfilePicUrl);
    } else if (safeUsername) {
      setSrc(`/api/threads-avatar/${safeUsername}`);
    } else {
      setSrc(null);
      setShowFallback(true);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [username, ownProfilePicUrl, safeUsername]);

  const handleError = useCallback(() => {
    if (retryRef.current < 2 && safeUsername && !ownProfilePicUrl) {
      retryRef.current++;
      timerRef.current = setTimeout(() => {
        setSrc(`/api/threads-avatar/${safeUsername}?r=${retryRef.current}`);
      }, 5000 * retryRef.current);
    } else {
      setShowFallback(true);
    }
  }, [safeUsername, ownProfilePicUrl]);

  const sizeClass = size === "sm" ? "w-7 h-7" : "w-8 h-8";

  if (src && !showFallback) {
    return (
      <img
        src={src}
        alt={safeUsername ?? "user"}
        className={`${sizeClass} rounded-full shrink-0 border border-border/20 object-cover bg-indigo-500/20`}
        onError={handleError}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    );
  }

  const display = safeUsername ? safeUsername.charAt(0).toUpperCase() : "?";
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
  let hash = 0;
  const n = safeUsername || "?";
  for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
  const colorClass = colors[Math.abs(hash) % colors.length];
  const textSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center ${textSize} font-bold shrink-0 border ${colorClass}`}>
      {display}
    </div>
  );
}
