import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Save, RefreshCw, Send, CheckCircle2, Image as ImageIcon, X, Plus, Loader2, Wand2, Trash2, Clock } from "lucide-react";
import { useTweets, useCreateTweet, useUpdateTweet, useDeleteTweet, useMediaItems, useGenerateTweets } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";

const TWEET_STYLES = [
  "Engagement Bait",
  "Direct Question",
  "Soft Tease",
  "Viral Hook",
  "Community Love"
];

function getQuickTimes() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const dayAfter = new Date(today.getTime() + 2 * 86400000);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}`;
  };

  const label = (d: Date) => {
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
    const isTomorrow = d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth();
    const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : d.toLocaleDateString([], { weekday: "short" });
    return `${dayLabel} ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  };

  const hours = [9, 12, 15, 18, 21, 23];
  const slots: { label: string; value: string }[] = [];

  for (const base of [today, tomorrow, dayAfter]) {
    for (const h of hours) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, 0);
      if (d.getTime() > now.getTime()) {
        slots.push({ label: label(d), value: fmt(d) });
      }
      if (slots.length >= 12) break;
    }
    if (slots.length >= 12) break;
  }
  return slots;
}

function SchedulePicker({ value, onChange, size = "sm" }: { value: string; onChange: (v: string) => void; size?: "sm" | "md" }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const quickTimes = getQuickTimes();
  const isSm = size === "sm";

  const displayLabel = value
    ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropH = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < dropH ? rect.top - dropH : rect.bottom + 4;
      setPos({ top, left: rect.left });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-md border border-border/50 bg-background/50 hover:border-primary/40 transition-colors ${isSm ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"}`}
        data-testid="button-schedule-picker"
      >
        <Clock className={isSm ? "w-3 h-3" : "w-4 h-4"} />
        {displayLabel || (isSm ? "Schedule" : "Set post time")}
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={dropRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-56 bg-card border border-border/50 rounded-lg shadow-2xl p-2 space-y-1 max-h-80 overflow-y-auto"
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pt-1 pb-1">Quick pick</p>
          {quickTimes.map((slot) => (
            <button
              key={slot.value}
              onClick={() => { onChange(slot.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${value === slot.value ? "bg-primary/20 text-primary" : "hover:bg-secondary/50 text-foreground"}`}
            >
              {slot.label}
            </button>
          ))}
          <div className="border-t border-border/30 pt-2 mt-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1">Custom</p>
            <input
              type="datetime-local"
              value={value}
              onChange={(e) => { onChange(e.target.value); setOpen(false); }}
              className="w-full bg-background/50 border border-border/50 rounded-md px-2 py-1 text-xs"
            />
          </div>
          {value && (
            <button
              onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs rounded-md text-red-400 hover:bg-red-400/10 transition-colors"
            >
              Clear schedule
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

export default function ContentEngine() {
  const [selectedStyle, setSelectedStyle] = useState(TWEET_STYLES[0]);
  const [showVault, setShowVault] = useState<number | null>(null);
  const [draftText, setDraftText] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [seductiveness, setSeductiveness] = useState(75);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [draftSchedule, setDraftSchedule] = useState("");
  const hasAutoGenerated = useRef(false);
  const { toast } = useToast();

  const { data: tweets = [], isLoading: isLoadingTweets } = useTweets();
  const { data: mediaItems = [], isLoading: isLoadingMedia } = useMediaItems();
  const createTweetMutation = useCreateTweet();
  const updateTweetMutation = useUpdateTweet();
  const deleteTweetMutation = useDeleteTweet();
  const generateMutation = useGenerateTweets();

  useEffect(() => {
    if (hasAutoGenerated.current) return;
    const params = new URLSearchParams(window.location.search);
    const imageUrl = params.get("imageUrl");
    const mood = params.get("mood");
    const outfit = params.get("outfit");
    if (imageUrl) {
      setAttachedImage(imageUrl);
      const themeParts = [mood, outfit].filter(Boolean);
      const topic = themeParts.length > 0 ? `photo caption for a ${themeParts.join(", ").toLowerCase()} vibe` : "photo caption";
      setTopicInput(topic);
      hasAutoGenerated.current = true;
      window.history.replaceState({}, "", "/content");
      generateMutation.mutate(
        { style: selectedStyle, topic, seductiveness, imageUrl: imageUrl || undefined },
        {
          onSuccess: (data) => {
            setSuggestions(data.tweets || []);
            toast({ title: "Captions generated", description: `${(data.tweets || []).length} caption ideas for your photo.` });
          },
          onError: (err: any) => {
            toast({ title: "Generation failed", description: err.message, variant: "destructive" });
          },
        }
      );
    }
  }, []);

  const handleGenerate = async () => {
    generateMutation.mutate(
      { style: selectedStyle, topic: topicInput || undefined, seductiveness, imageUrl: attachedImage || undefined },
      {
        onSuccess: (data) => {
          setSuggestions(data.tweets || []);
          toast({ title: "Generated", description: `${(data.tweets || []).length} tweet ideas ready.` });
        },
        onError: (err: any) => {
          toast({ title: "Generation failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleSaveDraft = async () => {
    if (!draftText.trim()) return;
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
    toast({ title: "Saved", description: draftSchedule ? `Tweet scheduled for ${draftSchedule}.` : "Tweet added to queue." });
  };

  const selectSuggestion = (text: string) => {
    setDraftText(text);
    setSuggestions([]);
  };

  const attachImage = (tweetId: number, imageUrl: string) => {
    updateTweetMutation.mutate({ id: tweetId, imageUrl });
    setShowVault(null);
  };

  const removeImage = (tweetId: number) => {
    updateTweetMutation.mutate({ id: tweetId, imageUrl: null });
  };

  const handleUpdateStatus = (tweetId: number, status: string) => {
    updateTweetMutation.mutate({ id: tweetId, status });
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight" data-testid="text-content-title">Content Engine</h1>
        <p className="text-muted-foreground mt-1">Generate, refine, and schedule your daily tweets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
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
                  data-testid="input-topic"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 block">Target Style</label>
                <div className="flex flex-wrap gap-2">
                  {TWEET_STYLES.map(style => (
                    <Badge
                      key={style}
                      variant={selectedStyle === style ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${selectedStyle === style ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:border-primary/50'}`}
                      onClick={() => setSelectedStyle(style)}
                      data-testid={`badge-style-${style.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-muted-foreground">Seductiveness / Playfulness</label>
                  <span className="text-xs text-primary font-mono" data-testid="text-seductiveness-value">{seductiveness}%</span>
                </div>
                <Slider
                  value={[seductiveness]}
                  onValueChange={(v) => setSeductiveness(v[0])}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:border-primary [&_[role=slider]]:bg-primary"
                  data-testid="slider-seductiveness"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0"
                data-testid="button-generate"
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
                  <Button variant="ghost" size="sm" onClick={() => setSuggestions([])} data-testid="button-clear-suggestions">
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
                        onClick={() => selectSuggestion(text)}
                        data-testid={`card-suggestion-${i}`}
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

          <Card className="p-6 glass-panel border-border/30">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Save className="w-4 h-4" />
              Draft Editor
            </h3>
            {attachedImage && (
              <div className="relative mb-4 inline-block">
                <img src={attachedImage} alt="Attached" className="w-32 h-32 object-cover rounded-lg border border-border/50" data-testid="img-draft-attached" />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-2 -right-2 p-1 bg-black/70 rounded-full text-white hover:bg-black/90 transition-colors"
                  data-testid="button-remove-draft-image"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <Textarea
              placeholder="Write or paste a tweet idea here..."
              className="bg-background/50 border-border/50 resize-none h-24 mb-4"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              data-testid="input-tweet-text"
            />
            <div className="flex items-center gap-3 mb-4">
              <SchedulePicker value={draftSchedule} onChange={setDraftSchedule} size="md" />
              {!draftSchedule && <span className="text-xs text-muted-foreground">No time set</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{draftText.length}/280</span>
              <Button
                onClick={handleSaveDraft}
                disabled={createTweetMutation.isPending || !draftText.trim()}
                className="bg-primary/20 text-primary hover:bg-primary/30"
                data-testid="button-save-draft"
              >
                {createTweetMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {draftSchedule ? "Schedule Tweet" : "Save to Queue"}
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-display font-medium">Tweet Queue</h3>

            {isLoadingTweets ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : tweets.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <p className="text-muted-foreground">No tweets drafted yet. Generate some ideas above!</p>
              </Card>
            ) : (
              [...tweets].sort((a, b) => {
                if (a.scheduledAt && b.scheduledAt) return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
                if (a.scheduledAt && !b.scheduledAt) return -1;
                if (!a.scheduledAt && b.scheduledAt) return 1;
                return 0;
              }).map((tweet, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={tweet.id}
                  className="relative"
                >
                  <Card className="p-4 glass-panel border-border/40 hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-secondary/50 text-muted-foreground" data-testid={`badge-tweet-style-${tweet.id}`}>
                          {tweet.style}
                        </Badge>
                        {tweet.scheduledAt && (
                          <span className="text-xs text-accent flex items-center gap-1" data-testid={`text-schedule-${tweet.id}`}>
                            <Clock className="w-3 h-3" />
                            {new Date(tweet.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {tweet.status === 'posted' ? (
                          <span className="text-green-400 text-xs flex items-center gap-1" data-testid={`status-posted-${tweet.id}`}><CheckCircle2 className="w-3 h-3"/> Posted</span>
                        ) : (
                          <span className="text-accent text-xs flex items-center gap-1" data-testid={`status-queued-${tweet.id}`}>In Queue</span>
                        )}
                        <button
                          onClick={() => {
                            if (confirm("Delete this tweet?")) {
                              deleteTweetMutation.mutate(tweet.id);
                              toast({ title: "Deleted", description: "Tweet removed from queue." });
                            }
                          }}
                          className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                          data-testid={`button-delete-tweet-${tweet.id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <p className="text-foreground text-sm leading-relaxed mb-3" data-testid={`text-tweet-content-${tweet.id}`}>
                          {tweet.text}
                        </p>
                      </div>
                      {tweet.imageUrl && (
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border/50 shrink-0">
                          <img src={tweet.imageUrl} className="w-full h-full object-cover" alt="Attached content" data-testid={`img-tweet-media-${tweet.id}`} />
                          <button
                            onClick={() => removeImage(tweet.id)}
                            className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                            data-testid={`button-remove-image-${tweet.id}`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <SchedulePicker
                        value={tweet.scheduledAt || ""}
                        onChange={(v) => updateTweetMutation.mutate({ id: tweet.id, scheduledAt: v || null })}
                        size="sm"
                      />
                    </div>

                    <div className="flex gap-2 justify-between items-center mt-2 pt-2 border-t border-border/10">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-primary hover:text-primary/80 hover:bg-primary/5"
                        onClick={() => setShowVault(showVault === tweet.id ? null : tweet.id)}
                        data-testid={`button-toggle-vault-${tweet.id}`}
                      >
                        <ImageIcon className="w-3 h-3 mr-1" />
                        {tweet.imageUrl ? "Change Media" : "Attach from Vault"}
                      </Button>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-8 bg-primary/20 text-primary hover:bg-primary/30"
                          onClick={() => handleUpdateStatus(tweet.id, tweet.status === "posted" ? "queued" : "posted")}
                          data-testid={`button-toggle-status-${tweet.id}`}
                        >
                          <Send className="w-3 h-3 mr-1" /> {tweet.status === "posted" ? "Unqueue" : "Queue"}
                        </Button>
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
                          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Select from Media Vault</p>
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {isLoadingMedia ? (
                              <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            ) : mediaItems.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No media available in vault.</p>
                            ) : (
                              mediaItems.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => attachImage(tweet.id, item.url)}
                                  className="w-20 h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary shrink-0 transition-all active:scale-95"
                                  data-testid={`button-select-media-${item.id}`}
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

        <div className="space-y-6">
          <Card className="p-5 glass-panel bg-secondary/10">
            <h3 className="font-display font-medium mb-2 text-sm uppercase tracking-wider text-muted-foreground">Queue Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Scheduled Today</span>
                <span className="font-mono text-primary font-medium" data-testid="text-scheduled-today">{tweets.filter(t => t.status === 'queued').length}/5</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Generated Library</span>
                <span className="font-mono font-medium" data-testid="text-library-count">{tweets.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Next Scheduled</span>
                <span className="font-mono text-accent font-medium" data-testid="text-next-post">
                  {(() => {
                    const scheduled = tweets.filter(t => t.scheduledAt && t.status === 'queued').sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
                    if (scheduled.length === 0) return "None";
                    return new Date(scheduled[0].scheduledAt!).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  })()}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5 glass-panel border-accent/20">
            <h3 className="font-display font-medium mb-2 text-sm uppercase tracking-wider text-accent">Safety Filter Active</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Inappropriate terms are currently being filtered. The system will rely on suggestion, soft dominance, and playful teasing to maintain a professional yet engaging presence.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}