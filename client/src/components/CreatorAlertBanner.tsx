import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ExternalLink, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

interface CreatorAlert {
  id: number;
  creatorUsername: string;
  platform: string;
  postUrl: string;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CreatorAlertBanner() {
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery<CreatorAlert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 30000,
  });

  const dismissOne = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/alerts/${id}/dismiss`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/alerts"] }),
  });

  const dismissAll = useMutation({
    mutationFn: () => apiRequest("POST", "/api/alerts/dismiss-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/alerts"] }),
  });

  if (alerts.length === 0) return null;

  return (
    <div className="w-full px-4 md:px-8 pt-2 max-w-7xl mx-auto" data-testid="creator-alert-banner">
      <AnimatePresence mode="sync">
        {alerts.length > 1 && (
          <motion.div
            key="dismiss-all"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-end mb-1"
          >
            <button
              onClick={() => dismissAll.mutate()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              data-testid="button-dismiss-all-alerts"
            >
              <XCircle className="w-3 h-3" />
              Dismiss all ({alerts.length})
            </button>
          </motion.div>
        )}

        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-1.5"
          >
            <div
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                alert.platform === "x"
                  ? "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50"
                  : "bg-fuchsia-500/10 border-fuchsia-500/30 hover:border-fuchsia-500/50"
              }`}
              data-testid={`alert-creator-${alert.id}`}
            >
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${
                  alert.platform === "x" ? "bg-blue-400" : "bg-fuchsia-400"
                }`}
              />

              <a
                href={alert.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center gap-2 min-w-0"
                data-testid={`link-alert-${alert.id}`}
              >
                <span className="text-sm font-medium truncate">
                  <span className="font-semibold">@{alert.creatorUsername}</span>
                  {" posted on "}
                  <span className="capitalize">{alert.platform === "x" ? "X" : "Threads"}</span>
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {timeAgo(alert.createdAt)}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </a>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissOne.mutate(alert.id);
                }}
                className="p-1 rounded-md hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                data-testid={`button-dismiss-alert-${alert.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
