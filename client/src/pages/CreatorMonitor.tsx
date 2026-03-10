import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye, Trash2, Plus, Bell, BellOff, Twitter, AtSign,
  Clock, RefreshCw, Users,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type WatchedCreator = {
  id: number;
  username: string;
  platform: string;
  avatarUrl: string | null;
  lastPostId: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationStatus() {
  const [status, setStatus] = useState<"granted" | "denied" | "default" | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission as any : "unsupported"
  );

  const handleEnable = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setStatus(result as any);
    if (result === "granted") {
      const { registerPushNotifications } = await import("@/lib/pushSubscription");
      await registerPushNotifications();
    }
  };

  return (
    <Card className="glass-panel p-4 mb-6" data-testid="notification-status-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === "granted" ? (
            <div className="p-2 rounded-lg bg-green-500/10">
              <Bell size={18} className="text-green-500" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <BellOff size={18} className="text-yellow-500" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              Push Notifications
            </p>
            <p className="text-xs text-muted-foreground">
              {status === "granted"
                ? "Enabled — you'll get notified when tracked creators post"
                : status === "denied"
                ? "Blocked — enable notifications in your browser settings for this site"
                : status === "unsupported"
                ? "Not supported in this browser"
                : "Not enabled — click to allow notifications"}
            </p>
          </div>
        </div>
        {status === "default" && (
          <Button
            size="sm"
            onClick={handleEnable}
            data-testid="button-enable-notifications"
          >
            <Bell size={14} className="mr-1" />
            Enable
          </Button>
        )}
        {status === "granted" && (
          <Badge variant="outline" className="text-green-500 border-green-500/30">
            Active
          </Badge>
        )}
      </div>
    </Card>
  );
}

function CreatorAvatar({
  creatorId,
  username,
  avatarUrl,
  platformBg,
  platformColor,
}: {
  creatorId: number;
  username: string;
  avatarUrl: string | null;
  platformBg: string;
  platformColor: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = avatarUrl && !imgFailed;

  return (
    <div className={`w-8 h-8 rounded-full ${platformBg} flex items-center justify-center shrink-0 overflow-hidden`}>
      {showImg ? (
        <img
          src={`/api/avatar/${creatorId}`}
          alt={username}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className={`text-xs font-bold ${platformColor}`}>
          {username[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
}

function PlatformSection({
  platform,
  creators,
  isLoading,
}: {
  platform: "x" | "threads";
  creators: WatchedCreator[];
  isLoading: boolean;
}) {
  const [newUsername, setNewUsername] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await apiRequest("POST", "/api/creators/add", {
        username,
        platform,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      setNewUsername("");
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        toast({ title: `Now tracking @${newUsername.replace(/^@/, "")}` });
      }
    },
    onError: () => {
      toast({ title: "Failed to add creator", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await apiRequest(
        "DELETE",
        `/api/creators/${platform}/${username}`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      toast({ title: "Creator removed" });
    },
  });

  const handleAdd = () => {
    const clean = newUsername.replace(/^@/, "").trim();
    if (!clean) return;
    addMutation.mutate(clean);
  };

  const platformLabel = platform === "x" ? "X (Twitter)" : "Threads";
  const PlatformIcon = platform === "x" ? Twitter : AtSign;
  const platformColor = platform === "x" ? "text-blue-400" : "text-pink-400";
  const platformBg = platform === "x" ? "bg-blue-500/10" : "bg-pink-500/10";

  return (
    <Card className="glass-panel p-5 flex-1 min-w-[340px]" data-testid={`card-platform-${platform}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${platformBg}`}>
            <PlatformIcon size={18} className={platformColor} />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {platformLabel}
          </h3>
        </div>
        <Badge variant="outline" className="text-xs" data-testid={`badge-count-${platform}`}>
          {isLoading ? "..." : creators.length} creators
        </Badge>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder={`@username`}
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 bg-background/50 border-border/50 text-sm"
          data-testid={`input-add-${platform}`}
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={addMutation.isPending || !newUsername.trim()}
          data-testid={`button-add-${platform}`}
        >
          <Plus size={14} className="mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))
        ) : creators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground/60">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No creators tracked yet</p>
            <p className="text-xs mt-1">
              Add creators above or import from the extension
            </p>
          </div>
        ) : (
          creators.map((creator) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/30 hover:border-border/60 transition-colors group"
              data-testid={`row-creator-${creator.username}`}
            >
              <CreatorAvatar
                creatorId={creator.id}
                username={creator.username}
                avatarUrl={creator.avatarUrl}
                platformBg={platformBg}
                platformColor={platformColor}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  @{creator.username}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock size={10} />
                  <span>Checked {timeAgo(creator.lastCheckedAt)}</span>
                  {creator.lastPostId && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-green-500/70">Has posts</span>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeMutation.mutate(creator.username)}
                disabled={removeMutation.isPending}
                data-testid={`button-remove-${creator.username}`}
              >
                <Trash2 size={14} />
              </Button>
            </motion.div>
          ))
        )}
      </div>
    </Card>
  );
}

export default function CreatorMonitor() {
  const { data, isLoading } = useQuery<{ x: WatchedCreator[]; threads: WatchedCreator[] }>({
    queryKey: ["/api/creators"],
    refetchInterval: 30000,
  });

  const xCreators = data?.x ?? [];
  const threadsCreators = data?.threads ?? [];

  return (
    <div className="space-y-6" data-testid="page-creator-monitor">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Eye size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Creator Monitor
            </h1>
            <p className="text-sm text-muted-foreground">
              Track creators and get notified when they post new content
            </p>
          </div>
        </div>
      </motion.div>

      <NotificationStatus />

      <div className="flex flex-col lg:flex-row gap-5">
        <PlatformSection
          platform="x"
          creators={xCreators}
          isLoading={isLoading}
        />
        <PlatformSection
          platform="threads"
          creators={threadsCreators}
          isLoading={isLoading}
        />
      </div>

      <Card className="glass-panel p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw size={14} className="animate-spin-slow" />
          <p className="text-xs">
            Server checks all tracked creators every 45 seconds for new posts.
            When a new post is detected, you'll receive a push notification.
            Click the notification to open the post and generate a viral comment with the Aura extension.
          </p>
        </div>
      </Card>
    </div>
  );
}
