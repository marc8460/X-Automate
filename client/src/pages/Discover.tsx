import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Zap, Lightbulb, ExternalLink, RefreshCw, Copy, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import ViralEngine from "./ViralEngine";

// ─── Trends Tab ───────────────────────────────────────────────────────────────

function TrendCard({ topic, index }: { topic: any; index: number }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleCopy = () => {
    navigator.clipboard.writeText(topic.topic || topic.title || "");
    toast({ title: "Topic copied" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="glass-panel p-4 hover:border-primary/20 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-xs font-bold text-muted-foreground/40 w-5 shrink-0 mt-0.5">
              #{index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight truncate">
                {topic.topic || topic.title || "Trending topic"}
              </p>
              {topic.relatedTopics && topic.relatedTopics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {topic.relatedTopics.slice(0, 3).map((rt: string) => (
                    <span key={rt} className="text-[10px] px-1.5 py-0.5 bg-secondary/50 rounded text-muted-foreground">
                      {rt}
                    </span>
                  ))}
                </div>
              )}
              {topic.aiAnalysis?.recommendation && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  {topic.aiAnalysis.recommendation}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {topic.trafficVolume && (
              <Badge variant="outline" className="text-[10px] border-primary/20 text-primary/70">
                {topic.trafficVolume}
              </Badge>
            )}
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={() => navigate(`/discover/comments`)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Analyze this trend"
            >
              <Zap size={12} />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function TrendsTab() {
  const [geo, setGeo] = useState("US");
  const { data, isLoading, refetch, isFetching } = useQuery<{
    topics: any[];
    source?: string;
    fetchedAt: string;
  }>({
    queryKey: ["/api/trending-topics", { geo, niche: "", timeWindow: "now 1-d", sortBy: "recent" }],
    queryFn: async () => {
      const params = new URLSearchParams({ geo, niche: "", timeWindow: "now 1-d", sortBy: "recent" });
      const res = await fetch(`/api/trending-topics?${params}`);
      if (!res.ok) throw new Error("Failed to fetch trends");
      return res.json();
    },
    staleTime: 3 * 60 * 1000,
  });

  const GEOS = [
    { code: "US", label: "US" },
    { code: "GB", label: "UK" },
    { code: "AU", label: "AU" },
    { code: "CA", label: "CA" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight">Trends</h2>
          <p className="text-muted-foreground mt-1">
            What's trending right now — use these to fuel your content and comments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-1">
            {GEOS.map((g) => (
              <button
                key={g.code}
                onClick={() => setGeo(g.code)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  geo === g.code
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => window.open("https://trends.google.com/trends/trendingsearches/daily?geo=" + geo, "_blank")}
          >
            <ExternalLink size={12} />
            Google Trends
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-primary/40" />
        </div>
      ) : !data?.topics?.length ? (
        <Card className="glass-panel p-8 text-center">
          <TrendingUp size={32} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No trending topics available right now.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.topics.map((topic: any, i: number) => (
            <TrendCard key={i} topic={topic} index={i} />
          ))}
        </div>
      )}

      {data?.fetchedAt && (
        <p className="text-xs text-muted-foreground/50 text-right">
          Updated {new Date(data.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          {data.source && ` · ${data.source}`}
        </p>
      )}
    </div>
  );
}

// ─── Opportunities Tab ────────────────────────────────────────────────────────

function OpportunitiesTab() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-4">
        <Lightbulb size={32} className="text-primary/40" />
      </div>
      <h3 className="text-xl font-bold font-display mb-2">Opportunities</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        Discover creators and posts worth engaging with — filtered by niche, trend relevance, and viral potential. Coming soon.
      </p>
    </div>
  );
}

// ─── Discover Shell ───────────────────────────────────────────────────────────

type DiscoverTab = "trends" | "comments" | "opportunities";

const DISCOVER_TABS: { id: DiscoverTab; label: string; icon: React.FC<any> }[] = [
  { id: "trends", label: "Trends", icon: TrendingUp },
  { id: "comments", label: "Comment Engine", icon: Zap },
  { id: "opportunities", label: "Opportunities", icon: Lightbulb },
];

export default function Discover() {
  const [activeTab, setActiveTab] = useState<DiscoverTab>("trends");

  return (
    <div className="space-y-0 pb-12">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-8 border-b border-border/40 pb-0">
        {DISCOVER_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={15} />
              {tab.label}
              {tab.id === "opportunities" && (
                <span className="text-[9px] font-semibold text-muted-foreground/40 border border-border/30 rounded px-1 py-0.5 leading-none">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "trends" && <TrendsTab />}
          {activeTab === "comments" && <ViralEngine />}
          {activeTab === "opportunities" && <OpportunitiesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
