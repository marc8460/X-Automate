import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useNicheProfiles,
  useCreateNiche,
  useDeleteNiche,
  useAutoDetectNiches,
  useTrendingPosts,
  useDiscoverTrendingPosts,
  useClearTrendingPosts,
} from "@/lib/hooks";
import type { TrendingPostFilters } from "@/lib/hooks";
import type { NicheProfile, TrendingPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  X,
  Brain,
  Zap,
  TrendingUp,
  Flame,
  Clock,
  Heart,
  MessageSquare,
  Repeat2,
  Eye,
  Users,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  Radar,
  ExternalLink,
  Globe,
  BarChart3,
  Sparkles,
  Target,
} from "lucide-react";

const LANGUAGES = [
  { value: "", label: "All Languages" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "pt", label: "Portuguese" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "sv", label: "Swedish" },
  { value: "da", label: "Danish" },
  { value: "no", label: "Norwegian" },
  { value: "tr", label: "Turkish" },
  { value: "ru", label: "Russian" },
  { value: "zh", label: "Chinese" },
];

const TIME_RANGES = [
  { value: 1, label: "Last 1h" },
  { value: 3, label: "Last 3h" },
  { value: 6, label: "Last 6h" },
  { value: 12, label: "Last 12h" },
  { value: 24, label: "Last 24h" },
];

const SORT_OPTIONS = [
  { value: "score", label: "Trend Score" },
  { value: "velocity", label: "Engagement Velocity" },
  { value: "recent", label: "Most Recent" },
];

