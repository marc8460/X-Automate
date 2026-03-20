import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, Calendar, Layers, Loader2, Copy, Check, Image as ImageIcon,
  Link, Sparkles, RefreshCw, Zap, X, CheckCircle2, XCircle,
  Pencil, Clock, Filter, ChevronDown, SlidersHorizontal,
  ArrowUpDown, Send, MoreHorizontal, AlertTriangle, Eye,
  Trash2, Flame,
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

type ContentPlatform = "x" | "threads" | "instagram" | "tiktok" | "both";
type SortKey = "confidence" | "scheduledAt" | "platform" | "generatedAt";

const STYLE_OPTIONS = [
  "Engagement Bait",
  "Direct Question",
  "Soft Tease",
  "Viral Hook",
  "Community Love",
  "Bold Statement",
  "Behind the Scenes",
] as const;

const PLATFORM_FILTERS = [
  { id: "all", label: "All" },
  { id: "x", label: "X" },
  { id: "threads", label: "Threads" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
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

function getMediaUrl(item: MediaItem): string {
  return `/uploads/${item.url}`;
}

function VaultPickerModal({
  open, onClose, onSelect, mediaItems, selectedId, requiredRatio,
}: {
  open: boolean; onClose: () => void; onSelect: (id: number, url: string) => void;
  mediaItems: MediaItem[]; selectedId?: number | null; requiredRatio?: string;
}) {
  if (!open) return null;
  const filtered = requiredRatio
    ? mediaItems.filter((m) => m.aspectRatio === requiredRatio)
    : mediaItems;
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
            <div>
              <h3 className="font-semibold text-foreground">Pick from Media Vault</h3>
              {requiredRatio && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing only {requiredRatio} assets ({filtered.length} available)
                </p>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={onClose} data-testid="vault-picker-close">Close</Button>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-vault-empty">
                {requiredRatio
                  ? `No ${requiredRatio} assets in your vault. Upload ${requiredRatio} images to use them here.`
                  : "No media in your vault yet."}
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    data-testid={`vault-item-${item.id}`}
                    onClick={() => { onSelect(item.id, getMediaUrl(item)); onClose(); }}
                    className={cn(
                      "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                      selectedId === item.id ? "border-primary" : "border-transparent hover:border-border"
                    )}
                  >
                    <img
                      src={getMediaUrl(item)}
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

const GEN_PLATFORMS: { id: ContentPlatform; label: string }[] = [
  { id: "x", label: "X" },
  { id: "threads", label: "Threads" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
];

const NAUGHTINESS_LABELS: { max: number; label: string; color: string }[] = [
  { max: 30, label: "Wholesome", color: "text-emerald-400" },
  { max: 60, label: "Flirty", color: "text-amber-400" },
  { max: 80, label: "Bold", color: "text-orange-400" },
  { max: 100, label: "Max Spice", color: "text-red-400" },
];

function getNaughtinessLabel(value: number) {
  return NAUGHTINESS_LABELS.find((l) => value <= l.max) || NAUGHTINESS_LABELS[3];
}

// Maps each explicit content type to its required ratio
const CONTENT_TYPE_RATIO: Record<string, string> = {
  instagram_story: "9:16",
  instagram_reel: "9:16",
  instagram_post: "4:5",
  threads_post: "4:5",
  x_post: "4:5",
  tiktok_post: "9:16",
  tiktok_slideshow: "9:16",
};

// Derive content type from platform + sub-type selection
function deriveContentType(
  platforms: Set<ContentPlatform>,
  instagramType: "story" | "post" | "reel" | null,
  tiktokType: "post" | "slideshow" | null,
): string | null {
  if (platforms.size === 1) {
    const p = Array.from(platforms)[0];
    if (p === "instagram") return instagramType ? `instagram_${instagramType}` : null;
    if (p === "tiktok") return tiktokType ? `tiktok_${tiktokType}` : null;
    if (p === "x") return "x_post";
    if (p === "threads") return "threads_post";
  }
  // Multi-platform: check if all have same ratio
  return null;
}

// Get required ratio for a set of platforms + sub-types
function deriveRequiredRatio(
  platforms: Set<ContentPlatform>,
  instagramType: "story" | "post" | "reel" | null,
  tiktokType: "post" | "slideshow" | null,
): string | null {
  const ratios = new Set<string>();
  for (const p of platforms) {
    if (p === "instagram") {
      if (!instagramType) return null;
      ratios.add(instagramType === "post" ? "4:5" : "9:16");
    } else if (p === "tiktok") {
      ratios.add("9:16");
    } else if (p === "x" || p === "threads") {
      ratios.add("4:5");
    }
  }
  if (ratios.size === 1) return Array.from(ratios)[0];
  if (ratios.size > 1) return null; // conflict
  return null;
}

function GenerationPanel({ onGenerated }: { onGenerated: () => void }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<ContentPlatform>>(new Set(["x", "threads"]));
  const [count, setCount] = useState(10);
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("");
  const [naughtiness, setNaughtiness] = useState(60);
  const [instagramType, setInstagramType] = useState<"story" | "post" | "reel" | null>(null);
  const [tiktokType, setTiktokType] = useState<"post" | "slideshow" | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const instagramSelected = selectedPlatforms.has("instagram");
  const tiktokSelected = selectedPlatforms.has("tiktok");

  const requiredRatio = deriveRequiredRatio(selectedPlatforms, instagramType, tiktokType);
  const hasRatioConflict = requiredRatio === null && selectedPlatforms.size > 0 &&
    !(instagramSelected && instagramType === null) &&
    !(tiktokSelected && tiktokType === null);

  const togglePlatform = (p: ContentPlatform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size > 1) {
          next.delete(p);
          if (p === "instagram") setInstagramType(null);
          if (p === "tiktok") setTiktokType(null);
        }
      } else {
        next.add(p);
        if (p === "instagram" && instagramType === null) setInstagramType("post");
        if (p === "tiktok" && tiktokType === null) setTiktokType("post");
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!requiredRatio || hasRatioConflict) return;
    setIsGenerating(true);

    // Derive single contentType for single-platform generation
    const contentType = deriveContentType(selectedPlatforms, instagramType, tiktokType);

    try {
      const res = await apiRequest("POST", "/api/content-studio/generate-batch", {
        platforms: Array.from(selectedPlatforms),
        count,
        topic: topic || undefined,
        style: style || undefined,
        contentType: contentType || undefined,
        ratio: requiredRatio,
        naughtiness,
      });
      const data: { items?: ContentItem[] } = await res.json();
      const typeLabel = contentType ? contentType.replace("_", " ") : "items";
      toast({ title: `${data.items?.length || count} ${typeLabel} generated`, description: "Review and approve them below." });
      onGenerated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again";
      toast({ title: "Generation failed", description: message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const nLabel = getNaughtinessLabel(naughtiness);

  return (
    <Card className="glass-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles size={16} className="text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm" data-testid="text-gen-title">AI Content Generator</h3>
          <p className="text-xs text-muted-foreground">Generate batch content for review</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 block">Platforms</label>
          <div className="flex flex-wrap gap-1">
            {GEN_PLATFORMS.map((p) => (
              <button
                key={p.id}
                data-testid={`button-platform-${p.id}`}
                onClick={() => togglePlatform(p.id)}
                className={cn(
                  "px-2 py-1.5 text-xs font-medium rounded-md border transition-all",
                  selectedPlatforms.has(p.id)
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {instagramSelected && (
            <div className="mt-2">
              <div className="flex gap-1">
                {(["story", "post", "reel"] as const).map((t) => (
                  <button
                    key={t}
                    data-testid={`button-instagram-type-${t}`}
                    onClick={() => setInstagramType(t)}
                    className={cn(
                      "flex-1 px-2 py-1.5 text-xs font-medium rounded-md border transition-all capitalize",
                      instagramType === t
                        ? "border-pink-500/50 bg-pink-500/10 text-pink-400"
                        : "border-border/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tiktokSelected && (
            <div className="mt-2">
              <div className="flex gap-1">
                {(["post", "slideshow"] as const).map((t) => (
                  <button
                    key={t}
                    data-testid={`button-tiktok-type-${t}`}
                    onClick={() => setTiktokType(t)}
                    className={cn(
                      "flex-1 px-2 py-1.5 text-xs font-medium rounded-md border transition-all capitalize",
                      tiktokType === t
                        ? "border-red-500/50 bg-red-500/10 text-red-400"
                        : "border-border/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
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
          <div className="flex gap-1 items-center">
            {requiredRatio ? (
              <div className="flex-1 px-2 py-1.5 text-xs font-semibold rounded-md border border-primary/40 bg-primary/10 text-primary text-center" data-testid="text-ratio-locked">
                {requiredRatio} <span className="opacity-60 font-normal">(locked)</span>
              </div>
            ) : hasRatioConflict ? (
              <div className="flex-1 px-2 py-1.5 text-xs font-semibold rounded-md border border-red-500/40 bg-red-500/10 text-red-400 text-center" data-testid="text-ratio-conflict">
                Ratio conflict
              </div>
            ) : (
              <div className="flex-1 px-2 py-1.5 text-xs rounded-md border border-border/40 text-muted-foreground text-center">
                —
              </div>
            )}
          </div>
          {requiredRatio && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Only {requiredRatio} assets from vault will be used
            </p>
          )}
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 block">Style</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full h-8 text-xs rounded-md border border-border/40 bg-background px-2 text-foreground"
            data-testid="select-style"
          >
            <option value="">Any style</option>
            {STYLE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 block">
            <Flame size={10} className="inline mr-0.5" /> Naughtiness
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={naughtiness}
              onChange={(e) => setNaughtiness(Number(e.target.value))}
              className="flex-1 accent-primary"
              data-testid="input-naughtiness-slider"
            />
            <span className={cn("text-[10px] font-semibold w-16 text-right", nLabel.color)}>{nLabel.label}</span>
          </div>
        </div>
      </div>

      {hasRatioConflict && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
          <AlertTriangle size={12} className="shrink-0" />
          Selected platforms need different ratios. Generate them separately (e.g. X alone, then TikTok alone).
        </div>
      )}

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
          disabled={
            isGenerating ||
            selectedPlatforms.size === 0 ||
            (instagramSelected && instagramType === null) ||
            (tiktokSelected && tiktokType === null) ||
            hasRatioConflict ||
            !requiredRatio
          }
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
  item, onSave, onCancel, mediaItems, requiredRatio,
}: {
  item: ContentItem; onSave: (data: Partial<ContentItem>) => void; onCancel: () => void;
  mediaItems: MediaItem[]; requiredRatio?: string;
}) {
  const [hook, setHook] = useState(item.hook);
  const [caption, setCaption] = useState(item.caption);
  const [cta, setCta] = useState(item.cta);
  const [imageUrl, setImageUrl] = useState(item.imageUrl || "");
  const [mediaItemId, setMediaItemId] = useState<number | null>(item.mediaItemId ?? null);
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
        {requiredRatio && (
          <span className="text-[10px] text-muted-foreground">Only {requiredRatio} assets shown</span>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => onSave({ hook, caption, cta, imageUrl: imageUrl || null, mediaItemId })} className="gap-1" data-testid="button-save-edit">
          <Check size={12} /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} data-testid="button-cancel-edit">Cancel</Button>
      </div>
      <VaultPickerModal
        open={showVault}
        onClose={() => setShowVault(false)}
        onSelect={(id, url) => { setMediaItemId(id); setImageUrl(url); }}
        mediaItems={mediaItems}
        requiredRatio={requiredRatio}
      />
    </motion.div>
  );
}

function ContentReviewCard({
  item, onAction, mediaItems, isSelected, onToggleSelect,
}: {
  item: ContentItem;
  onAction: (action: string, data?: Partial<ContentItem>) => void;
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
  const canRegenerate = ["needs_review", "generated", "rejected"].includes(item.status);
  const canDelete = item.status !== "posting";

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
            ) : (["x", "threads", "instagram", "tiktok"] as const).includes(item.platform as "x" | "threads" | "instagram" | "tiktok") ? (
              <PlatformBadge platform={item.platform as "x" | "threads" | "instagram" | "tiktok"} size="xs" />
            ) : (
              <Badge variant="outline" className="text-[10px]">{item.platform}</Badge>
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

          {item.slides && (() => {
            try {
              const slides: Array<{ text: string }> = JSON.parse(item.slides);
              if (slides.length > 0) return (
                <div className="space-y-1">
                  {slides.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">S{i + 1}</span>
                      <span className="text-xs text-foreground/80 italic">{s.text}</span>
                    </div>
                  ))}
                </div>
              );
            } catch { return null; }
          })()}

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
            {canRegenerate && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1 text-xs"
                onClick={() => onAction("regenerate")} data-testid={`button-regenerate-${item.id}`}>
                <RefreshCw size={12} /> Regen
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1 text-xs ml-auto"
                onClick={() => setEditing(!editing)} data-testid={`button-edit-${item.id}`}>
                <Pencil size={12} />
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 gap-1 text-xs"
                onClick={() => onAction("delete")} data-testid={`button-delete-${item.id}`}>
                <Trash2 size={12} />
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
                requiredRatio={item.ratio || undefined}
              />
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}

function BatchActionsBar({
  selectedIds, totalCount, onAction, onDeselectAll,
}: {
  selectedIds: Set<number>; totalCount: number;
  onAction: (action: string, data?: { threshold: number }) => void;
  onDeselectAll: () => void;
}) {
  const [showThreshold, setShowThreshold] = useState(false);
  const [threshold, setThreshold] = useState(70);
  const [thresholdMode, setThresholdMode] = useState<"approve-above" | "reject-below">("reject-below");

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
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-400 border-red-400/20 hover:bg-red-500/10"
            onClick={() => onAction("delete-selected")} data-testid="button-delete-selected">
            <Trash2 size={12} /> Delete Selected
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
        <div className="flex items-center gap-2 ml-2 flex-wrap">
          <div className="flex gap-1">
            <button
              onClick={() => setThresholdMode("reject-below")}
              className={cn("px-2 py-1 text-[10px] rounded border transition-all",
                thresholdMode === "reject-below" ? "border-red-400/30 bg-red-400/10 text-red-400" : "border-border/40 text-muted-foreground"
              )}
              data-testid="button-threshold-reject"
            >
              Reject below
            </button>
            <button
              onClick={() => setThresholdMode("approve-above")}
              className={cn("px-2 py-1 text-[10px] rounded border transition-all",
                thresholdMode === "approve-above" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-border/40 text-muted-foreground"
              )}
              data-testid="button-threshold-approve"
            >
              Approve above
            </button>
          </div>
          <Input type="number" min={0} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-16 h-7 text-xs" data-testid="input-threshold" />
          <span className="text-xs text-muted-foreground">%</span>
          <Button size="sm" className="h-7 text-xs gap-1"
            onClick={() => {
              onAction(thresholdMode === "reject-below" ? "reject-threshold" : "approve-threshold", { threshold });
              setShowThreshold(false);
            }}
            data-testid="button-apply-threshold">
            Apply
          </Button>
        </div>
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

  const handleItemAction = useCallback(async (item: ContentItem, action: string, data?: Partial<ContentItem>) => {
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
      } else if (action === "regenerate") {
        await apiRequest("POST", "/api/content-studio/generate-batch", {
          platforms: [item.platform === "both" ? "x" : item.platform],
          count: 1,
          ratio: item.ratio,
        });
        toast({ title: "Regenerated", description: "New version added to your queue" });
      } else if (action === "edit") {
        await apiRequest("PATCH", `/api/content-studio/items/${item.id}`, data);
        toast({ title: "Content updated" });
      } else if (action === "delete") {
        await apiRequest("DELETE", `/api/content-studio/items/${item.id}`);
        toast({ title: "Item deleted" });
      }
      invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again";
      toast({ title: "Action failed", description: message, variant: "destructive" });
    }
  }, [toast, invalidate]);

  const handleBatchAction = useCallback(async (action: string, data?: { threshold: number }) => {
    try {
      if (action === "delete-selected") {
        const ids = Array.from(selectedIds);
        await Promise.all(ids.map((id) => apiRequest("DELETE", `/api/content-studio/items/${id}`)));
        toast({ title: `${ids.length} item${ids.length === 1 ? "" : "s"} deleted` });
        setSelectedIds(new Set());
      } else if (action === "approve-selected" || action === "reject-selected") {
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
        const scoreThreshold = data?.threshold ?? 70;
        const eligible = items.filter((i) =>
          ["needs_review", "generated"].includes(i.status) && i.confidence >= scoreThreshold
        );
        if (eligible.length === 0) { toast({ title: `No items above ${scoreThreshold}%` }); return; }
        await apiRequest("POST", "/api/content-studio/batch-action", {
          ids: eligible.map((i) => i.id), action: "approve",
        });
        toast({ title: `${eligible.length} items approved (score >= ${scoreThreshold}%)` });
      } else if (action === "reject-threshold") {
        const scoreThreshold = data?.threshold ?? 70;
        const eligible = items.filter((i) =>
          ["needs_review", "generated"].includes(i.status) && i.confidence < scoreThreshold
        );
        if (eligible.length === 0) { toast({ title: `No items below ${scoreThreshold}%` }); return; }
        await apiRequest("POST", "/api/content-studio/batch-action", {
          ids: eligible.map((i) => i.id), action: "reject",
        });
        toast({ title: `${eligible.length} items rejected (score < ${scoreThreshold}%)` });
      }
      invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again";
      toast({ title: "Batch action failed", description: message, variant: "destructive" });
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again";
      toast({ title: "Schedule failed", description: message, variant: "destructive" });
    }
    setSchedulingItem(null);
  }, [schedulingItem, toast, invalidate]);

  const handlePostNow = useCallback(async () => {
    if (!schedulingItem) return;
    try {
      await apiRequest("POST", `/api/content-studio/items/${schedulingItem.id}/post-now`);
      toast({ title: "Posting now..." });
      invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again";
      toast({ title: "Post failed", description: message, variant: "destructive" });
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

  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = useCallback(async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    try {
      await apiRequest("POST", "/api/content-studio/clear-generated");
      toast({ title: "All suggestions deleted" });
      invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again";
      toast({ title: "Failed to delete", description: message, variant: "destructive" });
    }
    setConfirmClear(false);
  }, [confirmClear, toast, invalidate]);

  const hasSuggestions = items.some((i) => ["needs_review", "generated", "idea"].includes(i.status));

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
          {sortedItems.length > 0 && selectedIds.size < sortedItems.length && (
            <button
              data-testid="button-select-all"
              onClick={selectAll}
              className="ml-2 flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border transition-all border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
            >
              Select All ({sortedItems.length})
            </button>
          )}
          {hasSuggestions && (
            <button
              data-testid="button-clear-all"
              onClick={handleClearAll}
              className={cn(
                "ml-2 flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border transition-all",
                confirmClear
                  ? "border-red-500/50 bg-red-500/10 text-red-400"
                  : "border-border/40 text-muted-foreground hover:text-red-400 hover:border-red-500/30"
              )}
            >
              <Trash2 size={10} />
              {confirmClear ? "Click again to confirm" : "Delete All Suggestions"}
            </button>
          )}
        </div>
      </div>

      <BatchActionsBar
        selectedIds={selectedIds}
        totalCount={sortedItems.length}
        onAction={handleBatchAction}
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

  const selectedImage = (mediaItems as MediaItem[]).find((m) => m.id === selectedImageId);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSlides([]);
    try {
      const res = await apiRequest("POST", "/api/studio/story-ideas", {
        template: selectedTemplate,
        slideCount,
        linkUrl,
        context,
        imageTag: selectedImage ? `${selectedImage.mood} ${selectedImage.outfit}`.trim() : "",
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
                <img src={getMediaUrl(selectedImage)} alt="" className="w-14 h-14 rounded-lg object-cover border border-border/50"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedImage.url}</p>
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

type StudioTab = "factory" | "create" | "stories";

const STUDIO_TABS: { id: StudioTab; label: string; icon: React.FC<{ size?: number }> }[] = [
  { id: "factory", label: "AI Factory", icon: Sparkles },
  { id: "create", label: "Manual Composer", icon: Wand2 },
  { id: "stories", label: "Story Ideas", icon: Layers },
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
