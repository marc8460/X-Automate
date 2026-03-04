import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrendingTopics, useAnalyzePost, useScanScreenshot } from "@/lib/hooks";
import type { TrendTopic } from "@/lib/hooks";
import { GoogleTrendsPanel } from "@/components/GoogleTrendsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  ExternalLink,
  Search,
  Flame,
  BarChart3,
  Brain,
  Target,
  MessageCircle,
  Zap,
  Rocket,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Globe,
  Image as ImageIcon,
  Users,
  Heart,
  MessageSquare,
  Repeat2,
  Clock,
  XCircle,
  Camera,
  Upload,
  Clipboard,
  Eye,
  MapPin,
  Timer,
  Tag,
  ArrowUpDown,
  Activity,
} from "lucide-react";

type AnalysisResult = {
  trendMomentumScore: number;
  trendMomentumExplanation: string;
  postViralPotential: number;
  postViralExplanation: string;
  toneAnalysis: {
    emotionalTone: string;
    controversyLevel: string;
    authorityLevel: string;
    audienceType: string;
    memeVisualFactor: string | null;
  };
  bestStrategy: { type: string; explanation: string };
  comments: string[];
  safestOption: { index: number; explanation: string };
  highVisibilityOption: { index: number; explanation: string };
  skipRecommended: boolean;
  skipReason: string | null;
};

type ExtractedData = {
  postText: string;
  authorUsername?: string;
  authorDisplayName?: string;
  authorFollowers?: string;
  likes?: number;
  replies?: number;
  retweets?: number;
  views?: number;
  timeElapsed?: string;
  hasImage?: boolean;
  imageDescription?: string | null;
  hashtags?: string[];
};

type Step = "trends" | "analyze" | "results";
type AnalyzeMode = "screenshot" | "manual";

