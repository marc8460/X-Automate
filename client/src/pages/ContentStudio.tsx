import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, Calendar, Layers, Loader2, Copy, Check, Image as ImageIcon,
  Link, Sparkles, RefreshCw, Zap, X, CheckCircle2, XCircle,
  Pencil, Clock, Filter, ChevronDown, SlidersHorizontal,
  ArrowUpDown, Send, MoreHorizontal, AlertTriangle, Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMediaItems } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTimeWheelModal } from "@/components/DateTimeWheelModal";
import { PlatformBadge } from "@/components/platform/PlatformBadge";
import Composer from "./Composer";
import type { ContentItem, MediaItem } from "@shared/schema";

type Platform = "x" | "threads" | "both";
type ContentStatus = "idea" | "generated" | "needs_review" | "approved" | "scheduled" | "posting" | "posted" | "failed" | "rejected";
type SortKey = "confidence" | "scheduledAt" | "platform" | "generatedAt";

const PLATFORM_FILTERS = [
  { id: "all", label: "All" },
  { id: "x", label: "X" },
  { id: "threads", label: "Threads" },
  { id: "both", label: "Both" },
] as const;

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "needs_review", label: "Needs Review" },
  { id: "approved", label: "Approved" },
  { id: "scheduled", label: "Scheduled" },
  { id: "posted", label: "Posted" },
  { id: "rejected", label: "Rejected" },
  { id: "failed", label: "Failed" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  generated: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  needs_review: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  scheduled: "bg-primary/10 text-primary border-primary/20",
  posting: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  posted: "bg-green-600/10 text-green-600 border-green-600/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  rejected: "bg-red-400/10 text-red-400 border-red-400/20",
};

function confidenceColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-400";
}

function confidenceBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 60) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-400/10 border-red-400/20";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function useContentItems(filters?: { status?: string; platform?: string }) {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.platform && filters.platform !== "all") params.set("platform", filters.platform);
  const qs = params.toString();
  return useQuery<ContentItem[]>({
    queryKey: ["/api/content-studio/items", qs],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/content-studio/items${qs ? `?${qs}` : ""}`);
      return res.json();
    },
    refetchInterval: 15000,
  });
}

function VaultPickerModal({
  open, onClose, onSelect, mediaItems, selectedId,
}: {
  open: boolean; onClose: () => void; onSelect: (id: number, url: string) => void;
  mediaItems: MediaItem[]; selectedId?: number | null;
}) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[70vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Pick from Media Vault</h3>
            <Button size="sm" variant="ghost" onClick={onClose} data-testid="vault-picker-close">Close</Button>
          </div>
          <div className="overflow-y-auto flex-1">
            {mediaItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-vault-empty">No media in your vault yet.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {mediaItems.map((item: any) => (
                  <button
                    key={item.id}
                    data-testid={`vault-item-${item.id}`}
                    onClick={() => { onSelect(item.id, `/uploads/${item.filename || item.url}`); onClose(); }}
                    className={cn(
                      "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                      selectedId === item.id ? "border-primary" : "border-transparent hover:border-border"
                    )}
                  >
                    <img
                      src={`/uploads/${item.filename || item.url}`}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function GenerationPanel({ onGenerated }: { onGenerated: () => void }) {
  const [platforms, setPlatforms] = useState<Platform>("both");
  const [count, setCount] = useState(10);
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("");
  const [ratio, setRatio] = useState("4:5");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/content-studio/generate-batch", {
        platforms: platforms === "both" ? ["x", "threads"] : [platforms],
        count,
        topic: topic || undefined,
        style: style || undefined,
        ratio,
      });
      const data = await res.json();
      toast({ title: `${data.items?.length || count} items generated`, description: "Review and approve them below." });
      onGenerated();
    } catch (err: any) {
      toast({ title: "Generation failed", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="glass-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles size={16} className="text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm" data-testid="text-gen-title">AI Content Generator</h3>
          <p className="text-xs text-muted-foreground">Generate batch content for review</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 block">Platform</label>
          <div className="flex gap-1">
            {(["x", "threads", "both"] as Platform[]).map((p) => (
              <button
                key={p}
                data-testid={`button-platform-${p}`}
                onClick={() => setPlatforms(p)}
                className={cn(
                  "flex-1 px-2 py-1.5 text-xs font-medium rounded-md border transition-all capitalize",
                  platforms === p
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {p === "both" ? "Both" : p === "x" ? "X" : "Threads"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 block">Count</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="flex-1 accent-primary"
              data-testid="input-count-slider"
            />
            <span className="text-xs font-mono text-muted-foreground w-6 text-right">{count}</span>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 block">Ratio</label>
          <div className="flex gap-1">
            {["4:5", "9:16", "1:1"].map((r) => (
              <button
                key={r}
                data-testid={`button-ratio-${r}`}
                onClick={() => setRatio(r)}
                className={cn(
                  "flex-1 px-2 py-1.5 text-xs font-medium rounded-md border transition-all",
                  ratio === r
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 block">Style</label>
          <Input
            placeholder="e.g. Soft tease, Bold..."
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="h-8 text-xs"
            data-testid="input-style"
          />
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 block">Topic / Hint (optional)</label>
          <Input
            placeholder="What should the content be about?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="text-sm"
            data-testid="input-topic"
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2 shrink-0"
          data-testid="button-generate"
        >
          {isGenerating ? (
            <><Loader2 size={14} className="animate-spin" /> Generating {count}...</>
          ) : (
            <><Sparkles size={14} /> Generate {count}</>
          )}
        </Button>
      </div>
    </Card>
  );
}

function InlineEditor({
  item, onSave, onCancel, mediaItems,
}: {
  item: ContentItem; onSave: (data: Partial<ContentItem>) => void; onCancel: () => void; mediaItems: MediaItem[];
}) {
  const [hook, setHook] = useState(item.hook);
  const [caption, setCaption] = useState(item.caption);
  const [cta, setCta] = useState(item.cta);
  const [imageUrl, setImageUrl] = useState(item.imageUrl || "");
  const [showVault, setShowVault] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-border/30 pt-3 mt-3 space-y-2"
    >
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hook</label>
        <Input value={hook} onChange={(e) => setHook(e.target.value)} className="text-sm mt-1" data-testid="input-edit-hook" />
      </div>
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Caption</label>
        <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="text-sm mt-1 resize-none" rows={3} data-testid="input-edit-caption" />
      </div>
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">CTA</label>
        <Input value={cta} onChange={(e) => setCta(e.target.value)} className="text-sm mt-1" data-testid="input-edit-cta" />
      </div>
      <div className="flex items-center gap-2">
        {imageUrl && (
          <img src={imageUrl} alt="" className="w-10 h-10 rounded object-cover border border-border/50" />
        )}
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowVault(true)} data-testid="button-change-media">
          <ImageIcon size={12} /> {imageUrl ? "Change" : "Add"} Media
        </Button>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => onSave({ hook, caption, cta, imageUrl: imageUrl || null })} className="gap-1" data-testid="button-save-edit">
          <Check size={12} /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} data-testid="button-cancel-edit">Cancel</Button>
      </div>
      <VaultPickerModal
        open={showVault}
        onClose={() => setShowVault(false)}
        onSelect={(id, url) => setImageUrl(url)}
        mediaItems={mediaItems}
      />
    </motion.div>
  );
}

function ContentReviewCard({
  item, onAction, mediaItems, isSelected, onToggleSelect,
}: {
  item: ContentItem;
  onAction: (action: string, data?: any) => void;
  mediaItems: MediaItem[];
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const ratioClass = item.ratio === "9:16" ? "aspect-[9/16]" : item.ratio === "1:1" ? "aspect-square" : "aspect-[4/5]";

  const canApprove = ["needs_review", "generated"].includes(item.status);
  const canReject = ["needs_review", "generated", "approved"].includes(item.status);
  const canSchedule = item.status === "approved";
  const canPostNow = ["approved", "scheduled"].includes(item.status);
  const canEdit = !["posting", "posted"].includes(item.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "glass-panel overflow-hidden transition-all",
          isSelected && "ring-2 ring-primary/40"
        )}
        data-testid={`card-content-${item.id}`}
      >
        <div className="relative">
          {item.imageUrl ? (
            <div className={cn("w-full overflow-hidden bg-secondary/30", ratioClass, "max-h-48")}>
              <img
                src={item.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ) : (
            <div className={cn("w-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center", "h-24")}>
              <ImageIcon size={20} className="text-muted-foreground/30" />
            </div>
          )}

          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <button
              onClick={onToggleSelect}
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                isSelected ? "bg-primary border-primary" : "bg-black/30 border-white/40 hover:border-white/70"
              )}
              data-testid={`checkbox-select-${item.id}`}
            >
              {isSelected && <Check size={10} className="text-white" />}
            </button>
          </div>

          <div className="absolute top-2 right-2 flex items-center gap-1">
            {item.platform === "both" ? (
              <>
                <PlatformBadge platform="x" size="xs" />
                <PlatformBadge platform="threads" size="xs" />
              </>
            ) : (
              <PlatformBadge platform={item.platform as any} size="xs" />
            )}
          </div>

          <div className="absolute bottom-2 right-2">
            <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded border", confidenceBg(item.confidence), confidenceColor(item.confidence))}>
              {item.confidence}%
            </span>
          </div>
        </div>

        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="outline" className={cn("text-[10px] shrink-0 capitalize", STATUS_COLORS[item.status])}>
              {item.status.replace("_", " ")}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{item.format}</span>
          </div>

          {item.hook && (
            <p className="text-sm font-semibold leading-snug line-clamp-2" data-testid={`text-hook-${item.id}`}>{item.hook}</p>
          )}

          {item.caption && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3" data-testid={`text-caption-${item.id}`}>{item.caption}</p>
          )}

          {item.cta && (
            <div className="inline-block px-2 py-1 bg-primary/10 text-primary text-[10px] font-semibold rounded-full border border-primary/20">
              {item.cta}
            </div>
          )}

          {item.scheduledAt && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock size={10} />
              <span>{formatDate(item.scheduledAt)}</span>
            </div>
          )}

          {item.failReason && (
            <div className="flex items-center gap-1 text-[10px] text-red-400">
              <AlertTriangle size={10} />
              <span className="truncate">{item.failReason}</span>
            </div>
          )}

          <div className="flex items-center gap-1 pt-1 border-t border-border/30">
            {canApprove && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 gap-1 text-xs"
                onClick={() => onAction("approve")} data-testid={`button-approve-${item.id}`}>
                <CheckCircle2 size={12} /> Approve
              </Button>
            )}
            {canReject && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 text-xs"
                onClick={() => onAction("reject")} data-testid={`button-reject-${item.id}`}>
                <XCircle size={12} /> Reject
              </Button>
            )}
            {canSchedule && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-primary hover:bg-primary/10 gap-1 text-xs"
                onClick={() => onAction("schedule")} data-testid={`button-schedule-${item.id}`}>
                <Calendar size={12} /> Schedule
              </Button>
            )}
            {canPostNow && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-accent hover:bg-accent/10 gap-1 text-xs"
                onClick={() => onAction("post-now")} data-testid={`button-post-now-${item.id}`}>
                <Zap size={12} /> Post
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1 text-xs ml-auto"
                onClick={() => setEditing(!editing)} data-testid={`button-edit-${item.id}`}>
                <Pencil size={12} />
              </Button>
            )}
          </div>

          <AnimatePresence>
            {editing && (
              <InlineEditor
                item={item}
                onSave={(data) => { onAction("edit", data); setEditing(false); }}
                onCancel={() => setEditing(false)}
                mediaItems={mediaItems}
              />
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}

function BatchActionsBar({
  selectedIds, totalCount, onAction, onSelectAll, onDeselectAll,
}: {
  selectedIds: Set<number>; totalCount: number;
  onAction: (action: string, data?: any) => void;
  onSelectAll: () => void; onDeselectAll: () => void;
}) {
  const [showThreshold, setShowThreshold] = useState(false);
  const [threshold, setThreshold] = useState(70);

  if (selectedIds.size === 0 && !showThreshold) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 flex-wrap"
    >
      {selectedIds.size > 0 && (
        <>
          <span className="text-xs text-muted-foreground" data-testid="text-selected-count">
            {selectedIds.size} of {totalCount} selected
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10"
            onClick={() => onAction("approve-selected")} data-testid="button-approve-selected">
            <CheckCircle2 size={12} /> Approve Selected
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-400 border-red-400/20 hover:bg-red-400/10"
            onClick={() => onAction("reject-selected")} data-testid="button-reject-selected">
            <XCircle size={12} /> Reject Selected
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
            onClick={onDeselectAll} data-testid="button-deselect-all">
            Deselect
          </Button>
          <div className="h-4 w-px bg-border/40 mx-1" />
        </>
      )}

      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
        onClick={() => onAction("approve-all")} data-testid="button-approve-all">
        <CheckCircle2 size={12} /> Approve All Reviewable
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
        onClick={() => onAction("reject-all")} data-testid="button-reject-all">
        <XCircle size={12} /> Reject All Reviewable
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
        onClick={() => setShowThreshold(!showThreshold)} data-testid="button-threshold-toggle">
        <SlidersHorizontal size={12} /> Score Threshold
      </Button>

      {showThreshold && (
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs text-muted-foreground">Approve above</span>
          <Input type="number" min={0} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-16 h-7 text-xs" data-testid="input-threshold" />
          <span className="text-xs text-muted-foreground">%</span>
          <Button size="sm" className="h-7 text-xs gap-1"
            onClick={() => { onAction("approve-threshold", { threshold }); setShowThreshold(false); }}
            data-testid="button-apply-threshold">
            Apply
          </Button>
        </div>
      )}

      {selectedIds.size === 0 && (
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground ml-auto"
          onClick={onSelectAll} data-testid="button-select-all">
          Select All
        </Button>
      )}
    </motion.div>
  );
}

function AIFactoryTab() {
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("generatedAt");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [schedulingItem, setSchedulingItem] = useState<ContentItem | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useContentItems({ status: statusFilter, platform: platformFilter });
  const { data: mediaItems = [] } = useMediaItems();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/content-studio/items"] });
  }, [queryClient]);

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      if (sortKey === "confidence") return b.confidence - a.confidence;
      if (sortKey === "platform") return a.platform.localeCompare(b.platform);
      if (sortKey === "scheduledAt") {
        const aDate = a.scheduledAt || "";
        const bDate = b.scheduledAt || "";
        return bDate.localeCompare(aDate);
      }
      const aGen = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
      const bGen = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
      return bGen - aGen;
    });
    return sorted;
  }, [items, sortKey]);

  const handleItemAction = useCallback(async (item: ContentItem, action: string, data?: any) => {
    try {
      if (action === "approve") {
        await apiRequest("POST", `/api/content-studio/items/${item.id}/approve`);
        toast({ title: "Content approved" });
      } else if (action === "reject") {
        await apiRequest("POST", `/api/content-studio/items/${item.id}/reject`);
        toast({ title: "Content rejected" });
      } else if (action === "schedule") {
        setSchedulingItem(item);
        return;
      } else if (action === "post-now") {
        await apiRequest("POST", `/api/content-studio/items/${item.id}/post-now`);
        toast({ title: "Posting now..." });
      } else if (action === "edit") {
        await apiRequest("PATCH", `/api/content-studio/items/${item.id}`, data);
        toast({ title: "Content updated" });
      }
      invalidate();
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message || "Try again", variant: "destructive" });
    }
  }, [toast, invalidate]);

  const handleBatchAction = useCallback(async (action: string, data?: any) => {
    try {
      if (action === "approve-selected" || action === "reject-selected") {
        const status = action === "approve-selected" ? "approved" : "rejected";
        const transitionAction = action === "approve-selected" ? "approve" : "reject";
        const ids = Array.from(selectedIds);
        await apiRequest("POST", "/api/content-studio/batch-action", { ids, action: transitionAction });
        toast({ title: `${ids.length} items ${status}` });
        setSelectedIds(new Set());
      } else if (action === "approve-all" || action === "reject-all") {
        const reviewable = items.filter((i) => ["needs_review", "generated"].includes(i.status));
        if (reviewable.length === 0) { toast({ title: "No reviewable items" }); return; }
        const transitionAction = action === "approve-all" ? "approve" : "reject";
        await apiRequest("POST", "/api/content-studio/batch-action", {
          ids: reviewable.map((i) => i.id), action: transitionAction,
        });
        toast({ title: `${reviewable.length} items ${transitionAction === "approve" ? "approved" : "rejected"}` });
      } else if (action === "approve-threshold") {
        const threshold = data?.threshold || 70;
        const eligible = items.filter((i) =>
          ["needs_review", "generated"].includes(i.status) && i.confidence >= threshold
        );
        if (eligible.length === 0) { toast({ title: `No items above ${threshold}%` }); return; }
        await apiRequest("POST", "/api/content-studio/batch-action", {
          ids: eligible.map((i) => i.id), action: "approve",
        });
        toast({ title: `${eligible.length} items approved (score >= ${threshold}%)` });
      }
      invalidate();
    } catch (err: any) {
      toast({ title: "Batch action failed", description: err?.message || "Try again", variant: "destructive" });
    }
  }, [items, selectedIds, toast, invalidate]);

  const handleScheduleConfirm = useCallback(async (isoString: string) => {
    if (!schedulingItem) return;
    try {
      await apiRequest("POST", `/api/content-studio/items/${schedulingItem.id}/schedule`, {
        scheduledAt: isoString,
      });
      toast({ title: "Content scheduled", description: formatDate(isoString) });
      invalidate();
    } catch (err: any) {
      toast({ title: "Schedule failed", description: err?.message, variant: "destructive" });
    }
    setSchedulingItem(null);
  }, [schedulingItem, toast, invalidate]);

  const handlePostNow = useCallback(async () => {
    if (!schedulingItem) return;
    try {
      await apiRequest("POST", `/api/content-studio/items/${schedulingItem.id}/post-now`);
      toast({ title: "Posting now..." });
      invalidate();
    } catch (err: any) {
      toast({ title: "Post failed", description: err?.message, variant: "destructive" });
    }
    setSchedulingItem(null);
  }, [schedulingItem, toast, invalidate]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(sortedItems.map((i) => i.id)));
  }, [sortedItems]);

  return (
    <div className="space-y-5">
      <GenerationPanel onGenerated={invalidate} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {PLATFORM_FILTERS.map((f) => (
            <button
              key={f.id}
              data-testid={`filter-platform-${f.id}`}
              onClick={() => setPlatformFilter(f.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap",
                platformFilter === f.id
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="h-4 w-px bg-border/40 mx-1" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              data-testid={`filter-status-${f.id}`}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap",
                statusFilter === f.id
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Sort</span>
          {([
            { key: "generatedAt" as SortKey, label: "Newest" },
            { key: "confidence" as SortKey, label: "Score" },
            { key: "scheduledAt" as SortKey, label: "Scheduled" },
            { key: "platform" as SortKey, label: "Platform" },
          ]).map((s) => (
            <button
              key={s.key}
              data-testid={`sort-${s.key}`}
              onClick={() => setSortKey(s.key)}
              className={cn(
                "px-2 py-1 text-[10px] font-medium rounded border transition-all",
                sortKey === s.key
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <BatchActionsBar
        selectedIds={selectedIds}
        totalCount={sortedItems.length}
        onAction={handleBatchAction}
        onSelectAll={selectAll}
        onDeselectAll={() => setSelectedIds(new Set())}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-primary/40" />
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-4">
            <Sparkles size={32} className="text-primary/40" />
          </div>
          <h3 className="text-lg font-bold font-display mb-2" data-testid="text-empty-factory">No content yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Use the generator above to create AI-powered content suggestions for review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {sortedItems.map((item) => (
              <ContentReviewCard
                key={item.id}
                item={item}
                onAction={(action, data) => handleItemAction(item, action, data)}
                mediaItems={mediaItems as MediaItem[]}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="text-xs text-muted-foreground/50 text-center pt-4" data-testid="text-item-count">
        {sortedItems.length} item{sortedItems.length !== 1 ? "s" : ""}
      </div>

      <DateTimeWheelModal
        open={!!schedulingItem}
        onClose={() => setSchedulingItem(null)}
        onSchedule={handleScheduleConfirm}
        onPostNow={handlePostNow}
      />
    </div>
  );
}

type StoryTemplate = "tease-reveal-cta" | "single-cta" | "countdown" | "custom";

interface StorySlide {
  headline: string;
  body: string;
  cta: string;
}

const STORY_TEMPLATES: { id: StoryTemplate; label: string; desc: string; slides: number }[] = [
  { id: "tease-reveal-cta", label: "Tease → Reveal → CTA", desc: "Build curiosity, deliver the reveal, then drive action", slides: 3 },
  { id: "single-cta", label: "Single Story + CTA", desc: "One punchy slide with a direct call-to-action", slides: 1 },
  { id: "countdown", label: "Countdown Sequence", desc: "Multi-slide countdown leading to a big moment", slides: 4 },
  { id: "custom", label: "Custom Sequence", desc: "Define your own slide count and flow", slides: 0 },
];

const CTA_PRESETS = ["See it here", "More of me", "Tap here", "Link in bio", "Swipe up", "Don't miss out"];

function StorySlideCard({ slide, index }: { slide: StorySlide; index: number }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const fullText = [slide.headline, slide.body, slide.cta].filter(Boolean).join("\n\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: `Slide ${index + 1} copied` });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="glass-panel p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Slide {index + 1}</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleCopy}>
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </Button>
        </div>
        <div className="space-y-2">
          {slide.headline && <p className="font-semibold text-sm text-foreground leading-snug">{slide.headline}</p>}
          {slide.body && <p className="text-sm text-muted-foreground leading-relaxed">{slide.body}</p>}
          {slide.cta && (
            <div className="mt-3 inline-block px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
              {slide.cta}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function StoryIdeasTab() {
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate>("tease-reveal-cta");
  const [customSlides, setCustomSlides] = useState(3);
  const [linkUrl, setLinkUrl] = useState("");
  const [context, setContext] = useState("");
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [slides, setSlides] = useState<StorySlide[]>([]);
  const { toast } = useToast();
  const { data: mediaItems = [] } = useMediaItems();

  const template = STORY_TEMPLATES.find((t) => t.id === selectedTemplate)!;
  const slideCount = selectedTemplate === "custom" ? customSlides : template.slides;

  const selectedImage = (mediaItems as any[]).find((m) => m.id === selectedImageId);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSlides([]);
    try {
      const res = await apiRequest("POST", "/api/studio/story-ideas", {
        template: selectedTemplate,
        slideCount,
        linkUrl,
        context,
        imageTag: selectedImage ? `${selectedImage.mood ?? ""} ${selectedImage.outfit ?? ""}`.trim() : "",
      });
      const data = await res.json();
      if (data.slides) setSlides(data.slides);
    } catch {
      toast({ title: "Generation failed", description: "Try again or check your connection.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight">Story Ideas</h2>
        <p className="text-muted-foreground mt-1">Generate Instagram story sequences with AI — approve each slide before use.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <Card className="glass-panel p-5">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">Story Template</p>
            <div className="space-y-2">
              {STORY_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all duration-150",
                    selectedTemplate === t.id
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t.label}</span>
                    {t.slides > 0 && <span className="text-[10px] text-muted-foreground/60">{t.slides} slides</span>}
                  </div>
                  <p className="text-xs mt-0.5 opacity-70">{t.desc}</p>
                </button>
              ))}
            </div>
            {selectedTemplate === "custom" && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Slides:</span>
                <Input
                  type="number" min={1} max={10} value={customSlides}
                  onChange={(e) => setCustomSlides(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-20 h-8 text-sm"
                />
              </div>
            )}
          </Card>

          <Card className="glass-panel p-5">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">Media (optional)</p>
            {selectedImage ? (
              <div className="flex items-center gap-3">
                <img src={`/uploads/${selectedImage.filename}`} alt="" className="w-14 h-14 rounded-lg object-cover border border-border/50"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedImage.filename}</p>
                  <p className="text-xs text-muted-foreground">{[selectedImage.mood, selectedImage.outfit].filter(Boolean).join(" · ")}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedImageId(null)}>Clear</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full border-dashed text-muted-foreground" onClick={() => setShowVaultPicker(true)}>
                <ImageIcon size={14} className="mr-2" /> Pick from Media Vault
              </Button>
            )}
          </Card>

          <Card className="glass-panel p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">Link URL</p>
              <div className="relative">
                <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <Input placeholder="https://linktr.ee/..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="pl-8 text-sm" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">Context / Topic</p>
              <Textarea placeholder="What's this story about?" value={context} onChange={(e) => setContext(e.target.value)} className="text-sm resize-none" rows={3} />
            </div>
          </Card>

          <div>
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-2">Common CTAs</p>
            <div className="flex flex-wrap gap-1.5">
              {CTA_PRESETS.map((cta) => (
                <span key={cta} className="text-xs px-2 py-1 rounded-full bg-secondary/40 text-muted-foreground border border-border/30">{cta}</span>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || (!context && !selectedImage)}>
            {isGenerating ? (
              <><Loader2 size={15} className="mr-2 animate-spin" /> Generating {slideCount} slide{slideCount !== 1 ? "s" : ""}…</>
            ) : (
              <><Sparkles size={15} className="mr-2" /> Generate Story</>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {slides.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{slides.length} slide{slides.length !== 1 ? "s" : ""} generated</p>
                <Button size="sm" variant="ghost" onClick={handleGenerate} disabled={isGenerating} className="text-muted-foreground gap-1.5">
                  <RefreshCw size={12} /> Regenerate
                </Button>
              </div>
              {slides.map((slide, i) => (
                <StorySlideCard key={i} slide={slide} index={i} />
              ))}
            </>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-border/40">
              <Layers size={32} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Your story slides will appear here.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Choose a template, add context, then hit Generate.</p>
            </div>
          )}
        </div>
      </div>

      <VaultPickerModal
        open={showVaultPicker}
        onClose={() => setShowVaultPicker(false)}
        onSelect={(id) => setSelectedImageId(id)}
        mediaItems={mediaItems as MediaItem[]}
        selectedId={selectedImageId}
      />
    </div>
  );
}

function CalendarTab() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-4">
        <Calendar size={32} className="text-primary/40" />
      </div>
      <h3 className="text-xl font-bold font-display mb-2">Content Calendar</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        Plan and visualize your posting schedule across all platforms. Coming in the next phase.
      </p>
    </div>
  );
}

type StudioTab = "factory" | "create" | "stories" | "calendar";

const STUDIO_TABS: { id: StudioTab; label: string; icon: React.FC<any> }[] = [
  { id: "factory", label: "AI Factory", icon: Sparkles },
  { id: "create", label: "Manual Composer", icon: Wand2 },
  { id: "stories", label: "Story Ideas", icon: Layers },
  { id: "calendar", label: "Calendar", icon: Calendar },
];

export default function ContentStudio() {
  const [activeTab, setActiveTab] = useState<StudioTab>("factory");

  return (
    <div className="space-y-0 pb-12">
      <div className="flex items-center gap-1 mb-8 border-b border-border/40 pb-0">
        {STUDIO_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
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
          {activeTab === "factory" && <AIFactoryTab />}
          {activeTab === "create" && <Composer />}
          {activeTab === "stories" && <StoryIdeasTab />}
          {activeTab === "calendar" && <CalendarTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
