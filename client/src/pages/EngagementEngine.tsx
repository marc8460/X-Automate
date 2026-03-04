import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Heart, Play, Pause, MessageSquare, RefreshCw,
  Send, SkipForward, Pencil, Check, Wand2, AlertTriangle,
  Twitter,
} from "lucide-react";
import { useState, useCallback } from "react";
import {
  useFollowerInteractions,
  useEngagements,
  useFetchXComments,
  useGenerateEngagementReply,
  useSendEngagementReply,
  type XComment,
} from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { Badge as SentimentBadge } from "@/components/ui/badge";

type CardState = {
  generatedReply: string;
  editedReply: string;
  isEditing: boolean;
  isSent: boolean;
  isSkipped: boolean;
  isGenerating: boolean;
  isSending: boolean;
  sentiment: string;
};

const EMPTY_CARD: CardState = {
  generatedReply: "",
  editedReply: "",
  isEditing: false,
  isSent: false,
  isSkipped: false,
  isGenerating: false,
  isSending: false,
  sentiment: "",
};

const promptTextareaClass =
  "w-full bg-secondary/30 border border-border/50 rounded-md px-3 py-2 text-sm " +
  "placeholder:text-muted-foreground/40 resize-none overflow-hidden leading-snug " +
  "focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 " +
  "focus:shadow-[0_0_14px_hsl(288deg_100%_65%/0.12)] transition-all duration-150";