const COUNTRIES = [
  { code: "US", name: "United States" }, { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" }, { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" }, { code: "FR", name: "France" },
  { code: "BR", name: "Brazil" }, { code: "IN", name: "India" },
  { code: "JP", name: "Japan" }, { code: "KR", name: "South Korea" },
  { code: "MX", name: "Mexico" }, { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" }, { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" }, { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" }, { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" }, { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" }, { code: "CO", name: "Colombia" },
  { code: "NG", name: "Nigeria" }, { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" }, { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "UAE" }, { code: "TR", name: "Turkey" },
  { code: "RU", name: "Russia" }, { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" }, { code: "TH", name: "Thailand" },
  { code: "SG", name: "Singapore" }, { code: "TW", name: "Taiwan" },
  { code: "NZ", name: "New Zealand" }, { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" }, { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" }, { code: "BE", name: "Belgium" },
  { code: "CZ", name: "Czech Republic" }, { code: "GR", name: "Greece" },
  { code: "IL", name: "Israel" }, { code: "PK", name: "Pakistan" },
];

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "entertainment", label: "Entertainment" },
  { value: "business", label: "Business" },
  { value: "technology", label: "Technology" },
  { value: "sports", label: "Sports" },
  { value: "health", label: "Health" },
  { value: "science", label: "Science" },
  { value: "politics", label: "Politics" },
];

const TIME_WINDOWS = [
  { value: "1h", label: "Last 1 hour" },
  { value: "4h", label: "Last 4 hours" },
  { value: "12h", label: "Last 12 hours" },
  { value: "24h", label: "Last 24 hours" },
  { value: "48h", label: "Last 2 days" },
  { value: "7d", label: "Last 7 days" },
];

const SORT_OPTIONS = [
  { value: "volume", label: "Search volume" },
  { value: "recent", label: "Most recent" },
  { value: "growth", label: "Growth rate" },
];

export default function ViralEngine() {
  const [step, setStep] = useState<Step>("trends");
  const [selectedTrend, setSelectedTrend] = useState<TrendTopic | null>(null);
  const [expandedTrend, setExpandedTrend] = useState<number | null>(null);

  const [geo, setGeo] = useState("US");
  const [category, setCategory] = useState("all");
  const [timeWindow, setTimeWindow] = useState("24h");
  const [sortBy, setSortBy] = useState("volume");

  const [analyzeMode, setAnalyzeMode] = useState<AnalyzeMode>("screenshot");
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const [postText, setPostText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [authorFollowers, setAuthorFollowers] = useState("");
  const [likes, setLikes] = useState("");
  const [replies, setReplies] = useState("");
  const [retweets, setRetweets] = useState("");
  const [timeElapsed, setTimeElapsed] = useState("");
  const [niche, setNiche] = useState("");
  const [commentStyle, setCommentStyle] = useState("Balanced");

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [googleTrendsOpen, setGoogleTrendsOpen] = useState(false);
  const [manualSearchTerm, setManualSearchTerm] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: trendsData, isLoading: trendsLoading, refetch: refetchTrends } = useTrendingTopics({ geo, category, timeWindow, sortBy });
  const analyzePost = useAnalyzePost();
  const scanScreenshot = useScanScreenshot();

  const handleSelectTrend = (topic: TrendTopic) => {
    setSelectedTrend(topic);
    setStep("analyze");
  };

  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please use an image file (PNG, JPG, etc.)", variant: "destructive" });
      return;
    }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setExtractedData(null);
  }, [toast]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (step !== "analyze" || analyzeMode !== "screenshot") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processImageFile(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [step, analyzeMode, processImageFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImageFile(file);
  }, [processImageFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleScreenshotScan = () => {
    if (!screenshotFile) return;
    const formData = new FormData();
    formData.append("screenshot", screenshotFile);
    if (selectedTrend) {
      formData.append("trendTopic", selectedTrend.title);
      formData.append("trendGrowth", selectedTrend.traffic);
      formData.append("trendContext", selectedTrend.relatedQueries?.join(", ") || "");
    }
    formData.append("commentStyle", commentStyle);
    if (niche) formData.append("niche", niche);

    scanScreenshot.mutate(formData, {
      onSuccess: (data) => {
        setExtractedData(data.extracted);
        setAnalysis(data.analysis);
        setStep("results");
      },
      onError: (err: any) => {
        toast({ title: "Scan failed", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleManualAnalyze = () => {
    if (!postText.trim()) {
      toast({ title: "Post text required", description: "Paste the text of the X post", variant: "destructive" });
      return;
    }
    analyzePost.mutate(
      {
        trendTopic: selectedTrend?.title,
        trendGrowth: selectedTrend?.traffic,
        trendContext: selectedTrend?.relatedQueries?.join(", "),
        postText: postText.trim(),
        imageUrl: imageUrl.trim() || undefined,
        authorFollowers: authorFollowers.trim() || undefined,
        likes: likes ? parseInt(likes) : undefined,
        replies: replies ? parseInt(replies) : undefined,
        retweets: retweets ? parseInt(retweets) : undefined,
        timeElapsed: timeElapsed.trim() || undefined,
        niche: niche.trim() || undefined,
        commentStyle,
      },
      {
        onSuccess: (data) => { setAnalysis(data.analysis); setStep("results"); },
        onError: (err: any) => { toast({ title: "Analysis failed", description: err.message, variant: "destructive" }); },
      }
    );
  };

  const copyComment = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({ title: "Copied to clipboard", description: "Paste this comment on the X post" });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const openXSearch = (query: string) => {
    const encoded = encodeURIComponent(query);
    window.open(`https://x.com/search?q=${encoded}&src=typed_query&f=top`, "_blank");
  };

  const searchOnX = (query: string) => {
    window.open(
      `https://twitter.com/search?q=${encodeURIComponent(query)}&f=live`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const scoreColor = (score: number) => score >= 8 ? "text-green-400" : score >= 5 ? "text-yellow-400" : "text-red-400";
  const scoreBg = (score: number) => score >= 8 ? "bg-green-500/20 border-green-500/30" : score >= 5 ? "bg-yellow-500/20 border-yellow-500/30" : "bg-red-500/20 border-red-500/30";
  const isScanning = scanScreenshot.isPending || analyzePost.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Viral Comment Engine</h1>
          <p className="text-muted-foreground mt-1">Find trending topics, scan posts, generate viral comments</p>
        </div>
        <div className="flex items-center gap-2">
          {["trends", "analyze", "results"].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                step === s ? "bg-primary/20 border-primary text-primary"
                  : i < ["trends", "analyze", "results"].indexOf(step) ? "bg-primary/10 border-primary/50 text-primary/70"
                  : "bg-secondary/30 border-border/50 text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className="w-6 h-px bg-border/50" />}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "trends" && (
          <motion.div key="trends" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">

            <div className="glass-panel p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-muted-foreground" />
                  <select value={geo} onChange={(e) => setGeo(e.target.value)}
                    className="bg-secondary/50 border border-border/50 rounded-md px-3 py-1.5 text-sm min-w-[160px]"
                    data-testid="select-geo">
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <Timer size={14} className="text-muted-foreground" />
                  <select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)}
                    className="bg-secondary/50 border border-border/50 rounded-md px-3 py-1.5 text-sm"
                    data-testid="select-time-window">
                    {TIME_WINDOWS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <Tag size={14} className="text-muted-foreground" />
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="bg-secondary/50 border border-border/50 rounded-md px-3 py-1.5 text-sm"
                    data-testid="select-category">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <ArrowUpDown size={14} className="text-muted-foreground" />
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                    className="bg-secondary/50 border border-border/50 rounded-md px-3 py-1.5 text-sm"
                    data-testid="select-sort">
                    {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <Button variant="outline" size="sm" onClick={() => refetchTrends()} disabled={trendsLoading} data-testid="button-refresh-trends">
                  <RefreshCw size={14} className={trendsLoading ? "animate-spin" : ""} />
                </Button>

                <Button variant="outline" size="sm" onClick={() => setGoogleTrendsOpen(true)} className="gap-1.5" data-testid="button-open-google-trends">
                  <TrendingUp size={14} />
                  Google Trends
                </Button>

                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  {trendsData?.source === "google_trends" ? (
                    <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">Live</span>
                  ) : trendsData?.source === "no_data" ? (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">Unavailable</span>
                  ) : null}
                  {trendsData?.fetchedAt && (
                    <span>Updated {new Date(trendsData.fetchedAt).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Manual trend search */}
            <div className="glass-panel p-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                  Search trend manually
                </label>
                <Input
                  value={manualSearchTerm}
                  onChange={(e) => setManualSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && manualSearchTerm.trim()) searchOnX(manualSearchTerm.trim()); }}
                  placeholder="Enter a trending topic..."
                  className="flex-1"
                  data-testid="input-manual-trend"
                />
                <Button
                  size="sm"
                  onClick={() => { if (manualSearchTerm.trim()) searchOnX(manualSearchTerm.trim()); }}
                  disabled={!manualSearchTerm.trim()}
                  className="gap-1.5 whitespace-nowrap"
                  data-testid="button-search-on-x"
                >
                  <ExternalLink size={13} />
                  Search on X
                </Button>
              </div>
            </div>

            {trendsLoading ? (
              <div className="glass-panel p-16 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={28} className="animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Fetching trending topics...</p>
                <p className="text-xs text-muted-foreground">This may take a few seconds</p>
              </div>
            ) : !trendsData?.topics?.length ? (
              <div className="glass-panel p-16 flex flex-col items-center justify-center gap-3">
                <Globe size={28} className="text-muted-foreground" />
                {trendsData?.source === "no_data" ? (
                  <>
                    <p className="text-muted-foreground font-medium">No live trends available</p>
                    <p className="text-xs text-muted-foreground">Google Trends could not be reached. Try refreshing or use the manual search above.</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No trends found. Try different filters.</p>
                )}
              </div>
            ) : (
              <div className="glass-panel overflow-hidden">
                <div className="grid grid-cols-[1fr_120px_120px_140px_1fr] gap-0 px-4 py-3 border-b border-border/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Trend</span>
                  <span>Search Volume</span>
                  <span>Growth</span>
                  <span>Started</span>
                  <span>Related Queries</span>
                </div>

                {trendsData.topics.map((topic, index) => (
                  <div key={topic.id} data-testid={`row-trend-${topic.id}`}>
                    <div
                      className={`grid grid-cols-[1fr_120px_120px_140px_1fr] gap-0 px-4 py-3 items-center cursor-pointer transition-colors hover:bg-secondary/30 ${
                        expandedTrend === topic.id ? "bg-secondary/20" : ""
                      } ${index < trendsData.topics.length - 1 ? "border-b border-border/20" : ""}`}
                      onClick={() => { setExpandedTrend(expandedTrend === topic.id ? null : topic.id); setManualSearchTerm(topic.title); }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{index + 1}</span>
                        <span className="font-medium truncate">{topic.title}</span>
                      </div>

                      <div>
                        <span className="font-semibold text-sm">{topic.traffic}</span>
                      </div>

                      <div>
                        <span className="text-green-400 text-sm font-medium">{topic.growthPercent}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">{topic.startedAgo}</span>
                        <div className="flex items-center gap-0.5">
                          <Activity size={10} className="text-green-400" />
                          <span className="text-[10px] text-green-400 font-medium">{topic.status}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                        {topic.relatedQueries.slice(0, 3).map((q, i) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 bg-secondary/50 rounded text-muted-foreground truncate max-w-[120px]">{q}</span>
                        ))}
                        {topic.relatedQueries.length > 3 && (
                          <span className="text-xs text-primary">+{topic.relatedQueries.length - 3} more</span>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedTrend === topic.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-b border-border/20"
                        >
                          <div className="px-4 py-3 bg-secondary/10 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {topic.relatedQueries.map((q, i) => (
                                <button key={i} onClick={() => openXSearch(q)}
                                  className="text-xs px-2.5 py-1 rounded-full bg-secondary/50 hover:bg-primary/20 hover:text-primary transition-colors border border-border/30"
                                  data-testid={`button-related-${topic.id}-${i}`}>
                                  {q}
                                </button>
                              ))}
                            </div>

                            {topic.articles.length > 0 && (
                              <div className="space-y-1">
                                {topic.articles.map((a, i) => (
                                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:underline block" data-testid={`link-article-${topic.id}-${i}`}>
                                    {a.title} — {a.source}
                                  </a>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <Button size="sm" variant="outline" onClick={() => openXSearch(topic.searchQuery)}
                                data-testid={`button-search-x-${topic.id}`}>
                                <Search size={12} className="mr-1.5" />
                                Search on X
                                <ExternalLink size={10} className="ml-1.5" />
                              </Button>
                              <Button size="sm" onClick={() => handleSelectTrend(topic)}
                                data-testid={`button-use-trend-${topic.id}`}>
                                <Zap size={12} className="mr-1.5" />
                                Use This Trend
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{trendsData.topics.length} trending topics</span>
                  <span>
                    {COUNTRIES.find(c => c.code === geo)?.name} &middot; {TIME_WINDOWS.find(t => t.value === timeWindow)?.label} &middot; {CATEGORIES.find(c => c.value === category)?.label}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setStep("analyze")} data-testid="button-skip-to-analyze">
                Skip to Post Analysis
              </Button>
            </div>
          </motion.div>
        )}

        {step === "analyze" && (
          <motion.div key="analyze" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            {selectedTrend && (
              <div className="glass-panel p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flame size={18} className="text-primary" />
                  <div>
                    <span className="font-medium">{selectedTrend.title}</span>
                    <span className="text-xs text-primary ml-2">{selectedTrend.traffic}</span>
                    <span className="text-xs text-green-400 ml-2">{selectedTrend.growthPercent}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openXSearch(selectedTrend.searchQuery)} data-testid="button-open-x-search">
                    <Search size={14} className="mr-1" /> Search on X <ExternalLink size={12} className="ml-1" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedTrend(null); setStep("trends"); }} data-testid="button-change-trend">
                    Change
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg w-fit">
              <button onClick={() => setAnalyzeMode("screenshot")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  analyzeMode === "screenshot" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                }`} data-testid="button-mode-screenshot">
                <Camera size={14} /> Screenshot Scan
              </button>
              <button onClick={() => setAnalyzeMode("manual")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  analyzeMode === "manual" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                }`} data-testid="button-mode-manual">
                <MessageSquare size={14} /> Manual Entry
              </button>
            </div>

            {analyzeMode === "screenshot" && (
              <div className="space-y-4">
                <div className="glass-panel p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera size={20} className="text-primary" />
                    <h2 className="font-display font-semibold text-lg">Screenshot Scan</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">AI-Powered</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Take a screenshot of any X post and drop it here. AI reads the post text, metrics, images — everything — and generates viral comments.
                  </p>

                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" data-testid="input-screenshot-file" />

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => !screenshotPreview && fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer min-h-[200px] flex flex-col items-center justify-center ${
                      isDragging ? "border-primary bg-primary/10 scale-[1.02]"
                        : screenshotPreview ? "border-border/50 bg-secondary/20"
                        : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                    }`} data-testid="dropzone-screenshot">
                    {screenshotPreview ? (
                      <div className="w-full p-4">
                        <div className="relative max-h-[400px] overflow-hidden rounded-lg">
                          <img src={screenshotPreview} alt="Screenshot preview" className="w-full object-contain max-h-[400px] rounded-lg" />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setScreenshotPreview(null); setScreenshotFile(null); setExtractedData(null); }} data-testid="button-remove-screenshot">
                              <XCircle size={14} className="mr-1" /> Remove
                            </Button>
                            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} data-testid="button-replace-screenshot">
                              <Upload size={14} className="mr-1" /> Replace
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <Camera size={28} className="text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium mb-1">Drop screenshot here or click to upload</p>
                          <p className="text-sm text-muted-foreground">
                            Press <kbd className="px-1.5 py-0.5 bg-secondary/50 border border-border/50 rounded text-xs font-mono">Ctrl+V</kbd> to paste from clipboard
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} data-testid="button-browse-files">
                            <Upload size={14} className="mr-1" /> Browse Files
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.read().then(items => {
                              for (const item of items) {
                                const imageType = item.types.find(t => t.startsWith("image/"));
                                if (imageType) { item.getType(imageType).then(blob => { processImageFile(new File([blob], "clipboard.png", { type: imageType })); }); }
                              }
                            }).catch(() => { toast({ title: "Paste failed", description: "No image in clipboard.", variant: "destructive" }); });
                          }} data-testid="button-paste-clipboard">
                            <Clipboard size={14} className="mr-1" /> Paste from Clipboard
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Niche (optional)</label>
                    <Input placeholder="e.g. Tech, Fashion, Crypto" value={niche} onChange={(e) => setNiche(e.target.value)} className="bg-secondary/30" data-testid="input-niche-screenshot" />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Comment Style</label>
                    <select value={commentStyle} onChange={(e) => setCommentStyle(e.target.value)}
                      className="w-full bg-secondary/30 border border-border/50 rounded-md px-3 py-2 text-sm" data-testid="select-comment-style-screenshot">
                      <option value="Safe">Safe</option>
                      <option value="Balanced">Balanced</option>
                      <option value="Bold">Bold</option>
                      <option value="Contrarian">Contrarian</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {analyzeMode === "manual" && (
              <div className="glass-panel p-6 space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={20} className="text-primary" />
                  <h2 className="font-display font-semibold text-lg">Manual Entry</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">Paste the post details manually.</p>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Post Text *</label>
                  <Textarea placeholder="Paste the full text of the X post here..." value={postText} onChange={(e) => setPostText(e.target.value)} className="min-h-[100px] bg-secondary/30" data-testid="input-post-text" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5"><ImageIcon size={14} /> Image URL (optional)</label>
                  <Input placeholder="https://pbs.twimg.com/..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-secondary/30" data-testid="input-image-url" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label className="text-xs font-medium mb-1 block flex items-center gap-1"><Users size={12} /> Followers</label><Input placeholder="e.g. 50K" value={authorFollowers} onChange={(e) => setAuthorFollowers(e.target.value)} className="bg-secondary/30" data-testid="input-followers" /></div>
                  <div><label className="text-xs font-medium mb-1 block flex items-center gap-1"><Heart size={12} /> Likes</label><Input type="number" placeholder="0" value={likes} onChange={(e) => setLikes(e.target.value)} className="bg-secondary/30" data-testid="input-likes" /></div>
                  <div><label className="text-xs font-medium mb-1 block flex items-center gap-1"><MessageSquare size={12} /> Replies</label><Input type="number" placeholder="0" value={replies} onChange={(e) => setReplies(e.target.value)} className="bg-secondary/30" data-testid="input-replies" /></div>
                  <div><label className="text-xs font-medium mb-1 block flex items-center gap-1"><Repeat2 size={12} /> Reposts</label><Input type="number" placeholder="0" value={retweets} onChange={(e) => setRetweets(e.target.value)} className="bg-secondary/30" data-testid="input-retweets" /></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><label className="text-xs font-medium mb-1 block flex items-center gap-1"><Clock size={12} /> Time Since Posted</label><Input placeholder="e.g. 2h, 30m" value={timeElapsed} onChange={(e) => setTimeElapsed(e.target.value)} className="bg-secondary/30" data-testid="input-time-elapsed" /></div>
                  <div><label className="text-xs font-medium mb-1 block">Niche</label><Input placeholder="e.g. Tech, Fashion" value={niche} onChange={(e) => setNiche(e.target.value)} className="bg-secondary/30" data-testid="input-niche" /></div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Comment Style</label>
                    <select value={commentStyle} onChange={(e) => setCommentStyle(e.target.value)} className="w-full bg-secondary/30 border border-border/50 rounded-md px-3 py-2 text-sm" data-testid="select-comment-style">
                      <option value="Safe">Safe</option><option value="Balanced">Balanced</option><option value="Bold">Bold</option><option value="Contrarian">Contrarian</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("trends")} data-testid="button-back-to-trends">Back to Trends</Button>
              {analyzeMode === "screenshot" ? (
                <Button onClick={handleScreenshotScan} disabled={isScanning || !screenshotFile} className="min-w-[200px]" data-testid="button-scan-screenshot">
                  {scanScreenshot.isPending ? (<><RefreshCw size={14} className="mr-2 animate-spin" /> AI is reading the post...</>) : (<><Eye size={14} className="mr-2" /> Scan & Generate Comments</>)}
                </Button>
              ) : (
                <Button onClick={handleManualAnalyze} disabled={isScanning || !postText.trim()} className="min-w-[200px]" data-testid="button-generate-comments">
                  {analyzePost.isPending ? (<><RefreshCw size={14} className="mr-2 animate-spin" /> Analyzing...</>) : (<><Zap size={14} className="mr-2" /> Generate Viral Comments</>)}
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {step === "results" && analysis && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            {extractedData && (
              <div className="glass-panel p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={16} className="text-primary" />
                  <span className="text-sm font-medium">AI Extracted from Screenshot</span>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
                  {extractedData.authorDisplayName && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={12} className="text-muted-foreground" />
                      <span className="font-medium">{extractedData.authorDisplayName}</span>
                      {extractedData.authorUsername && <span className="text-muted-foreground">{extractedData.authorUsername}</span>}
                      {extractedData.authorFollowers && <span className="text-xs text-primary">{extractedData.authorFollowers} followers</span>}
                    </div>
                  )}
                  <p className="text-sm">{extractedData.postText}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {(extractedData.likes ?? 0) > 0 && <span className="flex items-center gap-1"><Heart size={10} /> {extractedData.likes!.toLocaleString()}</span>}
                    {(extractedData.replies ?? 0) > 0 && <span className="flex items-center gap-1"><MessageSquare size={10} /> {extractedData.replies!.toLocaleString()}</span>}
                    {(extractedData.retweets ?? 0) > 0 && <span className="flex items-center gap-1"><Repeat2 size={10} /> {extractedData.retweets!.toLocaleString()}</span>}
                    {(extractedData.views ?? 0) > 0 && <span className="flex items-center gap-1"><BarChart3 size={10} /> {extractedData.views!.toLocaleString()} views</span>}
                    {extractedData.timeElapsed && <span className="flex items-center gap-1"><Clock size={10} /> {extractedData.timeElapsed}</span>}
                  </div>
                  {extractedData.imageDescription && (
                    <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border/30">
                      <ImageIcon size={10} className="inline mr-1" /> Image: {extractedData.imageDescription}
                    </div>
                  )}
                </div>
              </div>
            )}

            {analysis.skipRecommended && (
              <div className="glass-panel p-4 border-red-500/30 bg-red-500/10">
                <div className="flex items-center gap-2 text-red-400 font-medium"><XCircle size={18} /> Skip Recommended</div>
                <p className="text-sm text-red-300/80 mt-1">{analysis.skipReason}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`glass-panel p-4 border ${scoreBg(analysis.trendMomentumScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><Flame size={18} className="text-orange-400" /><span className="font-medium text-sm">Trend Momentum</span></div>
                  <span className={`text-2xl font-bold ${scoreColor(analysis.trendMomentumScore)}`} data-testid="text-trend-score">{analysis.trendMomentumScore}/10</span>
                </div>
                <p className="text-xs text-muted-foreground">{analysis.trendMomentumExplanation}</p>
              </div>
              <div className={`glass-panel p-4 border ${scoreBg(analysis.postViralPotential)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><BarChart3 size={18} className="text-blue-400" /><span className="font-medium text-sm">Viral Potential</span></div>
                  <span className={`text-2xl font-bold ${scoreColor(analysis.postViralPotential)}`} data-testid="text-viral-score">{analysis.postViralPotential}/10</span>
                </div>
                <p className="text-xs text-muted-foreground">{analysis.postViralExplanation}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel p-4">
                <div className="flex items-center gap-2 mb-3"><Brain size={18} className="text-purple-400" /><span className="font-medium text-sm">Post Tone Analysis</span></div>
                <div className="space-y-2">
                  {[
                    { label: "Emotional Tone", value: analysis.toneAnalysis?.emotionalTone },
                    { label: "Controversy", value: analysis.toneAnalysis?.controversyLevel },
                    { label: "Authority", value: analysis.toneAnalysis?.authorityLevel },
                    { label: "Audience", value: analysis.toneAnalysis?.audienceType },
                    { label: "Meme/Visual", value: analysis.toneAnalysis?.memeVisualFactor },
                  ].filter(item => item.value).map((item) => (
                    <div key={item.label} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-panel p-4">
                <div className="flex items-center gap-2 mb-3"><Target size={18} className="text-green-400" /><span className="font-medium text-sm">Best Strategy</span></div>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <span className="text-primary font-semibold text-sm">{analysis.bestStrategy?.type}</span>
                  <p className="text-xs text-muted-foreground mt-1">{analysis.bestStrategy?.explanation}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-5">
              <div className="flex items-center gap-2 mb-4"><MessageCircle size={18} className="text-primary" /><span className="font-display font-semibold">Generated Comments</span></div>
              <div className="space-y-3">
                {analysis.comments?.map((comment, i) => {
                  const isSafest = analysis.safestOption?.index === i;
                  const isHighVis = analysis.highVisibilityOption?.index === i;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className={`p-4 rounded-lg border transition-all ${isHighVis ? "bg-primary/10 border-primary/30" : isSafest ? "bg-green-500/10 border-green-500/30" : "bg-secondary/30 border-border/50"}`}
                      data-testid={`card-comment-${i}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isHighVis && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1"><Rocket size={10} /> High Visibility</span>}
                            {isSafest && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium flex items-center gap-1"><Zap size={10} /> Safest Pick</span>}
                          </div>
                          <p className="text-sm leading-relaxed">{comment}</p>
                          {isHighVis && analysis.highVisibilityOption?.explanation && <p className="text-xs text-primary/70 mt-2">{analysis.highVisibilityOption.explanation}</p>}
                          {isSafest && analysis.safestOption?.explanation && <p className="text-xs text-green-400/70 mt-2">{analysis.safestOption.explanation}</p>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => copyComment(comment, i)} className="shrink-0" data-testid={`button-copy-comment-${i}`}>
                          {copiedIndex === i ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setStep("analyze"); setAnalysis(null); setExtractedData(null); setScreenshotPreview(null); setScreenshotFile(null); setPostText(""); }} data-testid="button-analyze-another">
                Analyze Another Post
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep("trends"); setAnalysis(null); setExtractedData(null); setScreenshotPreview(null); setScreenshotFile(null); setPostText(""); setImageUrl(""); }} data-testid="button-new-trend">
                  New Trend
                </Button>
                {selectedTrend && (
                  <Button onClick={() => openXSearch(selectedTrend.searchQuery)} data-testid="button-back-to-x">
                    <ExternalLink size={14} className="mr-2" /> Back to X Search
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GoogleTrendsPanel open={googleTrendsOpen} onClose={() => setGoogleTrendsOpen(false)} />
    </div>
  );
}
