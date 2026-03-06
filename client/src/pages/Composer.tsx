import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Save, RefreshCw, Send, CheckCircle2, Image as ImageIcon,
  X, Plus, Loader2, Wand2, Trash2, Clock, Zap, Eye,
} from "lucide-react";
import {
  useTweets, useCreateTweet, useUpdateTweet, useDeleteTweet,
  useMediaItems, useGenerateTweets, usePostNow,
} from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { DateTimeWheelModal } from "@/components/DateTimeWheelModal";
import { PlatformBadge } from "@/components/platform/PlatformBadge";
import type { Tweet } from "@shared/schema";

type ComposerTab = "x" | "threads" | "both";

const CHAR_LIMITS: Record<ComposerTab, number> = {
  x: 280,
  threads: 500,
  both: 280, // most restrictive — must pass on both platforms
};

const TWEET_STYLES = [
  "Engagement Bait",
  "Direct Question",
  "Soft Tease",
  "Viral Hook",
  "Community Love",
];

function formatScheduleDisplay(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// --- Platform preview components ---

function XPreview({ text, imageUrl }: { text: string; imageUrl?: string | null }) {
  return (
    <div className="bg-black rounded-xl p-4 border border-white/10 text-white">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-bold">Aura</span>
            <span className="text-white/40 text-sm">@aura</span>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-white/90">
            {text || <span className="text-white/25">Your post will appear here…</span>}
          </p>
          {imageUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-white/10">
              <img src={imageUrl} alt="Attached media" className="w-full h-36 object-cover" />
            </div>
          )}
          <div className="flex items-center gap-5 mt-3 text-white/30 text-xs">
            <span>Reply</span>
            <span>Repost</span>
            <span>Like</span>
            <span>Views</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadsPreview({ text, imageUrl }: { text: string; imageUrl?: string | null }) {
  return (
    <div className="bg-[#0d0d0d] rounded-xl p-4 border border-white/5 text-white">
      <div className="flex gap-3">
        <div className="flex flex-col items-center shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-accent" />
          <div className="w-px flex-1 bg-white/10 mt-2 min-h-[24px]" />
        </div>
        <div className="flex-1 min-w-0 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">aura</span>
            <span className="text-white/30 text-xs">just now</span>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-white/85">
            {text || <span className="text-white/20">Your Threads post will appear here…</span>}
          </p>
          {imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-white/5">
              <img src={imageUrl} alt="Attached media" className="w-full h-36 object-cover" />
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-white/25 text-xs">
            <span>Like</span>
            <span>Reply</span>
            <span>Repost</span>
            <span>Quote</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Composer ---

export default function Composer() {
  const [composerTab, setComposerTab] = useState<ComposerTab>("x");
  const [selectedStyle, setSelectedStyle] = useState(TWEET_STYLES[0]);
  const [showVault, setShowVault] = useState<number | null>(null);
  const [draftText, setDraftText] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [seductiveness, setSeductiveness] = useState(75);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [draftSchedule, setDraftSchedule] = useState("");
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [queueModalForId, setQueueModalForId] = useState<number | null>(null);
  const [postingNowId, setPostingNowId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const hasAutoGenerated = useRef(false);
  const { toast } = useToast();

  const charLimit = CHAR_LIMITS[composerTab];

  const { data: tweets = [], isLoading: isLoadingTweets } = useTweets();
  const { data: mediaItems = [], isLoading: isLoadingMedia } = useMediaItems();
  const createTweetMutation = useCreateTweet();
  const updateTweetMutation = useUpdateTweet();
  const deleteTweetMutation = useDeleteTweet();
  const generateMutation = useGenerateTweets();
  const postNowMutation = usePostNow();

  useEffect(() => {
    if (hasAutoGenerated.current) return;
    const params = new URLSearchParams(window.location.search);
    const imageUrl = params.get("imageUrl");
    const mood = params.get("mood");
    const outfit = params.get("outfit");
    if (imageUrl) {
      setAttachedImage(imageUrl);
      const themeParts = [mood, outfit].filter(Boolean);
      const topic =
        themeParts.length > 0
          ? `photo caption for a ${themeParts.join(", ").toLowerCase()} vibe`
          : "photo caption";
      setTopicInput(topic);
      hasAutoGenerated.current = true;
      window.history.replaceState({}, "", "/composer");
      generateMutation.mutate(
        { style: selectedStyle, topic, seductiveness, imageUrl: imageUrl || undefined },
        {
          onSuccess: (data) => {
            setSuggestions(data.tweets || []);
            toast({ title: "Captions generated", description: `${(data.tweets || []).length} caption ideas for your photo.` });
          },
          onError: (err: any) =>
            toast({ title: "Generation failed", description: err.message, variant: "destructive" }),
        },
      );
    }
  }, []);

  const handleGenerate = () => {
    generateMutation.mutate(
      { style: selectedStyle, topic: topicInput || undefined, seductiveness, imageUrl: attachedImage || undefined },
      {
        onSuccess: (data) => {
          setSuggestions(data.tweets || []);
          toast({ title: "Generated", description: `${(data.tweets || []).length} ideas ready.` });
        },
        onError: (err: any) =>
          toast({ title: "Generation failed", description: err.message, variant: "destructive" }),
      },
    );
  };

  const handleSaveDraft = async () => {
    if (!draftText.trim()) return;
    if (draftText.length > charLimit) {
      toast({ title: "Too long", description: `Max ${charLimit} characters for this platform.`, variant: "destructive" });
      return;
    }
    if (composerTab === "threads" || composerTab === "both") {
      toast({ title: "Threads queuing coming soon", description: "Threads API integration is in progress.", variant: "destructive" });
      if (composerTab === "threads") return;
    }
    await createTweetMutation.mutateAsync({
      text: draftText,
      style: selectedStyle,
      status: "queued",
      imageUrl: attachedImage,
      scheduledAt: draftSchedule || null,
    });
    setDraftText("");
    setAttachedImage(null);
    setDraftSchedule("");
    toast({
      title: "Saved to X queue",
      description: draftSchedule ? `Scheduled for ${formatScheduleDisplay(draftSchedule)}.` : "Tweet added to queue.",
    });
  };

  const handlePostNowDraft = () => {
    if (!draftText.trim()) return;
    if (draftText.length > charLimit) {
      toast({ title: "Too long", description: `Max ${charLimit} characters for this platform.`, variant: "destructive" });
      return;
    }
    if (composerTab === "threads") {
      toast({ title: "Threads posting coming soon", description: "Threads API integration is in progress." });
      return;
    }
    postNowMutation.mutate(
      { text: draftText, imageUrl: attachedImage || undefined },
      {
        onSuccess: () => {
          setDraftText("");
          setAttachedImage(null);
          setDraftSchedule("");
          const label = composerTab === "both" ? "X (Threads coming soon)" : "X";
          toast({ title: `Posted to ${label}`, description: "Your post is live." });
        },
        onError: (err: any) =>
          toast({ title: "Post failed", description: err.message, variant: "destructive" }),
      },
    );
  };

  const handleQueuePostNow = (tweet: Tweet) => {
    if (tweet.text.length > 280) {
      toast({ title: "Too long", description: "Tweet exceeds 280 characters.", variant: "destructive" });
      return;
    }
    setPostingNowId(tweet.id);
    postNowMutation.mutate(
      { text: tweet.text, imageUrl: tweet.imageUrl || undefined },
      {
        onSuccess: () => {
          updateTweetMutation.mutate({ id: tweet.id, status: "posted" });
          toast({ title: "Posted to X", description: "Your tweet is live." });
        },
        onError: (err: any) =>
          toast({ title: "Post failed", description: err.message, variant: "destructive" }),
        onSettled: () => setPostingNowId(null),
      },
    );
  };

  const attachImage = (tweetId: number, imageUrl: string) => {
    updateTweetMutation.mutate({ id: tweetId, imageUrl });
    setShowVault(null);
  };

  const removeImage = (tweetId: number) => {
    updateTweetMutation.mutate({ id: tweetId, imageUrl: null });
  };

  const queueTweetForModal = queueModalForId ? tweets.find((t) => t.id === queueModalForId) : null;

  const isOverLimit = draftText.length > charLimit;
  const charCountColor = isOverLimit
    ? "text-red-400 font-medium"
    : draftText.length > charLimit * 0.9
    ? "text-amber-400"
    : "text-muted-foreground";

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Composer</h1>
          <p className="text-muted-foreground mt-1">Generate, refine, and schedule content across platforms.</p>
        </div>

        {/* Platform tab selector */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/30 border border-border/40 w-fit">
          {(["x", "threads", "both"] as ComposerTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setComposerTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                composerTab === tab
                  ? "bg-primary/20 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "both" ? "Both" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {composerTab !== "x" && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 text-sm">
          <Sparkles className="w-4 h-4 shrink-0" />
          {composerTab === "threads"
            ? "Threads posting is coming soon. You can draft content and preview formatting, but publishing requires Threads API integration."
            : "Cross-posting to both platforms: X will publish immediately; Threads integration is coming soon."}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* Content Studio */}
          <Card className="p-6 glass-panel border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
            <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="text-primary w-5 h-5" />
              Content Studio
            </h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Topic (optional)</label>
                <Input
                  placeholder="e.g. late night vibes, coding grind, fitness..."
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className="bg-background/50 border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 block">Target Style</label>
                <div className="flex flex-wrap gap-2">
                  {TWEET_STYLES.map((style) => (
                    <Badge
                      key={style}
                      variant={selectedStyle === style ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        selectedStyle === style
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedStyle(style)}
                    >
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-muted-foreground">Seductiveness / Playfulness</label>
                  <span className="text-xs text-primary font-mono">{seductiveness}%</span>
                </div>
                <Slider
                  value={[seductiveness]}
                  onValueChange={(v) => setSeductiveness(v[0])}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:border-primary [&_[role=slider]]:bg-primary"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                {generateMutation.isPending ? "Generating..." : "Generate Ideas"}
              </Button>
            </div>
          </Card>

          {/* AI Suggestions */}
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    AI Suggestions
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setSuggestions([])}>
                    <X className="w-3 h-3 mr-1" /> Clear
                  </Button>
                </div>
                <div className="grid gap-3">
                  {suggestions.map((text, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <Card
                        className="p-4 glass-panel border-accent/20 hover:border-accent/50 cursor-pointer transition-all group"
                        onClick={() => { setDraftText(text); setSuggestions([]); }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm leading-relaxed flex-1">{text}</p>
                          <Button variant="ghost" size="sm" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-accent">
                            Use
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Draft Editor */}
          <Card className="p-6 glass-panel border-border/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Save className="w-4 h-4" />
                Draft Editor
              </h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
            </div>

            {attachedImage && (
              <div className="relative mb-4 inline-block">
                <img src={attachedImage} alt="Attached" className="w-32 h-32 object-cover rounded-lg border border-border/50" />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-2 -right-2 p-1 bg-black/70 rounded-full text-white hover:bg-black/90 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <Textarea
              placeholder={`Write your ${composerTab === "both" ? "post" : composerTab === "threads" ? "Threads post" : "tweet"} here…`}
              className="bg-background/50 border-border/50 resize-none h-28 mb-4"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />

            {/* Platform preview */}
            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Preview
                  </p>
                  <div className={`grid gap-4 ${composerTab === "both" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                    {(composerTab === "x" || composerTab === "both") && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <PlatformBadge platform="x" showLabel size="xs" />
                        </div>
                        <XPreview text={draftText} imageUrl={attachedImage} />
                      </div>
                    )}
                    {(composerTab === "threads" || composerTab === "both") && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <PlatformBadge platform="threads" showLabel size="xs" />
                        </div>
                        <ThreadsPreview text={draftText} imageUrl={attachedImage} />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 border-t border-border/20" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Schedule trigger */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setShowDraftModal(true)}
                className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/50 hover:border-primary/40 transition-colors px-3 py-1.5 text-sm"
              >
                <Clock className="w-4 h-4" />
                {draftSchedule ? formatScheduleDisplay(draftSchedule) : "Set post time"}
              </button>
              {draftSchedule && (
                <button onClick={() => setDraftSchedule("")} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  Clear
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <span className={`text-xs tabular-nums ${charCountColor}`}>
                {draftText.length}/{charLimit}
                {composerTab === "both" && (
                  <span className="text-muted-foreground ml-1">(Threads: {draftText.length}/500)</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={handlePostNowDraft}
                  disabled={postNowMutation.isPending || !draftText.trim() || isOverLimit}
                  variant="outline"
                  className="border-accent/40 text-accent hover:bg-accent/10 gap-1.5"
                >
                  {postNowMutation.isPending && !postingNowId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Post Now
                </Button>
                <Button
                  onClick={handleSaveDraft}
                  disabled={createTweetMutation.isPending || !draftText.trim() || isOverLimit}
                  className="bg-primary/20 text-primary hover:bg-primary/30"
                >
                  {createTweetMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {draftSchedule ? "Schedule" : "Save to Queue"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Post Queue */}
          <div className="space-y-4">
            <h3 className="text-lg font-display font-medium">Post Queue</h3>

            {isLoadingTweets ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : tweets.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <p className="text-muted-foreground">No posts drafted yet. Generate some ideas above.</p>
              </Card>
            ) : (
              [...tweets]
                .sort((a, b) => {
                  if (a.scheduledAt && b.scheduledAt)
                    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
                  if (a.scheduledAt && !b.scheduledAt) return -1;
                  if (!a.scheduledAt && b.scheduledAt) return 1;
                  return 0;
                })
                .map((tweet, i) => (
                  <motion.div
                    key={tweet.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Card className="p-4 glass-panel border-border/40 hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <PlatformBadge platform="x" size="xs" />
                          <Badge variant="secondary" className="text-xs bg-secondary/50 text-muted-foreground">
                            {tweet.style}
                          </Badge>
                          {tweet.status === "posted" && (
                            <Badge className="text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-400/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Posted
                            </Badge>
                          )}
                          {tweet.status === "failed" && (
                            <Badge className="text-[10px] uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-400/30">
                              Failed
                            </Badge>
                          )}
                          {tweet.status === "queued" && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-accent border-accent/30">
                              In Queue
                            </Badge>
                          )}
                          {tweet.scheduledAt && (
                            <span className="text-xs text-accent flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatScheduleDisplay(tweet.scheduledAt)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("Delete this post?")) {
                              deleteTweetMutation.mutate(tweet.id);
                              toast({ title: "Deleted", description: "Post removed from queue." });
                            }
                          }}
                          className="p-1 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-foreground text-sm leading-relaxed mb-3">{tweet.text}</p>
                        </div>
                        {tweet.imageUrl && (
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border/50 shrink-0">
                            <img src={tweet.imageUrl} className="w-full h-full object-cover" alt="Attached content" />
                            <button
                              onClick={() => removeImage(tweet.id)}
                              className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/10 flex-wrap">
                        <button
                          onClick={() => setQueueModalForId(tweet.id)}
                          className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/50 hover:border-primary/40 transition-colors px-2 py-1 text-xs"
                        >
                          <Clock className="w-3 h-3" />
                          {tweet.scheduledAt ? formatScheduleDisplay(tweet.scheduledAt) : "Set time"}
                        </button>

                        <div className="ml-auto flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-primary hover:text-primary/80 hover:bg-primary/5"
                            onClick={() => setShowVault(showVault === tweet.id ? null : tweet.id)}
                          >
                            <ImageIcon className="w-3 h-3 mr-1" />
                            {tweet.imageUrl ? "Change Media" : "Attach Media"}
                          </Button>
                          {tweet.status === "queued" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-accent/40 text-accent hover:bg-accent/10 gap-1.5"
                              disabled={postingNowId === tweet.id}
                              onClick={() => handleQueuePostNow(tweet)}
                            >
                              {postingNowId === tweet.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Zap className="w-3 h-3" />
                              )}
                              Post Now
                            </Button>
                          )}
                          {tweet.status === "failed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-red-400/40 text-red-400 hover:bg-red-400/10 gap-1.5"
                              onClick={() => updateTweetMutation.mutate({ id: tweet.id, status: "queued" })}
                            >
                              <RefreshCw className="w-3 h-3" /> Retry
                            </Button>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {showVault === tweet.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-4 pt-4 border-t border-border/20"
                          >
                            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                              Select from Media Vault
                            </p>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              {isLoadingMedia ? (
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                              ) : mediaItems.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No media in vault.</p>
                              ) : (
                                mediaItems.map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => attachImage(tweet.id, item.url)}
                                    className="w-20 h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary shrink-0 transition-all active:scale-95"
                                  >
                                    <img src={item.url} className="w-full h-full object-cover" alt="Vault thumbnail" />
                                  </button>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ))
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <Card className="p-5 glass-panel bg-secondary/10">
            <h3 className="font-display font-medium mb-3 text-sm uppercase tracking-wider text-muted-foreground">
              Queue Status
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Queued</span>
                <span className="font-mono text-primary font-medium">
                  {tweets.filter((t) => t.status === "queued").length}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Total in library</span>
                <span className="font-mono font-medium">{tweets.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Next scheduled</span>
                <span className="font-mono text-accent font-medium text-xs">
                  {(() => {
                    const scheduled = tweets
                      .filter((t) => t.scheduledAt && t.status === "queued")
                      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
                    if (scheduled.length === 0) return "None";
                    return new Date(scheduled[0].scheduledAt!).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  })()}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5 glass-panel border-border/30">
            <h3 className="font-display font-medium mb-3 text-sm uppercase tracking-wider text-muted-foreground">
              Platform Limits
            </h3>
            <div className="space-y-3">
              {(["x", "threads"] as const).map((p) => (
                <div key={p} className="flex items-center justify-between">
                  <PlatformBadge platform={p} showLabel size="sm" />
                  <span className="text-xs font-mono text-muted-foreground">
                    {p === "x" ? "280" : "500"} chars
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 glass-panel border-accent/20">
            <h3 className="font-display font-medium mb-2 text-sm uppercase tracking-wider text-accent">
              Safety Filter Active
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Content is filtered for platform compliance. Soft dominance and playful teasing maintain engagement while staying within guidelines.
            </p>
          </Card>
        </div>
      </div>

      <DateTimeWheelModal
        open={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        onSchedule={(iso) => setDraftSchedule(iso)}
        onPostNow={handlePostNowDraft}
        initialISO={draftSchedule || undefined}
      />

      {queueTweetForModal && (
        <DateTimeWheelModal
          open={queueModalForId !== null}
          onClose={() => setQueueModalForId(null)}
          onSchedule={(iso) => {
            updateTweetMutation.mutate({ id: queueTweetForModal.id, scheduledAt: iso });
            toast({ title: "Rescheduled", description: `Set to ${formatScheduleDisplay(iso)}` });
          }}
          onPostNow={() => handleQueuePostNow(queueTweetForModal)}
          initialISO={queueTweetForModal.scheduledAt || undefined}
        />
      )}
    </div>
  );
}
