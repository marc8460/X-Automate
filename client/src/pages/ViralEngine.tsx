import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalyzePost, useScanScreenshot, useTwitterHomeTimeline, useAnalyzeFeedPost } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  ExternalLink,
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
  Wand2,
  LayoutGrid,
  Quote,
  Play,
  ArrowUpDown,
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

type Step = "analyze" | "results";
type AnalyzeMode = "screenshot" | "manual" | "feed";

const TRENDS_URL = "https://trends.google.com/trends/trendingsearches/daily?geo=US";

const GOOGLE_TRENDS_STEPS = [
  {
    icon: TrendingUp,
    label: "Browse trends",
    desc: "Open Google Trends in a new tab and explore what's hot right now.",
  },
  {
    icon: Copy,
    label: "Copy a topic",
    desc: "Find an interesting trend and copy the keyword or phrase.",
  },
  {
    icon: MessageSquare,
    label: "Paste into Viral Engine",
    desc: "Come back here and paste the topic into the Niche field to find matching posts.",
  },
];

// Auto-expand a textarea to fit its content
function autoExpand(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

const promptTextareaClass =
  "w-full bg-secondary/30 border border-border/50 rounded-md px-3 py-2 text-sm " +
  "placeholder:text-muted-foreground/40 resize-none overflow-hidden leading-snug " +
  "focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 " +
  "focus:shadow-[0_0_14px_hsl(288deg_100%_65%/0.12)] transition-all duration-150";

export default function ViralEngine() {
  const [step, setStep] = useState<Step>("analyze");
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
  const [customPrompt, setCustomPrompt] = useState("");

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [googleTrendsOpen, setGoogleTrendsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const analyzePost = useAnalyzePost();
  const analyzeFeedPost = useAnalyzeFeedPost();
  const scanScreenshot = useScanScreenshot();
  const { data: timelineData, isLoading: isLoadingTimeline, refetch: refetchTimeline } = useTwitterHomeTimeline();
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [feedSort, setFeedSort] = useState<"best" | "latest">("best");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (timelineData?.posts?.length) {
      setFeedPosts(timelineData.posts);
    }
  }, [timelineData]);

  const sortedFeedPosts = [...feedPosts].sort((a, b) => {
    if (feedSort === "best") return (b.score ?? 0) - (a.score ?? 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleRefreshFeed = async () => {
    if (!feedPosts.length) {
      refetchTimeline();
      return;
    }
    setIsRefreshing(true);
    try {
      const newestId = feedPosts.reduce((max, p) =>
        BigInt(p.id) > BigInt(max) ? p.id : max, feedPosts[0].id);
      const res = await fetch(`/api/twitter/home-timeline?since_id=${newestId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to refresh");
      const data = await res.json();
      if (data.posts?.length) {
        setFeedPosts((prev) => {
          const existingIds = new Set(prev.map((p: any) => p.id));
          const newPosts = data.posts.filter((p: any) => !existingIds.has(p.id));
          return [...newPosts, ...prev];
        });
        toast({ title: `${data.posts.length} new post${data.posts.length > 1 ? "s" : ""} loaded` });
      } else {
        toast({ title: "No new posts found" });
      }
    } catch (err: any) {
      toast({ title: "Refresh failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const compressImage = (file: File): Promise<File> =>
    new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX = 1280;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob ? new File([blob], "screenshot.jpg", { type: "image/jpeg" }) : file),
          "image/jpeg", 0.88
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });

  const processImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please use an image file (PNG, JPG, etc.)", variant: "destructive" });
      return;
    }
    const compressed = await compressImage(file);
    setScreenshotFile(compressed);
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(compressed);
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
    if (niche) formData.append("niche", niche);
    if (customPrompt) formData.append("customPrompt", customPrompt);

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
        postText: postText.trim(),
        imageUrl: imageUrl.trim() || undefined,
        authorFollowers: authorFollowers.trim() || undefined,
        likes: likes ? parseInt(likes) : undefined,
        replies: replies ? parseInt(replies) : undefined,
        retweets: retweets ? parseInt(retweets) : undefined,
        timeElapsed: timeElapsed.trim() || undefined,
        niche: niche.trim() || undefined,
        customPrompt: customPrompt.trim() || undefined,
      },
      {
        onSuccess: (data) => { setAnalysis(data.analysis); setStep("results"); },
        onError: (err: any) => { toast({ title: "Analysis failed", description: err.message, variant: "destructive" }); },
      }
    );
  };

  const handleFeedPostScan = (post: any) => {
    setPostText(post.text);
    setImageUrl(post.media?.[0]?.url || post.media?.[0]?.preview_image_url || "");
    setAuthorFollowers(post.author?.publicMetrics?.followers_count?.toString() || "");
    setLikes(post.publicMetrics?.like_count?.toString() || "");
    setReplies(post.publicMetrics?.reply_count?.toString() || "");
    setRetweets(post.publicMetrics?.retweet_count?.toString() || "");
    setTimeElapsed(new Date(post.createdAt).toLocaleDateString());

    analyzeFeedPost.mutate(
      {
        postText: post.text,
        imageUrl: post.media?.[0]?.url || post.media?.[0]?.preview_image_url || undefined,
        authorFollowers: post.author?.publicMetrics?.followers_count?.toString() || undefined,
        likes: post.publicMetrics?.like_count,
        replies: post.publicMetrics?.reply_count,
        retweets: post.publicMetrics?.retweet_count,
        timeElapsed: "Recently",
        niche: niche.trim() || undefined,
        customPrompt: customPrompt.trim() || undefined,
        authorName: post.author?.name,
        authorUsername: post.author?.username,
      },
      {
        onSuccess: (data) => {
          setAnalysis(data.analysis);
          setStep("results");
        },
        onError: (err: any) => {
          toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleRegenerate = () => {
    if (extractedData) {
      // Screenshot path — use what the vision model extracted
      analyzePost.mutate(
        {
          postText: extractedData.postText,
          authorFollowers: extractedData.authorFollowers,
          likes: extractedData.likes,
          replies: extractedData.replies,
          retweets: extractedData.retweets,
          timeElapsed: extractedData.timeElapsed,
          niche: niche.trim() || undefined,
          customPrompt: customPrompt.trim() || undefined,
        },
        {
          onSuccess: (data) => { setAnalysis(data.analysis); },
          onError: (err: any) => { toast({ title: "Regeneration failed", description: err.message, variant: "destructive" }); },
        }
      );
    } else if (postText.trim()) {
      // Manual entry path
      analyzePost.mutate(
        {
          postText: postText.trim(),
          imageUrl: imageUrl.trim() || undefined,
          authorFollowers: authorFollowers.trim() || undefined,
          likes: likes ? parseInt(likes) : undefined,
          replies: replies ? parseInt(replies) : undefined,
          retweets: retweets ? parseInt(retweets) : undefined,
          timeElapsed: timeElapsed.trim() || undefined,
          niche: niche.trim() || undefined,
          customPrompt: customPrompt.trim() || undefined,
        },
        {
          onSuccess: (data) => { setAnalysis(data.analysis); },
          onError: (err: any) => { toast({ title: "Regeneration failed", description: err.message, variant: "destructive" }); },
        }
      );
    }
  };

  const copyComment = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({ title: "Copied to clipboard", description: "Paste this comment on the X post" });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const searchOnX = (query: string) => {
    window.open(`https://twitter.com/search?q=${encodeURIComponent(query)}&f=live`, "_blank", "noopener,noreferrer");
  };

  const scoreColor = (score: number) => score >= 8 ? "text-green-400" : score >= 5 ? "text-yellow-400" : "text-red-400";
  const scoreBg = (score: number) => score >= 8 ? "bg-green-500/20 border-green-500/30" : score >= 5 ? "bg-yellow-500/20 border-yellow-500/30" : "bg-red-500/20 border-red-500/30";
  const isScanning = scanScreenshot.isPending || analyzePost.isPending || analyzeFeedPost.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Viral Comment Engine</h1>
        <p className="text-muted-foreground mt-1">Scan a post screenshot and generate viral comments instantly</p>
      </div>

      <AnimatePresence mode="wait">
        {step === "analyze" && (
          <motion.div key="analyze" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">

            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg w-fit">
              <button onClick={() => setAnalyzeMode("screenshot")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  analyzeMode === "screenshot" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                }`} data-testid="button-mode-screenshot">
                <Camera size={14} /> Screenshot Scan
              </button>
              <button onClick={() => setAnalyzeMode("feed")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  analyzeMode === "feed" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                }`} data-testid="button-mode-feed">
                <LayoutGrid size={14} /> Browse Feed
              </button>
              <button onClick={() => setAnalyzeMode("manual")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  analyzeMode === "manual" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                }`} data-testid="button-mode-manual">
                <MessageSquare size={14} /> Manual Entry
              </button>
            </div>

            {/* Hero: Screenshot Scan */}
            {analyzeMode === "screenshot" && (
              <div className="glass-panel p-8">
                <div className="flex items-center gap-2 mb-3">
                  <Camera size={22} className="text-primary" />
                  <h2 className="font-display font-semibold text-xl">Screenshot Scan</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">AI-Powered</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Take a screenshot of any X post and drop it here. AI reads the post text, metrics, images — everything — and generates viral comments.
                </p>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" data-testid="input-screenshot-file" />

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !screenshotPreview && fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer min-h-[260px] flex flex-col items-center justify-center ${
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
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Camera size={36} className="text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-lg mb-1">Drop screenshot here or click to upload</p>
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

                {/* Niche + Custom Prompt */}
                <div className="mt-5 space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Niche / Trend Topic</label>
                    <div className="flex gap-2">
                      <Input placeholder="Paste trend topic here..." value={niche} onChange={(e) => setNiche(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && niche.trim()) searchOnX(niche.trim()); }} className="flex-1 bg-secondary/30" data-testid="input-niche-screenshot" />
                      <Button size="sm" variant="outline" onClick={() => { if (niche.trim()) searchOnX(niche.trim()); }} disabled={!niche.trim()} className="shrink-0 gap-1.5" data-testid="button-search-niche-x-screenshot">
                        <ExternalLink size={13} />
                        X
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Comment Instructions <span className="text-muted-foreground/60 font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={1}
                      value={customPrompt}
                      onChange={(e) => { setCustomPrompt(e.target.value); autoExpand(e.target); }}
                      placeholder='Example: short viral comment in the style of a Gen Z girl'
                      className={promptTextareaClass}
                      style={{ minHeight: "38px" }}
                      data-testid="input-custom-prompt-screenshot"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleScreenshotScan} disabled={isScanning || !screenshotFile} className="min-w-[220px]" data-testid="button-scan-screenshot">
                    {scanScreenshot.isPending ? (<><RefreshCw size={14} className="mr-2 animate-spin" /> AI is reading the post...</>) : (<><Eye size={14} className="mr-2" /> Scan & Generate Comments</>)}
                  </Button>
                </div>
              </div>
            )}

            {/* Feed Browser */}
            {analyzeMode === "feed" && (
              <div className="space-y-4">
                <div className="glass-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={20} className="text-primary" />
                      <h2 className="font-display font-semibold text-lg">Browse X Feed</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-border/30 overflow-hidden text-xs" data-testid="feed-sort-toggle">
                        <button
                          onClick={() => setFeedSort("best")}
                          className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${feedSort === "best" ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
                          data-testid="button-sort-best"
                        >
                          <Flame size={12} /> Best Opportunity
                        </button>
                        <button
                          onClick={() => setFeedSort("latest")}
                          className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${feedSort === "latest" ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
                          data-testid="button-sort-latest"
                        >
                          <Clock size={12} /> Latest
                        </button>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleRefreshFeed} disabled={isLoadingTimeline || isRefreshing} className="gap-2" data-testid="button-refresh-feed">
                        <RefreshCw size={14} className={(isLoadingTimeline || isRefreshing) ? "animate-spin" : ""} />
                        Refresh Feed
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Niche / Trend Topic</label>
                      <Input placeholder="Trend topic..." value={niche} onChange={(e) => setNiche(e.target.value)} className="bg-secondary/30" data-testid="input-niche-feed" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Comment Instructions (optional)</label>
                      <Input placeholder="e.g. style of a Gen Z girl" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} className="bg-secondary/30" data-testid="input-custom-prompt-feed" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                  {isLoadingTimeline ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="glass-panel p-4 animate-pulse">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary/50" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-secondary/50 rounded w-1/4" />
                            <div className="h-4 bg-secondary/50 rounded w-full" />
                            <div className="h-4 bg-secondary/50 rounded w-full" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : sortedFeedPosts.length ? (
                    sortedFeedPosts.map((post: any) => {
                      const score = post.score ?? 0;
                      const scoreBadgeClass = score >= 80
                        ? "bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                        : score >= 60
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "bg-secondary/40 text-muted-foreground border-border/30";

                      return (
                        <div key={post.id} className="glass-panel p-4 hover:border-primary/30 transition-colors group" data-testid={`card-feed-post-${post.id}`}>
                          <div className="flex gap-3">
                            <img src={post.author?.profileImageUrl} alt="" className="w-10 h-10 rounded-full bg-secondary/50 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-bold text-sm truncate">{post.author?.name}</span>
                                  <span className="text-muted-foreground text-xs truncate">@{post.author?.username}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreBadgeClass}`} data-testid={`score-badge-${post.id}`}>
                                    🔥 {score}/100
                                  </span>
                                  <span className="text-muted-foreground text-[10px] whitespace-nowrap">{new Date(post.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <p className="text-sm whitespace-pre-wrap mb-3 leading-relaxed">{post.text}</p>

                              {post.media?.length > 0 && (
                                <div className={`mb-3 ${post.media.length > 1 ? "grid grid-cols-2 gap-1.5" : ""} rounded-lg overflow-hidden`}>
                                  {post.media.map((m: any, idx: number) => {
                                    const isVideo = m.type === "video" || m.type === "animated_gif";
                                    const imgSrc = isVideo ? m.preview_image_url : (m.url || m.preview_image_url);
                                    const aspectStyle = m.width && m.height
                                      ? { aspectRatio: `${m.width}/${m.height}` }
                                      : {};

                                    return (
                                      <div key={m.media_key || idx} className="relative rounded-lg overflow-hidden border border-border/30 bg-secondary/20" style={aspectStyle}>
                                        {imgSrc && (
                                          <img
                                            src={imgSrc}
                                            alt=""
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                          />
                                        )}
                                        {isVideo && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                                              <Play size={18} className="text-black ml-0.5" />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-border/10">
                                <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1 text-xs" data-testid={`metric-likes-${post.id}`}><Heart size={12} /> {(post.publicMetrics?.like_count ?? 0).toLocaleString()}</span>
                                  <span className="flex items-center gap-1 text-xs" data-testid={`metric-replies-${post.id}`}><MessageSquare size={12} /> {(post.publicMetrics?.reply_count ?? 0).toLocaleString()}</span>
                                  <span className="flex items-center gap-1 text-xs" data-testid={`metric-retweets-${post.id}`}><Repeat2 size={12} /> {(post.publicMetrics?.retweet_count ?? 0).toLocaleString()}</span>
                                  <span className="flex items-center gap-1 text-xs" data-testid={`metric-quotes-${post.id}`}><Quote size={12} /> {(post.publicMetrics?.quote_count ?? 0).toLocaleString()}</span>
                                  {post.publicMetrics?.impression_count != null && (
                                    <span className="flex items-center gap-1 text-xs" data-testid={`metric-impressions-${post.id}`}><Eye size={12} /> {post.publicMetrics.impression_count.toLocaleString()}</span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleFeedPostScan(post)}
                                  disabled={isScanning}
                                  className="h-8 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  data-testid={`button-scan-feed-post-${post.id}`}
                                >
                                  {analyzePost.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                                  Scan & Generate
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="glass-panel p-12 text-center text-muted-foreground">
                      <LayoutGrid size={48} className="mx-auto mb-4 opacity-20" />
                      <p>No posts found in your feed.</p>
                      <p className="text-xs mt-2">Make sure your X account is connected in Settings.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manual Entry */}
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
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium mb-1 block flex items-center gap-1"><Clock size={12} /> Time Since Posted</label><Input placeholder="e.g. 2h, 30m" value={timeElapsed} onChange={(e) => setTimeElapsed(e.target.value)} className="bg-secondary/30" data-testid="input-time-elapsed" /></div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Niche / Trend Topic</label>
                    <div className="flex gap-2">
                      <Input placeholder="Paste trend topic here..." value={niche} onChange={(e) => setNiche(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && niche.trim()) searchOnX(niche.trim()); }} className="flex-1 bg-secondary/30" data-testid="input-niche" />
                      <Button size="sm" variant="outline" onClick={() => { if (niche.trim()) searchOnX(niche.trim()); }} disabled={!niche.trim()} className="shrink-0 gap-1.5" data-testid="button-search-niche-x">
                        <ExternalLink size={13} />
                        X
                      </Button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Comment Instructions <span className="text-muted-foreground/60 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={1}
                    value={customPrompt}
                    onChange={(e) => { setCustomPrompt(e.target.value); autoExpand(e.target); }}
                    placeholder='Example: short viral comment in the style of a Gen Z girl'
                    className={promptTextareaClass}
                    style={{ minHeight: "38px" }}
                    data-testid="input-custom-prompt-manual"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleManualAnalyze} disabled={isScanning || !postText.trim()} className="min-w-[200px]" data-testid="button-generate-comments">
                    {analyzePost.isPending ? (<><RefreshCw size={14} className="mr-2 animate-spin" /> Analyzing...</>) : (<><Zap size={14} className="mr-2" /> Generate Viral Comments</>)}
                  </Button>
                </div>
              </div>
            )}

            {/* Google Trends Collapsible */}
            <div className="glass-panel overflow-hidden">
              <button
                onClick={() => setGoogleTrendsOpen(!googleTrendsOpen)}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-secondary/20 transition-colors"
                data-testid="button-toggle-google-trends"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} className="text-primary" />
                  <span className="font-medium text-sm">Google Trends</span>
                  <span className="text-xs text-muted-foreground">— find trending topics to inform your niche</span>
                </div>
                {googleTrendsOpen ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </button>

              <AnimatePresence>
                {googleTrendsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border/50"
                  >
                    <div className="p-4 space-y-4">
                      <div className="space-y-3">
                        {GOOGLE_TRENDS_STEPS.map((s, i) => {
                          const Icon = s.icon;
                          return (
                            <div key={i} className="flex gap-3 items-start">
                              <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-primary">{i + 1}</span>
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Icon size={12} className="text-primary shrink-0" />
                                  <p className="text-sm font-medium">{s.label}</p>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        onClick={() => window.open(TRENDS_URL, "_blank", "noopener,noreferrer")}
                        className="w-full gap-2"
                        data-testid="button-open-google-trends"
                      >
                        <ExternalLink size={14} />
                        Open Google Trends
                      </Button>
                      <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        Opens in a new tab. Google Trends does not allow embedding in third-party apps (X-Frame-Options policy).
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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

            {/* Generated Comments + Refine & Regenerate */}
            <div className="glass-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageCircle size={18} className="text-primary" />
                  <span className="font-display font-semibold">Generated Comments</span>
                </div>
              </div>

              {/* Refine bar */}
              <div className="flex items-end gap-3 mb-5 p-3 rounded-lg bg-secondary/20 border border-border/30">
                <div className="flex-1">
                  <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5 text-muted-foreground">
                    <Wand2 size={11} />
                    Refine the style <span className="font-normal opacity-60">(optional)</span>
                  </label>
                  <textarea
                    rows={1}
                    value={customPrompt}
                    onChange={(e) => { setCustomPrompt(e.target.value); autoExpand(e.target); }}
                    placeholder="Adjust tone, length, personality… e.g. make it funnier and shorter"
                    className={promptTextareaClass}
                    style={{ minHeight: "36px" }}
                    data-testid="input-refine-prompt"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={analyzePost.isPending || (!extractedData && !postText.trim())}
                  className="shrink-0 gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                  data-testid="button-refine-regenerate"
                >
                  {analyzePost.isPending
                    ? <><RefreshCw size={13} className="animate-spin" /> Regenerating...</>
                    : <><RefreshCw size={13} /> Refine & Regenerate</>
                  }
                </Button>
              </div>

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
              <Button variant="outline" onClick={() => { setStep("analyze"); setAnalysis(null); setExtractedData(null); setScreenshotPreview(null); setScreenshotFile(null); setPostText(""); setImageUrl(""); setCustomPrompt(""); }} data-testid="button-new-trend">
                Start Over
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
