import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageSquare, RefreshCw, Send, SkipForward, Pencil, Check,
  Wand2, AlertTriangle, Users, Repeat2, Pause, Play,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import {
  useLiveCommentThreads, useLiveFollowerInteractions, useEngagementStatus,
  useEngagementSSE, useGenerateEngagementReply, useSendEngagementReply,
  usePauseEngagement, useResumeEngagement, useExtensionStatus,
} from "@/lib/hooks";
import type { CommentThread } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { PlatformBadge } from "@/components/platform/PlatformBadge";
import { ReplyViaExtension } from "@/lib/extensionBridge";
import { apiRequest } from "@/lib/queryClient";
import type { Platform } from "@/types/platform";
import { usePlatform } from "@/contexts/PlatformContext";

type InboxFilter = "all" | "x" | "threads";

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

function formatTime(date: Date | string | null) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function interactionIcon(type: string) {
  if (type === "follow") return <Users size={11} className="text-accent" />;
  if (type === "retweet") return <Repeat2 size={11} className="text-blue-400" />;
  return <Heart size={11} className="text-pink-400" />;
}

function interactionLabel(type: string) {
  if (type === "follow") return "followed you";
  if (type === "retweet") return "retweeted";
  return "liked";
}

function LastUpdated({ lastPollAt }: { lastPollAt: string | null }) {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceRender((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);
  if (!lastPollAt) return null;
  return <span className="text-[11px] text-muted-foreground/50">Updated {formatTime(lastPollAt)}</span>;
}

export default function UnifiedInbox() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { selectedPlatform } = usePlatform();
  const [filter, setFilter] = useState<InboxFilter>("all");

  // Sync internal filter with global platform context
  useEffect(() => {
    setFilter(selectedPlatform as InboxFilter);
  }, [selectedPlatform]);

  const [customPrompt, setCustomPrompt] = useState("");
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const isExtensionConnected = useExtensionStatus();

  useEngagementSSE();

  const { data: threadsData, isLoading: loadingThreads, error: threadsError, refetch } = useLiveCommentThreads(filter);
  const { data: interactionsData, isLoading: loadingInteractions } = useLiveFollowerInteractions(filter);
  const { data: status } = useEngagementStatus();
  const generateReply = useGenerateEngagementReply();
  const sendReply = useSendEngagementReply();
  const pauseEngine = usePauseEngagement();
  const resumeEngine = useResumeEngagement();

  const updateCard = useCallback((id: string, updates: Partial<CardState>) => {
    setCardStates((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_CARD), ...updates } }));
  }, []);

  const handleGenerate = useCallback(
    (thread: CommentThread) => {
      updateCard(thread.id, { isGenerating: true });
      generateReply.mutate(
        { parentTweetText: thread.parentTweetText, commentText: thread.lastCommentText, customPrompt: customPrompt.trim() || undefined },
        {
          onSuccess: (data) =>
            updateCard(thread.id, { generatedReply: data.reply, editedReply: data.reply, sentiment: data.sentiment, isGenerating: false }),
          onError: (err: any) => {
            toast({ title: "Generation failed", description: err.message, variant: "destructive" });
            updateCard(thread.id, { isGenerating: false });
          },
        },
      );
    },
    [customPrompt, generateReply, updateCard, toast],
  );

  const handleRegenerate = useCallback(
    (thread: CommentThread) => {
      updateCard(thread.id, { isGenerating: true });
      generateReply.mutate(
        { parentTweetText: thread.parentTweetText, commentText: thread.lastCommentText, customPrompt: customPrompt.trim() || undefined },
        {
          onSuccess: (data) =>
            updateCard(thread.id, { generatedReply: data.reply, editedReply: data.reply, isEditing: false, isGenerating: false }),
          onError: (err: any) => {
            toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
            updateCard(thread.id, { isGenerating: false });
          },
        },
      );
    },
    [customPrompt, generateReply, updateCard, toast],
  );

  const handleApprove = useCallback(
    (thread: CommentThread) => {
      const card = cardStates[thread.id] ?? EMPTY_CARD;
      const replyText = card.editedReply || card.generatedReply;
      if (!replyText) return;
      updateCard(thread.id, { isSending: true });
      sendReply.mutate(
        { commentId: thread.lastCommentId, threadId: thread.id, replyText, platform: thread.platform ?? "x" },
        {
          onSuccess: () => {
            updateCard(thread.id, { isSent: true, isSending: false });
            setTimeout(() => qc.invalidateQueries({ queryKey: ["/api/engagement/live-comments"] }), 1500);
          },
          onError: (err: any) => {
            toast({ title: "Failed to send", description: err.message, variant: "destructive" });
            updateCard(thread.id, { isSending: false });
          },
        },
      );
    },
    [cardStates, sendReply, updateCard, toast, qc],
  );

  const handleReplyWithExtension = useCallback(
    async (thread: CommentThread) => {
      const card = cardStates[thread.id] ?? EMPTY_CARD;
      const replyText = card.editedReply || card.generatedReply;
      if (!replyText) return;

      const platform = thread.platform || "x";
      if (platform !== "x") {
        toast({ title: "Not supported", description: "Extension reply currently only supported for X.", variant: "destructive" });
        return;
      }

      const tweetUrl = `https://x.com/${thread.lastCommentAuthor.replace("@", "")}/status/${thread.lastCommentId}`;

      updateCard(thread.id, { isSending: true });
      try {
        await ReplyViaExtension(replyText, tweetUrl);

        // Log activity
        await apiRequest("POST", "/api/activity-logs", {
          type: "reply",
          platform: "x",
          content: replyText,
          status: "success",
          metadata: { via: "extension", threadId: thread.id }
        });

        updateCard(thread.id, { isSent: true, isSending: false });
        toast({ title: "Sent to Extension", description: "Follow instructions in the new tab to reply." });
        setTimeout(() => qc.invalidateQueries({ queryKey: ["/api/engagement/live-comments"] }), 1500);
      } catch (err: any) {
        toast({ title: "Extension failed", description: err.message, variant: "destructive" });
        updateCard(thread.id, { isSending: false });
      }
    },
    [cardStates, updateCard, toast, qc]
  );

  const allThreads = threadsData?.threads ?? [];
  const filteredThreads = allThreads.filter((t) => !(cardStates[t.id]?.isSkipped));
  const interactions = interactionsData?.interactions ?? [];
  const isLive = status?.running ?? false;
  const isPaused = status?.paused ?? false;
  const hasCredentials = status?.hasCredentials ?? false;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Unified Inbox</h1>
          <p className="text-muted-foreground mt-1">
            AI-assisted replies across all your connected platforms.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 bg-secondary/20">
            {hasCredentials && !isPaused ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">Live</span>
              </>
            ) : hasCredentials && isPaused ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-medium text-amber-400">Paused</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <span className="text-xs text-muted-foreground">No Credentials</span>
              </>
            )}
          </div>
          {hasCredentials && (
            <Button
              variant="outline"
              size="sm"
              className="border-border/40 gap-2"
              onClick={() => (isPaused ? resumeEngine.mutate() : pauseEngine.mutate())}
              disabled={pauseEngine.isPending || resumeEngine.isPending}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {isPaused ? "Resume" : "Pause"}
            </Button>
          )}
          <button onClick={() => refetch()} className="text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Platform filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/30 border border-border/40 w-fit">
        {(["all", "x", "threads"] as InboxFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              filter === f
                ? "bg-primary/20 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? (
              "All"
            ) : (
              <>
                <PlatformBadge platform={f as Platform} size="xs" />
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main feed */}
        <div className="lg:col-span-2 space-y-5">

          {/* Custom prompt */}
          <Card className="glass-panel p-4 border-border/40 space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <Wand2 size={11} className="text-primary" />
              Reply Style Instructions
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

          {/* Feed header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-accent" />
              {filter === "all" ? "All Messages" : filter === "x" ? "X Comments" : "Threads Messages"}
              {filteredThreads.length > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-1">{filteredThreads.length}</Badge>
              )}
            </h2>
            <LastUpdated lastPollAt={status?.lastPollAt ?? null} />
          </div>

          {/* Threads empty state */}
          {filter === "threads" && (
            <Card className="p-10 glass-panel border-border/40 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-secondary/50 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">No Threads messages yet</p>
              <p className="text-muted-foreground/60 text-xs max-w-xs mx-auto">
                Connect your Threads account in Settings to start receiving and replying to messages here.
              </p>
            </Card>
          )}

          {/* Error state */}
          {threadsError && filter !== "threads" && (
            <Card className="p-5 glass-panel border-red-500/20 bg-red-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Could not load messages</p>
                  <p className="text-xs text-muted-foreground mt-1">{(threadsError as Error).message}</p>
                </div>
              </div>
            </Card>
          )}

          {/* No credentials */}
          {!hasCredentials && !loadingThreads && filter !== "threads" && (
            <Card className="p-8 glass-panel border-border/40 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-400/60" />
              <p className="text-muted-foreground text-sm">
                X credentials are not configured. Add your Twitter API keys in Settings to enable the engagement engine.
              </p>
            </Card>
          )}

          {/* Loading skeletons */}
          {loadingThreads && hasCredentials && filter !== "threads" && (
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

          {/* Empty state */}
          {!loadingThreads && !threadsError && hasCredentials && filteredThreads.length === 0 && filter !== "threads" && (
            <p className="text-center py-12 text-muted-foreground text-sm">
              No messages need attention right now. New replies will appear here automatically.
            </p>
          )}

          {/* Message cards */}
          <AnimatePresence>
            {filteredThreads.map((thread, i) => {
              const card = cardStates[thread.id] ?? EMPTY_CARD;
              const hasReply = !!card.generatedReply;

              return (
                <motion.div
                  key={thread.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card className="p-5 glass-panel border-border/40 hover:border-accent/30 transition-colors">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                          {thread.lastCommentAuthorName?.charAt(0)?.toUpperCase() ??
                            thread.lastCommentAuthor?.charAt(1)?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm">
                              {thread.lastCommentAuthorName || thread.lastCommentAuthor}
                            </p>
                            <PlatformBadge platform={thread.platform as Platform} size="xs" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {thread.lastCommentAuthor} · {formatTime(thread.lastCommentAt)}
                          </p>
                        </div>
                      </div>
                      {card.isSent ? (
                        <Badge className="text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border-emerald-400/30">
                          <Check size={10} className="mr-1" /> Sent
                        </Badge>
                      ) : card.sentiment ? (
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${sentimentColor(card.sentiment)}`}>
                          {card.sentiment}
                        </Badge>
                      ) : null}
                    </div>

                    {/* Context */}
                    {thread.parentTweetText && (
                      <div className="pl-10 mb-2">
                        <p className="text-[11px] text-muted-foreground/60 italic truncate">
                          ↳ Your post: {thread.parentTweetText}
                        </p>
                      </div>
                    )}

                    {/* Comment */}
                    <div className="pl-10 mb-4">
                      <p className="text-sm text-foreground/80 border-l-2 border-border/50 pl-3 py-1">
                        {thread.lastCommentText}
                      </p>
                    </div>

                    {/* Reply area */}
                    <div className="pl-10 space-y-3">
                      {!hasReply && !card.isGenerating && !card.isSent && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleGenerate(thread)}
                        >
                          <MessageSquare size={13} />
                          Generate Reply
                        </Button>
                      )}

                      {card.isGenerating && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                          <RefreshCw size={13} className="animate-spin text-primary" />
                          Generating reply…
                        </div>
                      )}

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
                                  onChange={(e) => { updateCard(thread.id, { editedReply: e.target.value }); autoExpand(e.target); }}
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

                          {!card.isSent && (
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-muted-foreground hover:text-foreground gap-1.5"
                                onClick={() => updateCard(thread.id, { isEditing: !card.isEditing })}
                              >
                                {card.isEditing ? <><Check size={12} /> Save</> : <><Pencil size={12} /> Edit</>}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-muted-foreground hover:text-foreground gap-1.5"
                                onClick={() => handleRegenerate(thread)}
                                disabled={card.isGenerating}
                              >
                                <RefreshCw size={12} /> Regenerate
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-border/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 gap-1.5"
                                onClick={() => updateCard(thread.id, { isSkipped: true })}
                              >
                                <SkipForward size={12} /> Skip
                              </Button>
                              <div className="flex gap-2 ml-auto">
                                {isExtensionConnected && thread.platform === "x" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
                                    onClick={() => handleReplyWithExtension(thread)}
                                    disabled={card.isSending}
                                    data-testid={`button-reply-extension-${thread.id}`}
                                  >
                                    {card.isSending ? (
                                      <RefreshCw size={12} className="animate-spin" />
                                    ) : (
                                      <Sparkles size={12} />
                                    )}
                                    Reply with Extension
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  className="h-8 bg-accent/20 text-accent hover:bg-accent/30 gap-1.5"
                                  onClick={() => handleApprove(thread)}
                                  disabled={card.isSending}
                                >
                                  {card.isSending ? (
                                    <><RefreshCw size={12} className="animate-spin" /> Sending…</>
                                  ) : (
                                    <><Send size={12} /> Approve & Send</>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {!hasReply && !card.isGenerating && !card.isSent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground/60 hover:text-muted-foreground gap-1"
                          onClick={() => updateCard(thread.id, { isSkipped: true })}
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

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-5 glass-panel bg-primary/5 border-primary/20">
            <h3 className="font-display font-medium mb-4 text-sm uppercase tracking-wider text-primary flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Recent Interactions
            </h3>
            <div className="space-y-3">
              {loadingInteractions ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                ))
              ) : interactions.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 py-2">
                  {hasCredentials
                    ? "No recent interactions in the last 7 days."
                    : "Connect X credentials to see live interactions."}
                </p>
              ) : (
                interactions.slice(0, 20).map((interaction) => (
                  <div key={interaction.id} className="flex justify-between items-center text-xs gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {interactionIcon(interaction.type)}
                      <span className="font-medium text-foreground truncate">{interaction.username}</span>
                      <span className="text-muted-foreground shrink-0">{interactionLabel(interaction.type)}</span>
                    </div>
                    <span className="text-muted-foreground/50 shrink-0 text-[10px]">
                      {formatTime(interaction.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5 glass-panel bg-secondary/10">
            <h3 className="font-display font-medium mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Engine Status
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-medium ${isLive ? "text-emerald-400" : isPaused ? "text-amber-400" : "text-muted-foreground"}`}>
                  {isLive ? "Running" : isPaused ? "Paused" : "Idle"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Pending replies</span>
                <span className="font-mono">{filteredThreads.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Interactions (48h)</span>
                <span className="font-mono">{interactions.length}</span>
              </div>
              {status?.error && (
                <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                  <p className="text-[10px] text-red-400 leading-snug">{status.error}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5 glass-panel border-border/30">
            <h3 className="font-display font-medium mb-3 text-sm uppercase tracking-wider text-muted-foreground">
              Connected Platforms
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <PlatformBadge platform="x" showLabel size="sm" />
                <span className={`text-xs font-medium ${hasCredentials ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {hasCredentials ? "Active" : "Not connected"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <PlatformBadge platform="threads" showLabel size="sm" />
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
