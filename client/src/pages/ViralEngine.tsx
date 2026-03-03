import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrendingTopics, useAnalyzePost } from "@/lib/hooks";
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
  AlertTriangle,
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
} from "lucide-react";

type TrendTopic = {
  id: number;
  title: string;
  traffic: string;
  relatedQueries: string[];
  articles: Array<{ title: string; url: string; source: string; snippet: string }>;
  image: string | null;
  searchQuery: string;
  context?: string | null;
};

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
  bestStrategy: {
    type: string;
    explanation: string;
  };
  comments: string[];
  safestOption: {
    index: number;
    explanation: string;
  };
  highVisibilityOption: {
    index: number;
    explanation: string;
  };
  skipRecommended: boolean;
  skipReason: string | null;
};

type Step = "trends" | "analyze" | "results";

export default function ViralEngine() {
  const [step, setStep] = useState<Step>("trends");
  const [selectedTrend, setSelectedTrend] = useState<TrendTopic | null>(null);
  const [geo, setGeo] = useState("US");
  const [expandedTrend, setExpandedTrend] = useState<number | null>(null);

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

  const { toast } = useToast();
  const { data: trendsData, isLoading: trendsLoading, refetch: refetchTrends } = useTrendingTopics(geo);
  const analyzePost = useAnalyzePost();

  const handleSelectTrend = (topic: TrendTopic) => {
    setSelectedTrend(topic);
    setStep("analyze");
  };

  const handleAnalyze = () => {
    if (!postText.trim()) {
      toast({ title: "Post text required", description: "Paste the text from the X post you want to analyze", variant: "destructive" });
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

  const scoreColor = (score: number) => {
    if (score >= 8) return "text-green-400";
    if (score >= 5) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreBg = (score: number) => {
    if (score >= 8) return "bg-green-500/20 border-green-500/30";
    if (score >= 5) return "bg-yellow-500/20 border-yellow-500/30";
    return "bg-red-500/20 border-red-500/30";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Viral Comment Engine</h1>
          <p className="text-muted-foreground mt-1">Find trending topics, analyze posts, generate viral comments</p>
        </div>
        <div className="flex items-center gap-2">
          {["trends", "analyze", "results"].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  step === s
                    ? "bg-primary/20 border-primary text-primary"
                    : i < ["trends", "analyze", "results"].indexOf(step)
                    ? "bg-primary/10 border-primary/50 text-primary/70"
                    : "bg-secondary/30 border-border/50 text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-6 h-px bg-border/50" />}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "trends" && (
          <motion.div
            key="trends"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="glass-panel p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-primary" size={20} />
                <span className="font-medium">Trending Topics</span>
                <span className="text-xs text-muted-foreground">
                  {trendsData?.source === "ai_generated" ? "AI-powered suggestions" : "powered by Google Trends"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={geo}
                  onChange={(e) => setGeo(e.target.value)}
                  className="bg-secondary/50 border border-border/50 rounded-md px-3 py-1.5 text-sm"
                  data-testid="select-geo"
                >
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="BR">Brazil</option>
                  <option value="IN">India</option>
                  <option value="JP">Japan</option>
                  <option value="KR">South Korea</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchTrends()}
                  disabled={trendsLoading}
                  data-testid="button-refresh-trends"
                >
                  <RefreshCw size={14} className={trendsLoading ? "animate-spin" : ""} />
                </Button>
              </div>
            </div>

            {trendsLoading ? (
              <div className="glass-panel p-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Fetching trending topics...</p>
              </div>
            ) : !trendsData?.topics?.length ? (
              <div className="glass-panel p-12 flex flex-col items-center justify-center gap-3">
                <Globe size={24} className="text-muted-foreground" />
                <p className="text-muted-foreground text-sm">No trends found. Try a different region.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {trendsData.topics.map((topic) => (
                  <motion.div
                    key={topic.id}
                    className="glass-panel p-4 hover:border-primary/30 transition-all cursor-pointer"
                    data-testid={`card-trend-${topic.id}`}
                    whileHover={{ scale: 1.005 }}
                  >
                    <div
                      className="flex items-center justify-between"
                      onClick={() => setExpandedTrend(expandedTrend === topic.id ? null : topic.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {topic.image ? (
                          <img src={topic.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Flame size={18} className="text-primary" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium truncate">{topic.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-primary font-medium">{topic.traffic} searches</span>
                            {topic.context && (
                              <span className="text-xs text-muted-foreground truncate">{topic.context}</span>
                            )}
                            {!topic.context && topic.relatedQueries.length > 0 && (
                              <span className="text-xs text-muted-foreground truncate">
                                {topic.relatedQueries.slice(0, 2).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openXSearch(topic.searchQuery);
                          }}
                          data-testid={`button-search-x-${topic.id}`}
                        >
                          <Search size={14} className="mr-1" />
                          Search on X
                          <ExternalLink size={12} className="ml-1" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTrend(topic);
                          }}
                          data-testid={`button-select-trend-${topic.id}`}
                        >
                          Use This Trend
                        </Button>
                        {expandedTrend === topic.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedTrend === topic.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                            {topic.relatedQueries.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">Related searches:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {topic.relatedQueries.map((q, i) => (
                                    <button
                                      key={i}
                                      onClick={() => openXSearch(q)}
                                      className="text-xs px-2 py-1 rounded-full bg-secondary/50 hover:bg-primary/20 hover:text-primary transition-colors"
                                      data-testid={`button-related-query-${topic.id}-${i}`}
                                    >
                                      {q}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {topic.articles.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">News articles:</span>
                                <div className="space-y-1 mt-1">
                                  {topic.articles.map((a, i) => (
                                    <a
                                      key={i}
                                      href={a.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-400 hover:underline block truncate"
                                      data-testid={`link-article-${topic.id}-${i}`}
                                    >
                                      {a.title} — {a.source}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="glass-panel p-4">
              <p className="text-sm text-muted-foreground">
                <strong>How it works:</strong> Pick a trending topic above, then click "Search on X" to find viral posts in X's interface. 
                Come back here, paste the post details, and our AI will generate high-engagement comments optimized for that trend.
              </p>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setStep("analyze")} data-testid="button-skip-to-analyze">
                Skip to Post Analysis
              </Button>
            </div>
          </motion.div>
        )}

        {step === "analyze" && (
          <motion.div
            key="analyze"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {selectedTrend && (
              <div className="glass-panel p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flame size={18} className="text-primary" />
                  <div>
                    <span className="font-medium">{selectedTrend.title}</span>
                    <span className="text-xs text-primary ml-2">{selectedTrend.traffic} searches</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openXSearch(selectedTrend.searchQuery)}
                    data-testid="button-open-x-search"
                  >
                    <Search size={14} className="mr-1" />
                    Search on X
                    <ExternalLink size={12} className="ml-1" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedTrend(null); setStep("trends"); }}
                    data-testid="button-change-trend"
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}

            <div className="glass-panel p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={20} className="text-primary" />
                <h2 className="font-display font-semibold text-lg">Paste Post Details</h2>
              </div>

              <p className="text-sm text-muted-foreground -mt-2">
                Find a post on X about this trend, then paste its details here for AI analysis.
              </p>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Post Text *</label>
                <Textarea
                  placeholder="Paste the full text of the X post here..."
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="min-h-[100px] bg-secondary/30"
                  data-testid="input-post-text"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                  <ImageIcon size={14} />
                  Image URL (optional)
                </label>
                <Input
                  placeholder="https://pbs.twimg.com/... or paste image URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="bg-secondary/30"
                  data-testid="input-image-url"
                />
                <p className="text-xs text-muted-foreground mt-1">Right-click the image on X and "Copy image address"</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block flex items-center gap-1">
                    <Users size={12} /> Followers
                  </label>
                  <Input
                    placeholder="e.g. 50K"
                    value={authorFollowers}
                    onChange={(e) => setAuthorFollowers(e.target.value)}
                    className="bg-secondary/30"
                    data-testid="input-followers"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block flex items-center gap-1">
                    <Heart size={12} /> Likes
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={likes}
                    onChange={(e) => setLikes(e.target.value)}
                    className="bg-secondary/30"
                    data-testid="input-likes"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block flex items-center gap-1">
                    <MessageSquare size={12} /> Replies
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={replies}
                    onChange={(e) => setReplies(e.target.value)}
                    className="bg-secondary/30"
                    data-testid="input-replies"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block flex items-center gap-1">
                    <Repeat2 size={12} /> Reposts
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={retweets}
                    onChange={(e) => setRetweets(e.target.value)}
                    className="bg-secondary/30"
                    data-testid="input-retweets"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block flex items-center gap-1">
                    <Clock size={12} /> Time Since Posted
                  </label>
                  <Input
                    placeholder="e.g. 2h, 30m, 1d"
                    value={timeElapsed}
                    onChange={(e) => setTimeElapsed(e.target.value)}
                    className="bg-secondary/30"
                    data-testid="input-time-elapsed"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Niche</label>
                  <Input
                    placeholder="e.g. Tech, Fashion, Crypto"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="bg-secondary/30"
                    data-testid="input-niche"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Comment Style</label>
                  <select
                    value={commentStyle}
                    onChange={(e) => setCommentStyle(e.target.value)}
                    className="w-full bg-secondary/30 border border-border/50 rounded-md px-3 py-2 text-sm"
                    data-testid="select-comment-style"
                  >
                    <option value="Safe">Safe</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Bold">Bold</option>
                    <option value="Contrarian">Contrarian</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("trends")}
                data-testid="button-back-to-trends"
              >
                Back to Trends
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={analyzePost.isPending || !postText.trim()}
                className="min-w-[200px]"
                data-testid="button-generate-comments"
              >
                {analyzePost.isPending ? (
                  <>
                    <RefreshCw size={14} className="mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap size={14} className="mr-2" />
                    Generate Viral Comments
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "results" && analysis && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {analysis.skipRecommended && (
              <div className="glass-panel p-4 border-red-500/30 bg-red-500/10">
                <div className="flex items-center gap-2 text-red-400 font-medium">
                  <XCircle size={18} />
                  Skip Recommended
                </div>
                <p className="text-sm text-red-300/80 mt-1">{analysis.skipReason}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`glass-panel p-4 border ${scoreBg(analysis.trendMomentumScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Flame size={18} className="text-orange-400" />
                    <span className="font-medium text-sm">Trend Momentum</span>
                  </div>
                  <span className={`text-2xl font-bold ${scoreColor(analysis.trendMomentumScore)}`} data-testid="text-trend-score">
                    {analysis.trendMomentumScore}/10
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{analysis.trendMomentumExplanation}</p>
              </div>

              <div className={`glass-panel p-4 border ${scoreBg(analysis.postViralPotential)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-400" />
                    <span className="font-medium text-sm">Viral Potential</span>
                  </div>
                  <span className={`text-2xl font-bold ${scoreColor(analysis.postViralPotential)}`} data-testid="text-viral-score">
                    {analysis.postViralPotential}/10
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{analysis.postViralExplanation}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={18} className="text-purple-400" />
                  <span className="font-medium text-sm">Post Tone Analysis</span>
                </div>
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
                <div className="flex items-center gap-2 mb-3">
                  <Target size={18} className="text-green-400" />
                  <span className="font-medium text-sm">Best Strategy</span>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <span className="text-primary font-semibold text-sm">{analysis.bestStrategy?.type}</span>
                  <p className="text-xs text-muted-foreground mt-1">{analysis.bestStrategy?.explanation}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle size={18} className="text-primary" />
                <span className="font-display font-semibold">Generated Comments</span>
              </div>

              <div className="space-y-3">
                {analysis.comments?.map((comment, i) => {
                  const isSafest = analysis.safestOption?.index === i;
                  const isHighVis = analysis.highVisibilityOption?.index === i;

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-4 rounded-lg border transition-all ${
                        isHighVis
                          ? "bg-primary/10 border-primary/30"
                          : isSafest
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-secondary/30 border-border/50"
                      }`}
                      data-testid={`card-comment-${i}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isHighVis && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1">
                                <Rocket size={10} /> High Visibility
                              </span>
                            )}
                            {isSafest && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium flex items-center gap-1">
                                <Zap size={10} /> Safest Pick
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">{comment}</p>
                          {isHighVis && analysis.highVisibilityOption?.explanation && (
                            <p className="text-xs text-primary/70 mt-2">{analysis.highVisibilityOption.explanation}</p>
                          )}
                          {isSafest && analysis.safestOption?.explanation && (
                            <p className="text-xs text-green-400/70 mt-2">{analysis.safestOption.explanation}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyComment(comment, i)}
                          className="shrink-0"
                          data-testid={`button-copy-comment-${i}`}
                        >
                          {copiedIndex === i ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("analyze")}
                data-testid="button-analyze-another"
              >
                Analyze Another Post
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setStep("trends"); setAnalysis(null); setPostText(""); setImageUrl(""); }}
                  data-testid="button-new-trend"
                >
                  New Trend
                </Button>
                {selectedTrend && (
                  <Button
                    onClick={() => openXSearch(selectedTrend.searchQuery)}
                    data-testid="button-back-to-x"
                  >
                    <ExternalLink size={14} className="mr-2" />
                    Back to X Search
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