function autoExpand(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function sentimentColor(s: string) {
  if (s === "positive") return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
  if (s === "negative") return "text-red-400 border-red-400/30 bg-red-400/10";
  return "text-muted-foreground border-border/40";
}

function formatTime(iso: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function EngagementEngine() {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});

  const { data: xData, isLoading: loadingComments, error: commentsError, refetch } =
    useFetchXComments(isActive);
  const generateReply = useGenerateEngagementReply();
  const sendReply = useSendEngagementReply();
  const { data: interactions, isLoading: loadingInteractions } = useFollowerInteractions();

  const updateCard = useCallback((id: string, updates: Partial<CardState>) => {
    setCardStates(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? EMPTY_CARD), ...updates },
    }));
  }, []);

  const handleGenerate = useCallback((comment: XComment) => {
    updateCard(comment.commentId, { isGenerating: true });
    generateReply.mutate(
      {
        parentTweetText: comment.parentTweetText,
        commentText: comment.commentText,
        customPrompt: customPrompt.trim() || undefined,
      },
      {
        onSuccess: (data) =>
          updateCard(comment.commentId, {
            generatedReply: data.reply,
            editedReply: data.reply,
            sentiment: data.sentiment,
            isGenerating: false,
          }),
        onError: (err: any) => {
          toast({ title: "Generation failed", description: err.message, variant: "destructive" });
          updateCard(comment.commentId, { isGenerating: false });
        },
      }
    );
  }, [customPrompt, generateReply, updateCard, toast]);

  const handleRegenerate = useCallback((comment: XComment) => {
    updateCard(comment.commentId, { isGenerating: true });
    generateReply.mutate(
      {
        parentTweetText: comment.parentTweetText,
        commentText: comment.commentText,
        customPrompt: customPrompt.trim() || undefined,
      },
      {
        onSuccess: (data) =>
          updateCard(comment.commentId, {
            generatedReply: data.reply,
            editedReply: data.reply,
            isEditing: false,
            isGenerating: false,
          }),
        onError: (err: any) => {
          toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
          updateCard(comment.commentId, { isGenerating: false });
        },
      }
    );
  }, [customPrompt, generateReply, updateCard, toast]);

  const handleApprove = useCallback((comment: XComment) => {
    const card = cardStates[comment.commentId] ?? EMPTY_CARD;
    const replyText = card.editedReply || card.generatedReply;
    if (!replyText) return;
    updateCard(comment.commentId, { isSending: true });
    sendReply.mutate(
      { commentId: comment.commentId, replyText },
      {
        onSuccess: () => updateCard(comment.commentId, { isSent: true, isSending: false }),
        onError: (err: any) => {
          toast({ title: "Failed to send", description: err.message, variant: "destructive" });
          updateCard(comment.commentId, { isSending: false });
        },
      }
    );
  }, [cardStates, sendReply, updateCard, toast]);

  const xComments = xData?.comments ?? [];
  const visibleComments = xComments.filter(c => !(cardStates[c.commentId]?.isSkipped));

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Engagement Engine</h1>
          <p className="text-muted-foreground mt-1">
            AI-assisted replies to real comments on your X posts.
          </p>
        </div>
        <Button
          variant={isActive ? "outline" : "default"}
          className={isActive ? "border-primary text-primary hover:bg-primary/10" : "bg-primary text-white"}
          onClick={() => {
            if (!isActive) {
              setIsActive(true);
            } else {
              setIsActive(false);
            }
          }}
          data-testid="button-toggle-engine"
        >
          {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {isActive ? "Pause Engine" : "Start Engine"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-5">

          {/* Custom Prompt Box */}
          <Card className="glass-panel p-4 border-border/40 space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <Wand2 size={11} className="text-primary" />
              Reply Style Instructions{" "}
              <span className="font-normal opacity-60">(optional — applies to all generated replies)</span>
            </label>
            <textarea
              rows={1}
              value={customPrompt}
              onChange={(e) => { setCustomPrompt(e.target.value); autoExpand(e.target); }}
              onInput={(e) => autoExpand(e.currentTarget as HTMLTextAreaElement)}
              placeholder="Example: confident but playful founder energy"
              className={promptTextareaClass}
              style={{ minHeight: "36px" }}
            />
          </Card>

          {/* Feed Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <Search className="w-5 h-5 text-accent" />
              Live X Comments
            </h2>
            <div className="flex items-center gap-3">
              {isActive && (
                <button
                  onClick={() => refetch()}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              )}
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isActive ? "bg-accent animate-pulse" : "bg-muted-foreground/40"}`} />
                {isActive ? "Scanning for conversations..." : "Engine paused"}
              </div>
            </div>
          </div>

          {/* Comment Cards */}
          <div className="space-y-4">
            {/* Not started */}
            {!isActive && !loadingComments && (
              <div className="text-center py-16 space-y-3">
                <Twitter className="w-10 h-10 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">
                  Click <span className="text-primary font-medium">Start Engine</span> to load live comments from your X posts.
                </p>
              </div>
            )}

            {/* Loading */}
            {isActive && loadingComments && (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="p-5 glass-panel border-border/40">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="pl-10 mb-4">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="pl-10">
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                </Card>
              ))
            )}

            {/* Error */}
            {isActive && commentsError && (
              <Card className="p-5 glass-panel border-red-500/20 bg-red-500/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Could not connect to X</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(commentsError as Error).message}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Empty */}
            {isActive && !loadingComments && !commentsError && visibleComments.length === 0 && (
              <p className="text-center py-12 text-muted-foreground text-sm">
                No recent comments found on your X posts.
              </p>
            )}

            {/* Comment cards */}
            <AnimatePresence>
              {visibleComments.map((comment, i) => {
                const card = cardStates[comment.commentId] ?? EMPTY_CARD;
                const hasReply = !!card.generatedReply;

                return (
                  <motion.div
                    key={comment.commentId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Card className="p-5 glass-panel border-border/40 hover:border-accent/30 transition-colors">
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                            {comment.commentAuthor.charAt(1)?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{comment.commentAuthor}</p>
                            <p className="text-xs text-muted-foreground">{formatTime(comment.createdAt)}</p>
                          </div>
                        </div>
                        {card.isSent ? (
                          <Badge className="text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border-emerald-400/30">
                            <Check size={10} className="mr-1" /> Sent
                          </Badge>
                        ) : card.sentiment ? (
                          <SentimentBadge variant="outline" className={`text-[10px] uppercase tracking-wider ${sentimentColor(card.sentiment)}`}>
                            {card.sentiment}
                          </SentimentBadge>
                        ) : null}
                      </div>

                      {/* Parent tweet context */}
                      {comment.parentTweetText && (
                        <div className="pl-10 mb-2">
                          <p className="text-[11px] text-muted-foreground/60 italic truncate">
                            ↳ Your post: {comment.parentTweetText}
                          </p>
                        </div>
                      )}

                      {/* Comment text */}
                      <div className="pl-10 mb-4">
                        <p className="text-sm text-foreground/80 border-l-2 border-border/50 pl-3 py-1">
                          {comment.commentText}
                        </p>
                      </div>

                      {/* Reply area */}
                      <div className="pl-10 space-y-3">
                        {/* No reply yet */}
                        {!hasReply && !card.isGenerating && !card.isSent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleGenerate(comment)}
                          >
                            <MessageSquare size={13} />
                            Generate Reply
                          </Button>
                        )}

                        {/* Generating */}
                        {card.isGenerating && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                            <RefreshCw size={13} className="animate-spin text-primary" />
                            Generating reply…
                          </div>
                        )}

                        {/* Reply bubble */}
                        {hasReply && !card.isGenerating && (
                          <>
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 relative">
                              <div className="absolute -left-2 top-4 w-2 h-2 bg-primary/30 rotate-45" />
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                {card.isEditing ? (
                                  <textarea
                                    className={`${promptTextareaClass} bg-transparent border-0 p-0 focus:ring-0 flex-1 text-sm`}
                                    value={card.editedReply}
                                    onChange={(e) => {
                                      updateCard(comment.commentId, { editedReply: e.target.value });
                                      autoExpand(e.target);
                                    }}
                                    onInput={(e) => autoExpand(e.currentTarget as HTMLTextAreaElement)}
                                    autoFocus
                                    style={{ minHeight: "20px" }}
                                  />
                                ) : (
                                  <p className="text-sm text-primary-foreground font-medium flex-1">
                                    {card.editedReply || card.generatedReply}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            {!card.isSent && (
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-muted-foreground hover:text-foreground gap-1.5"
                                  onClick={() => updateCard(comment.commentId, { isEditing: !card.isEditing })}
                                >
                                  {card.isEditing ? (
                                    <><Check size={12} /> Save</>
                                  ) : (
                                    <><Pencil size={12} /> Edit</>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-muted-foreground hover:text-foreground gap-1.5"
                                  onClick={() => handleRegenerate(comment)}
                                  disabled={card.isGenerating}
                                >
                                  <RefreshCw size={12} />
                                  Regenerate
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-border/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 gap-1.5"
                                  onClick={() => updateCard(comment.commentId, { isSkipped: true })}
                                >
                                  <SkipForward size={12} />
                                  Skip
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 bg-accent/20 text-accent hover:bg-accent/30 gap-1.5 ml-auto"
                                  onClick={() => handleApprove(comment)}
                                  disabled={card.isSending}
                                >
                                  {card.isSending ? (
                                    <><RefreshCw size={12} className="animate-spin" /> Sending…</>
                                  ) : (
                                    <><Send size={12} /> Approve & Send</>
                                  )}
                                </Button>
                              </div>
                            )}
                          </>
                        )}

                        {/* No-reply skip button */}
                        {!hasReply && !card.isGenerating && !card.isSent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground/60 hover:text-muted-foreground gap-1"
                            onClick={() => updateCard(comment.commentId, { isSkipped: true })}
                          >
                            <SkipForward size={11} /> Skip
                          </Button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-5 glass-panel bg-primary/5 border-primary/20">
            <h3 className="font-display font-medium mb-4 text-sm uppercase tracking-wider text-primary flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Follower Interactions
            </h3>
            <div className="space-y-4">
              {loadingInteractions ? (
                Array(2).fill(0).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))
              ) : (
                interactions?.map((interaction) => (
                  <div key={interaction.id} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-medium text-foreground">{interaction.user}</span>
                      <span className="text-muted-foreground ml-2">{interaction.action}</span>
                    </div>
                    <span className="text-muted-foreground/60">{interaction.time}</span>
                  </div>
                ))
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-[10px] h-7 border-dashed"
                data-testid="button-set-auto-response"
              >
                Set Auto-Response
              </Button>
            </div>
          </Card>

          <Card className="p-5 glass-panel bg-secondary/10">
            <h3 className="font-display font-medium mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Target Keywords
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {["coding", "tech", "startup", "tired", "gym", "lonely", "building"].map((kw) => (
                <Badge key={kw} variant="secondary" className="bg-background border-border/50">
                  {kw}
                </Badge>
              ))}
            </div>
            <div className="space-y-3 mt-6 border-t border-border/50 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Daily Cap</span>
                <span className="font-mono text-sm">45 / 100</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