function formatAge(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

function velocityBadge(label: string) {
  const styles: Record<string, string> = {
    viral: "bg-red-500/20 text-red-400 border-red-500/30",
    trending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    rising: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  const icons: Record<string, typeof Flame> = {
    viral: Flame,
    trending: TrendingUp,
    rising: Zap,
  };
  const Icon = icons[label] || Zap;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[label] || styles.rising}`}>
      <Icon size={10} />
      {label}
    </span>
  );
}

export default function TrendScanner() {
  const { toast } = useToast();

  const [showAddNiche, setShowAddNiche] = useState(false);
  const [newNicheName, setNewNicheName] = useState("");
  const [newNicheKeywords, setNewNicheKeywords] = useState("");
  const [selectedNicheId, setSelectedNicheId] = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const [filterHours, setFilterHours] = useState<number | undefined>();
  const [filterMinLikes, setFilterMinLikes] = useState<number | undefined>();
  const [filterLang, setFilterLang] = useState("");
  const [filterSort, setFilterSort] = useState("score");
  const [discoverLang, setDiscoverLang] = useState("");

  const [expandedPost, setExpandedPost] = useState<number | null>(null);

  const filters: TrendingPostFilters = {
    nicheId: selectedNicheId,
    minLikes: filterMinLikes,
    lang: filterLang || undefined,
    hours: filterHours,
    sort: filterSort,
  };

  const { data: niches, isLoading: nichesLoading } = useNicheProfiles();
  const createNiche = useCreateNiche();
  const deleteNiche = useDeleteNiche();
  const autoDetect = useAutoDetectNiches();
  const { data: posts, isLoading: postsLoading } = useTrendingPosts(filters);
  const discover = useDiscoverTrendingPosts();
  const clearPosts = useClearTrendingPosts();

  const handleAddNiche = () => {
    if (!newNicheName.trim() || !newNicheKeywords.trim()) {
      toast({ title: "Fill in both fields", variant: "destructive" });
      return;
    }
    createNiche.mutate(
      { name: newNicheName.trim(), keywords: newNicheKeywords.trim(), source: "manual" },
      {
        onSuccess: () => {
          setNewNicheName("");
          setNewNicheKeywords("");
          setShowAddNiche(false);
          toast({ title: "Niche added" });
        },
      }
    );
  };

  const handleAutoDetect = () => {
    autoDetect.mutate(undefined, {
      onSuccess: (data) => {
        if (data.created?.length > 0) {
          toast({ title: `Detected ${data.created.length} niches from your feed` });
        } else if (data.detected?.length > 0) {
          toast({ title: "Niches already exist", description: "All detected niches are already saved" });
        } else {
          toast({ title: "No niches detected", description: "Try tweeting about specific topics first", variant: "destructive" });
        }
      },
      onError: (err: any) => {
        toast({ title: "Detection failed", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleDiscover = () => {
    discover.mutate(
      { nicheId: selectedNicheId, language: discoverLang || undefined, hoursBack: filterHours },
      {
        onSuccess: (data) => {
          toast({ title: `Found ${data.count} trending posts`, description: `Source: ${data.source}` });
        },
        onError: (err: any) => {
          toast({ title: "Discovery failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const openOnX = (tweetId: string) => {
    window.open(`https://x.com/i/status/${tweetId}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Trend Scanner</h1>
          <p className="text-muted-foreground mt-1">Discover trending posts, analyze engagement velocity, find viral opportunities</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => clearPosts.mutate()} disabled={clearPosts.isPending} data-testid="button-clear-posts">
            <Trash2 size={14} className="mr-1.5" /> Clear All
          </Button>
        </div>
      </div>

      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-primary" />
            <span className="font-medium text-sm">Niches</span>
            <span className="text-xs text-muted-foreground">({niches?.length || 0} saved)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleAutoDetect} disabled={autoDetect.isPending} data-testid="button-auto-detect">
              {autoDetect.isPending ? <RefreshCw size={14} className="mr-1.5 animate-spin" /> : <Brain size={14} className="mr-1.5" />}
              Auto-Detect from Feed
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddNiche(!showAddNiche)} data-testid="button-toggle-add-niche">
              <Plus size={14} className="mr-1" /> Add Niche
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showAddNiche && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-2 pt-2">
                <Input placeholder="Niche name (e.g. Tech)" value={newNicheName} onChange={(e) => setNewNicheName(e.target.value)}
                  className="bg-secondary/30 flex-1" data-testid="input-niche-name" />
                <Input placeholder="Keywords (comma-separated)" value={newNicheKeywords} onChange={(e) => setNewNicheKeywords(e.target.value)}
                  className="bg-secondary/30 flex-[2]" data-testid="input-niche-keywords" />
                <Button size="sm" onClick={handleAddNiche} disabled={createNiche.isPending} data-testid="button-save-niche">Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddNiche(false)} data-testid="button-cancel-niche"><X size={14} /></Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedNicheId(undefined)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !selectedNicheId ? "bg-primary/20 text-primary border-primary/30" : "bg-secondary/30 text-muted-foreground border-border/30 hover:bg-secondary/50"
            }`} data-testid="button-niche-all">
            All
          </button>
          {niches?.map((niche) => (
            <div key={niche.id} className="flex items-center gap-0">
              <button
                onClick={() => setSelectedNicheId(niche.id === selectedNicheId ? undefined : niche.id)}
                className={`px-3 py-1.5 rounded-l-full text-xs font-medium border transition-all ${
                  selectedNicheId === niche.id ? "bg-primary/20 text-primary border-primary/30" : "bg-secondary/30 text-muted-foreground border-border/30 hover:bg-secondary/50"
                }`} data-testid={`button-niche-${niche.id}`}>
                {niche.name}
                {niche.source === "auto" && <Sparkles size={10} className="inline ml-1 text-primary" />}
              </button>
              <button
                onClick={() => deleteNiche.mutate(niche.id)}
                className="px-1.5 py-1.5 rounded-r-full text-xs border border-l-0 bg-secondary/30 border-border/30 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                data-testid={`button-delete-niche-${niche.id}`}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-3">
        <button onClick={() => setShowFilters(!showFilters)} className="w-full flex items-center justify-between text-sm"
          data-testid="button-toggle-filters">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <span className="font-medium">Filters & Discovery</span>
          </div>
          {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-border/30 mt-3">
                <div>
                  <label className="text-xs font-medium mb-1 block flex items-center gap-1"><Clock size={10} /> Time Range</label>
                  <select value={filterHours || ""} onChange={(e) => setFilterHours(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full bg-secondary/30 border border-border/50 rounded-md px-2.5 py-1.5 text-sm" data-testid="select-filter-hours">
                    <option value="">All Time</option>
                    {TIME_RANGES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block flex items-center gap-1"><Heart size={10} /> Min Engagement</label>
                  <Input type="number" placeholder="0" value={filterMinLikes || ""} onChange={(e) => setFilterMinLikes(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="bg-secondary/30 h-[34px] text-sm" data-testid="input-filter-min-likes" />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block flex items-center gap-1"><Globe size={10} /> Language</label>
                  <select value={filterLang} onChange={(e) => { setFilterLang(e.target.value); setDiscoverLang(e.target.value); }}
                    className="w-full bg-secondary/30 border border-border/50 rounded-md px-2.5 py-1.5 text-sm" data-testid="select-filter-lang">
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block flex items-center gap-1"><BarChart3 size={10} /> Sort By</label>
                  <select value={filterSort} onChange={(e) => setFilterSort(e.target.value)}
                    className="w-full bg-secondary/30 border border-border/50 rounded-md px-2.5 py-1.5 text-sm" data-testid="select-filter-sort">
                    {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button onClick={handleDiscover} disabled={discover.isPending} className="w-full h-[34px]" data-testid="button-discover">
                    {discover.isPending ? <RefreshCw size={14} className="mr-1.5 animate-spin" /> : <Radar size={14} className="mr-1.5" />}
                    {discover.isPending ? "Scanning..." : "Discover Posts"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <span className="font-medium text-sm">Trending Posts</span>
            <span className="text-xs text-muted-foreground">({posts?.length || 0} found)</span>
          </div>
          {!showFilters && (
            <Button variant="outline" size="sm" onClick={handleDiscover} disabled={discover.isPending} data-testid="button-discover-compact">
              {discover.isPending ? <RefreshCw size={14} className="mr-1.5 animate-spin" /> : <Radar size={14} className="mr-1.5" />}
              Discover
            </Button>
          )}
        </div>

        {postsLoading ? (
          <div className="glass-panel p-12 flex flex-col items-center justify-center gap-2">
            <RefreshCw size={24} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading trending posts...</p>
          </div>
        ) : !posts?.length ? (
          <div className="glass-panel p-12 flex flex-col items-center justify-center gap-3">
            <Radar size={32} className="text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No trending posts yet</p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Add a niche and click "Discover Posts" to scan X for trending content in your niches
            </p>
            <Button onClick={() => { setShowFilters(true); }} variant="outline" size="sm" data-testid="button-start-discovery">
              <Search size={14} className="mr-1.5" /> Start Discovery
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel overflow-hidden"
                data-testid={`card-post-${post.id}`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-medium text-sm text-primary">{post.authorHandle}</span>
                        {post.authorFollowers && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Users size={10} /> {post.authorFollowers >= 1000 ? `${(post.authorFollowers / 1000).toFixed(1)}K` : post.authorFollowers}
                          </span>
                        )}
                        {velocityBadge(post.velocityLabel)}
                        {post.language && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground uppercase font-mono">{post.language}</span>
                        )}
                        {post.nicheMatchScore && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            {post.nicheMatchScore}% match
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed line-clamp-2">{post.text}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className={`text-lg font-bold ${
                        post.trendScore >= 70 ? "text-red-400" : post.trendScore >= 30 ? "text-yellow-400" : "text-blue-400"
                      }`} data-testid={`text-score-${post.id}`}>
                        {post.trendScore}
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart size={11} /> {post.likes.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={11} /> {post.replies.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Repeat2 size={11} /> {post.retweets.toLocaleString()}</span>
                    {post.views && <span className="flex items-center gap-1"><Eye size={11} /> {post.views.toLocaleString()}</span>}
                    <span className="flex items-center gap-1"><Clock size={11} /> {formatAge(post.postAge)}</span>
                    <span className="ml-auto text-[10px]">{new Date(post.discoveredAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedPost === post.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-border/20 space-y-3">
                        <p className="text-sm">{post.text}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div className="bg-secondary/30 rounded p-2 text-center">
                            <div className="font-semibold text-sm">{post.likes.toLocaleString()}</div>
                            <div className="text-muted-foreground">Likes</div>
                          </div>
                          <div className="bg-secondary/30 rounded p-2 text-center">
                            <div className="font-semibold text-sm">{post.replies.toLocaleString()}</div>
                            <div className="text-muted-foreground">Replies</div>
                          </div>
                          <div className="bg-secondary/30 rounded p-2 text-center">
                            <div className="font-semibold text-sm">{post.retweets.toLocaleString()}</div>
                            <div className="text-muted-foreground">Reposts</div>
                          </div>
                          <div className="bg-secondary/30 rounded p-2 text-center">
                            <div className="font-semibold text-sm">{(post.views || 0).toLocaleString()}</div>
                            <div className="text-muted-foreground">Views</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!post.tweetId.startsWith("sim_") && (
                            <Button size="sm" variant="outline" onClick={() => openOnX(post.tweetId)} data-testid={`button-open-x-${post.id}`}>
                              <ExternalLink size={12} className="mr-1.5" /> Open on X
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
