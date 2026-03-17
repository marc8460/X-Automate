import { useState, useCallback, useMemo, useRef, Fragment, DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
  Loader2, Sparkles, Zap, Pencil, Trash2, ArrowLeft,
  CheckCircle2, XCircle, Plus, X, Image as ImageIcon,
  AlertTriangle, GripVertical, PanelRightOpen, PanelRightClose,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTimeWheelModal } from "@/components/DateTimeWheelModal";
import { PlatformBadge } from "@/components/platform/PlatformBadge";
import type { ContentItem } from "@shared/schema";
import type { Platform } from "@/types/platform";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DISPLAY_HOURS = HOURS.filter((h) => h >= 6 && h <= 23);

const PLATFORM_COLORS: Record<string, string> = {
  x: "border-l-neutral-800 bg-neutral-900/10",
  threads: "border-l-blue-500 bg-blue-500/10",
  instagram: "border-l-purple-500 bg-purple-500/10",
  tiktok: "border-l-pink-500 bg-pink-500/10",
  both: "border-l-primary bg-primary/10",
};

const STATUS_INDICATORS: Record<string, { color: string; label: string }> = {
  idea: { color: "bg-slate-400", label: "Draft" },
  generated: { color: "bg-slate-400", label: "Draft" },
  needs_review: { color: "bg-slate-400", label: "Draft" },
  approved: { color: "bg-amber-400", label: "Approved" },
  scheduled: { color: "bg-blue-400", label: "Scheduled" },
  posting: { color: "bg-orange-400 animate-pulse", label: "Posting" },
  posted: { color: "bg-emerald-400", label: "Posted" },
  failed: { color: "bg-red-400", label: "Failed" },
  rejected: { color: "bg-red-300", label: "Rejected" },
};

const PLATFORM_FILTERS = [
  { id: "all", label: "All" },
  { id: "x", label: "X" },
  { id: "threads", label: "Threads" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
] as const;

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatDateKey(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function formatDayHeader(d: Date): { day: string; date: string; isToday: boolean } {
  const today = new Date();
  const isToday = formatDateKey(d) === formatDateKey(today);
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isToday,
  };
}

function getItemHour(item: ContentItem): number {
  if (item.scheduledAt) {
    const parts = item.scheduledAt.split("T");
    if (parts[1]) return parseInt(parts[1].split(":")[0]) || 0;
  }
  if (item.postedAt) return new Date(item.postedAt).getHours();
  return 9;
}

function getItemDateKey(item: ContentItem): string | null {
  if (item.scheduledAt) return item.scheduledAt.split("T")[0];
  if (item.postedAt) return new Date(item.postedAt).toLocaleDateString("en-CA");
  return null;
}

function formatTime(item: ContentItem): string {
  if (item.scheduledAt) {
    const parts = item.scheduledAt.split("T");
    if (parts[1]) {
      const [h, m] = parts[1].split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      return `${hour % 12 || 12}:${m} ${ampm}`;
    }
  }
  if (item.postedAt) {
    return new Date(item.postedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return "";
}

function isPlatformMatch(platform: string): platform is Platform {
  return ["x", "threads", "instagram", "tiktok"].includes(platform);
}

function CalendarCard({
  item, onClick, onDragStart,
}: {
  item: ContentItem;
  onClick: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
}) {
  const status = STATUS_INDICATORS[item.status] || STATUS_INDICATORS.scheduled;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-md border-l-[3px] p-1.5 text-[11px] transition-all hover:shadow-md",
        "bg-card/80 backdrop-blur-sm border border-border/30",
        PLATFORM_COLORS[item.platform] || PLATFORM_COLORS.x,
      )}
      data-testid={`calendar-card-${item.id}`}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical size={10} className="text-muted-foreground/30 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", status.color)} />
            {item.platform === "both" ? (
              <>
                <PlatformBadge platform="x" size="xs" />
                <PlatformBadge platform="threads" size="xs" />
              </>
            ) : isPlatformMatch(item.platform) ? (
              <PlatformBadge platform={item.platform} size="xs" />
            ) : (
              <span className="text-[9px] text-muted-foreground">{item.platform}</span>
            )}
            <span className="text-[9px] text-muted-foreground ml-auto">{formatTime(item)}</span>
          </div>
          <div className="flex gap-1.5">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                className="w-7 h-7 rounded object-cover shrink-0 border border-border/30"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <p className="line-clamp-2 text-foreground/80 leading-tight">
              {item.hook || item.caption || "Untitled content"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  item, onClose, onAction,
}: {
  item: ContentItem;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const status = STATUS_INDICATORS[item.status] || STATUS_INDICATORS.scheduled;
  const canPostNow = ["approved", "scheduled"].includes(item.status);
  const canReschedule = ["scheduled"].includes(item.status);
  const canSendToDraft = ["approved", "scheduled"].includes(item.status);
  const canDelete = !["posting", "posted"].includes(item.status);
  const canEdit = !["posting", "posted"].includes(item.status);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-80 border-l border-border/40 bg-card/50 backdrop-blur-md overflow-y-auto"
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Content Details</h3>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7" data-testid="button-close-detail">
            <X size={14} />
          </Button>
        </div>

        {item.imageUrl && (
          <div className={cn(
            "w-full rounded-lg overflow-hidden border border-border/30",
            item.ratio === "9:16" ? "aspect-[9/16] max-h-64" : item.ratio === "1:1" ? "aspect-square" : "aspect-[4/5]"
          )}>
            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] capitalize">
            <span className={cn("w-1.5 h-1.5 rounded-full mr-1", status.color)} />
            {item.status.replace("_", " ")}
          </Badge>
          {item.platform === "both" ? (
            <>
              <PlatformBadge platform="x" size="xs" showLabel />
              <PlatformBadge platform="threads" size="xs" showLabel />
            </>
          ) : isPlatformMatch(item.platform) ? (
            <PlatformBadge platform={item.platform} size="xs" showLabel />
          ) : (
            <Badge variant="outline" className="text-[10px]">{item.platform}</Badge>
          )}
        </div>

        {item.hook && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hook</p>
            <p className="text-sm font-semibold leading-snug" data-testid="text-detail-hook">{item.hook}</p>
          </div>
        )}

        {item.caption && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Caption</p>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-detail-caption">{item.caption}</p>
          </div>
        )}

        {item.cta && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">CTA</p>
            <div className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
              {item.cta}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Score: <strong className={item.confidence >= 80 ? "text-emerald-500" : item.confidence >= 60 ? "text-amber-500" : "text-red-400"}>{item.confidence}%</strong></span>
          <span>{item.format}</span>
          <span>{item.ratio}</span>
        </div>

        {item.scheduledAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={11} />
            <span>{new Date(item.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          </div>
        )}

        {item.failReason && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertTriangle size={11} />
            <span>{item.failReason}</span>
          </div>
        )}

        <div className="pt-2 border-t border-border/30 space-y-2">
          {canPostNow && (
            <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => onAction("post-now")} data-testid="button-detail-post-now">
              <Zap size={12} /> Post Now
            </Button>
          )}
          {canReschedule && (
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => onAction("reschedule")} data-testid="button-detail-reschedule">
              <CalendarIcon size={12} /> Reschedule
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => onAction("edit")} data-testid="button-detail-edit">
              <Pencil size={12} /> Edit in Studio
            </Button>
          )}
          {canSendToDraft && (
            <Button size="sm" variant="ghost" className="w-full gap-1.5 text-xs text-muted-foreground" onClick={() => onAction("send-to-draft")} data-testid="button-detail-draft">
              <ArrowLeft size={12} /> Send Back to Draft
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="w-full gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => onAction("delete")} data-testid="button-detail-delete">
              <Trash2 size={12} /> Delete
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function UnscheduledSidebar({
  items, collapsed, onToggle, onDragStart, onSchedule,
}: {
  items: ContentItem[];
  collapsed: boolean;
  onToggle: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, item: ContentItem) => void;
  onSchedule: (item: ContentItem) => void;
}) {
  return (
    <div className={cn("border-l border-border/40 bg-card/30 backdrop-blur-sm transition-all shrink-0", collapsed ? "w-10" : "w-56")}>
      <div className="p-2">
        <Button size="icon" variant="ghost" onClick={onToggle} className="h-7 w-7 mb-2" data-testid="button-toggle-unscheduled">
          {collapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
        </Button>
        {!collapsed && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Unscheduled ({items.length})
            </p>
            {items.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/50 text-center py-4">No approved items waiting</p>
            ) : (
              <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    className="group cursor-grab rounded-md border border-border/30 bg-card/60 p-2 text-[10px] hover:border-primary/30 transition-all"
                    data-testid={`unscheduled-item-${item.id}`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <GripVertical size={9} className="text-muted-foreground/30" />
                      {item.platform === "both" ? (
                        <>
                          <PlatformBadge platform="x" size="xs" />
                          <PlatformBadge platform="threads" size="xs" />
                        </>
                      ) : isPlatformMatch(item.platform) ? (
                        <PlatformBadge platform={item.platform} size="xs" />
                      ) : null}
                      <span className="text-[9px] text-muted-foreground ml-auto">{item.confidence}%</span>
                    </div>
                    <p className="line-clamp-2 text-foreground/70 leading-tight mb-1">
                      {item.hook || item.caption || "Untitled"}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-full text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onSchedule(item)}
                      data-testid={`button-schedule-unscheduled-${item.id}`}
                    >
                      <CalendarIcon size={9} className="mr-1" /> Schedule
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotPickerPopup({
  items, dateKey, hour, onSelect, onCreateNew, onClose,
}: {
  items: ContentItem[];
  dateKey: string;
  hour: number;
  onSelect: (item: ContentItem) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute z-30 top-full left-0 mt-1 w-52 rounded-lg border border-border/40 bg-card/95 backdrop-blur-md shadow-xl p-2 space-y-1" data-testid={`slot-picker-${dateKey}-${hour}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Add to slot</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-slot-picker">
          <X size={10} />
        </button>
      </div>
      <button
        onClick={onCreateNew}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-primary rounded hover:bg-primary/10 transition-colors"
        data-testid="button-create-new-from-slot"
      >
        <Sparkles size={10} />
        Create new in Studio
      </button>
      {items.length > 0 && (
        <div className="border-t border-border/20 pt-1 mt-1 max-h-40 overflow-y-auto space-y-0.5">
          <p className="text-[9px] text-muted-foreground px-1">Approved drafts:</p>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left px-2 py-1.5 rounded text-[10px] hover:bg-muted/50 transition-colors"
              data-testid={`slot-pick-item-${item.id}`}
            >
              <div className="flex items-center gap-1 mb-0.5">
                {isPlatformMatch(item.platform) && <PlatformBadge platform={item.platform} size="xs" />}
                <span className="text-muted-foreground ml-auto">{item.confidence}%</span>
              </div>
              <p className="line-clamp-1 text-foreground/70">{item.hook || item.caption || "Untitled"}</p>
            </button>
          ))}
        </div>
      )}
      {items.length === 0 && (
        <p className="text-[9px] text-muted-foreground/50 text-center py-2">No approved drafts available</p>
      )}
    </div>
  );
}

export default function CalendarView() {
  const [weekBase, setWeekBase] = useState(() => new Date());
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [schedulingItem, setSchedulingItem] = useState<ContentItem | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [slotPicker, setSlotPicker] = useState<{ dateKey: string; hour: number } | null>(null);
  const dragItemRef = useRef<ContentItem | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekDates = useMemo(() => getWeekDates(weekBase), [weekBase]);

  const { startDate, endDate } = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = new Date(weekBase.getFullYear(), weekBase.getMonth(), 1);
      const startDay = monthStart.getDay();
      const calStart = new Date(monthStart);
      calStart.setDate(calStart.getDate() - startDay);
      const monthEnd = new Date(weekBase.getFullYear(), weekBase.getMonth() + 1, 0);
      const endDay = monthEnd.getDay();
      const calEnd = new Date(monthEnd);
      calEnd.setDate(calEnd.getDate() + (6 - endDay));
      return { startDate: formatDateKey(calStart), endDate: formatDateKey(calEnd) };
    }
    return { startDate: formatDateKey(weekDates[0]), endDate: formatDateKey(weekDates[6]) };
  }, [weekBase, weekDates, viewMode]);

  const { data: calendarData = {}, isLoading } = useQuery<Record<string, ContentItem[]>>({
    queryKey: ["/api/content-studio/calendar", startDate, endDate, platformFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      if (platformFilter !== "all") params.set("platform", platformFilter);
      const res = await apiRequest("GET", `/api/content-studio/calendar?${params}`);
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: allItems = [] } = useQuery<ContentItem[]>({
    queryKey: ["/api/content-studio/items", "approved-unscheduled"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/content-studio/items?status=approved");
      const items: ContentItem[] = await res.json();
      return items.filter((i) => !i.scheduledAt);
    },
    refetchInterval: 15000,
  });

  const unscheduledItems = useMemo(() => {
    if (platformFilter === "all") return allItems;
    return allItems.filter((i) => i.platform === platformFilter || i.platform === "both");
  }, [allItems, platformFilter]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/content-studio/calendar"] });
    queryClient.invalidateQueries({ queryKey: ["/api/content-studio/items"] });
  }, [queryClient]);

  const stats = useMemo(() => {
    let scheduled = 0, posted = 0, failed = 0;
    for (const items of Object.values(calendarData)) {
      for (const item of items) {
        if (item.status === "scheduled") scheduled++;
        else if (item.status === "posted") posted++;
        else if (item.status === "failed") failed++;
      }
    }
    return { scheduled, posted, failed };
  }, [calendarData]);

  const goToday = () => setWeekBase(new Date());
  const goPrev = () => {
    const d = new Date(weekBase);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setWeekBase(d);
  };
  const goNext = () => {
    const d = new Date(weekBase);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setWeekBase(d);
  };

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, item: ContentItem) => {
    dragItemRef.current = item;
    e.dataTransfer.setData("text/plain", String(item.id));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>, dateKey: string, hour: number) => {
    e.preventDefault();
    const item = dragItemRef.current;
    if (!item) return;
    dragItemRef.current = null;

    const newScheduledAt = `${dateKey}T${String(hour).padStart(2, "0")}:00`;

    try {
      if (item.status === "scheduled") {
        await apiRequest("POST", `/api/content-studio/items/${item.id}/reschedule`, { scheduledAt: newScheduledAt });
      } else if (item.status === "approved") {
        await apiRequest("POST", `/api/content-studio/items/${item.id}/schedule`, { scheduledAt: newScheduledAt });
      } else {
        toast({ title: "Cannot schedule", description: `Item must be approved first (current: ${item.status})`, variant: "destructive" });
        return;
      }
      toast({ title: "Rescheduled", description: new Date(newScheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) });
      invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reschedule";
      toast({ title: "Reschedule failed", description: message, variant: "destructive" });
    }
  }, [toast, invalidate]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleItemAction = useCallback(async (action: string) => {
    if (!selectedItem) return;
    try {
      if (action === "post-now") {
        await apiRequest("POST", `/api/content-studio/items/${selectedItem.id}/post-now`);
        toast({ title: "Posting now..." });
      } else if (action === "reschedule") {
        setSchedulingItem(selectedItem);
        return;
      } else if (action === "edit") {
        window.location.href = "/studio";
        return;
      } else if (action === "send-to-draft") {
        await apiRequest("POST", `/api/content-studio/items/${selectedItem.id}/send-back-to-draft`);
        toast({ title: "Sent back to draft" });
      } else if (action === "delete") {
        await apiRequest("DELETE", `/api/content-studio/items/${selectedItem.id}`);
        toast({ title: "Content deleted" });
        setSelectedItem(null);
      }
      invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast({ title: "Action failed", description: message, variant: "destructive" });
    }
  }, [selectedItem, toast, invalidate]);

  const handleScheduleConfirm = useCallback(async (isoString: string) => {
    if (!schedulingItem) return;
    try {
      if (schedulingItem.status === "scheduled") {
        await apiRequest("POST", `/api/content-studio/items/${schedulingItem.id}/reschedule`, { scheduledAt: isoString });
      } else {
        await apiRequest("POST", `/api/content-studio/items/${schedulingItem.id}/schedule`, { scheduledAt: isoString });
      }
      toast({ title: "Scheduled" });
      invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Schedule failed";
      toast({ title: "Schedule failed", description: message, variant: "destructive" });
    }
    setSchedulingItem(null);
  }, [schedulingItem, toast, invalidate]);

  const handleSchedulePostNow = useCallback(async () => {
    if (!schedulingItem) return;
    try {
      await apiRequest("POST", `/api/content-studio/items/${schedulingItem.id}/post-now`);
      toast({ title: "Posting now..." });
      invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Post failed";
      toast({ title: "Post failed", description: message, variant: "destructive" });
    }
    setSchedulingItem(null);
  }, [schedulingItem, toast, invalidate]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="shrink-0 space-y-3 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-display tracking-tight" data-testid="text-calendar-title">Calendar</h2>
            <div className="flex items-center gap-1 ml-4">
              <Button size="icon" variant="ghost" onClick={goPrev} className="h-7 w-7" data-testid="button-prev-week">
                <ChevronLeft size={14} />
              </Button>
              <Button size="sm" variant="outline" onClick={goToday} className="h-7 text-xs px-3" data-testid="button-today">
                Today
              </Button>
              <Button size="icon" variant="ghost" onClick={goNext} className="h-7 w-7" data-testid="button-next-week">
                <ChevronRight size={14} />
              </Button>
            </div>
            <span className="text-sm text-muted-foreground ml-2">
              {viewMode === "month"
                ? weekBase.toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("week")}
                className={cn("px-2 py-1 text-xs rounded border transition-all",
                  viewMode === "week" ? "border-primary/30 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground"
                )}
                data-testid="button-view-week"
              >
                Week
              </button>
              <button
                onClick={() => setViewMode("month")}
                className={cn("px-2 py-1 text-xs rounded border transition-all",
                  viewMode === "month" ? "border-primary/30 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground"
                )}
                data-testid="button-view-month"
              >
                Month
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {PLATFORM_FILTERS.map((f) => (
              <button
                key={f.id}
                data-testid={`calendar-filter-${f.id}`}
                onClick={() => setPlatformFilter(f.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
                  platformFilter === f.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <strong>{stats.scheduled}</strong> scheduled
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <strong>{stats.posted}</strong> posted
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <strong>{stats.failed}</strong> failed
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-primary/40" />
          </div>
        ) : viewMode === "week" ? (
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[900px]">
              <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm border-b border-border/30" />
              {weekDates.map((d) => {
                const header = formatDayHeader(d);
                return (
                  <div
                    key={formatDateKey(d)}
                    className={cn(
                      "sticky top-0 z-10 bg-card/90 backdrop-blur-sm border-b border-border/30 border-l border-border/20 p-2 text-center",
                      header.isToday && "bg-primary/5"
                    )}
                  >
                    <p className={cn("text-[10px] uppercase tracking-wider", header.isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                      {header.day}
                    </p>
                    <p className={cn("text-sm font-semibold", header.isToday ? "text-primary" : "text-foreground")}>
                      {header.date}
                    </p>
                  </div>
                );
              })}

              {DISPLAY_HOURS.map((hour) => (
                <Fragment key={`row-${hour}`}>
                  <div className="border-b border-border/10 py-1 px-1 text-right">
                    <span className="text-[10px] text-muted-foreground/50">
                      {hour % 12 || 12}{hour >= 12 ? "p" : "a"}
                    </span>
                  </div>
                  {weekDates.map((d) => {
                    const dateKey = formatDateKey(d);
                    const dayItems = calendarData[dateKey] || [];
                    const hourItems = dayItems.filter((item) => getItemHour(item) === hour);
                    const header = formatDayHeader(d);

                    return (
                      <div
                        key={`${dateKey}-${hour}`}
                        className={cn(
                          "border-b border-border/10 border-l border-border/20 p-0.5 min-h-[48px] transition-colors",
                          header.isToday && "bg-primary/[0.02]",
                          "hover:bg-primary/[0.04]"
                        )}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, dateKey, hour)}
                        data-testid={`slot-${dateKey}-${hour}`}
                      >
                        <div className="space-y-0.5">
                          {hourItems.map((item) => (
                            <CalendarCard
                              key={item.id}
                              item={item}
                              onClick={() => setSelectedItem(item)}
                              onDragStart={(e) => handleDragStart(e, item)}
                            />
                          ))}
                        </div>
                        {hourItems.length === 0 && (
                          <div className="relative">
                            <button
                              className="w-full h-full min-h-[40px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                              onClick={() => setSlotPicker(
                                slotPicker?.dateKey === dateKey && slotPicker?.hour === hour
                                  ? null
                                  : { dateKey, hour }
                              )}
                              data-testid={`button-add-${dateKey}-${hour}`}
                            >
                              <Plus size={12} className="text-muted-foreground/30" />
                            </button>
                            {slotPicker?.dateKey === dateKey && slotPicker?.hour === hour && (
                              <SlotPickerPopup
                                items={unscheduledItems}
                                dateKey={dateKey}
                                hour={hour}
                                onSelect={async (item) => {
                                  const scheduledAt = `${dateKey}T${String(hour).padStart(2, "0")}:00`;
                                  try {
                                    await apiRequest("POST", `/api/content-studio/items/${item.id}/schedule`, { scheduledAt });
                                    toast({ title: "Scheduled" });
                                    invalidate();
                                  } catch (err) {
                                    const msg = err instanceof Error ? err.message : "Schedule failed";
                                    toast({ title: "Schedule failed", description: msg, variant: "destructive" });
                                  }
                                  setSlotPicker(null);
                                }}
                                onCreateNew={() => {
                                  window.location.href = "/studio";
                                  setSlotPicker(null);
                                }}
                                onClose={() => setSlotPicker(null)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        ) : (
          <MonthView
            weekBase={weekBase}
            calendarData={calendarData}
            onItemClick={setSelectedItem}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          />
        )}

        <AnimatePresence>
          {selectedItem && (
            <DetailPanel
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onAction={handleItemAction}
            />
          )}
        </AnimatePresence>

        <UnscheduledSidebar
          items={unscheduledItems}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onDragStart={handleDragStart}
          onSchedule={(item) => setSchedulingItem(item)}
        />
      </div>

      <DateTimeWheelModal
        open={!!schedulingItem}
        onClose={() => setSchedulingItem(null)}
        onSchedule={handleScheduleConfirm}
        onPostNow={handleSchedulePostNow}
      />
    </div>
  );
}

function MonthView({
  weekBase, calendarData, onItemClick, onDragStart, onDrop, onDragOver,
}: {
  weekBase: Date;
  calendarData: Record<string, ContentItem[]>;
  onItemClick: (item: ContentItem) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, item: ContentItem) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, dateKey: string, hour: number) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
}) {
  const monthStart = new Date(weekBase.getFullYear(), weekBase.getMonth(), 1);
  const monthEnd = new Date(weekBase.getFullYear(), weekBase.getMonth() + 1, 0);
  const startDay = monthStart.getDay();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= monthEnd.getDate(); d++) {
    days.push(new Date(weekBase.getFullYear(), weekBase.getMonth(), d));
  }
  while (days.length % 7 !== 0) days.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const todayKey = formatDateKey(new Date());

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 min-w-[700px]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm border-b border-border/30 p-2 text-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{d}</span>
          </div>
        ))}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (!day) {
              return <div key={`empty-${wi}-${di}`} className="border-b border-r border-border/10 min-h-[100px] bg-muted/5" />;
            }
            const dateKey = formatDateKey(day);
            const dayItems = calendarData[dateKey] || [];
            const isToday = dateKey === todayKey;

            return (
              <div
                key={dateKey}
                data-testid={`month-cell-${dateKey}`}
                className={cn(
                  "border-b border-r border-border/10 min-h-[100px] p-1",
                  isToday && "bg-primary/[0.03]"
                )}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, dateKey, 9)}
              >
                <p className={cn("text-xs mb-1", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                  {day.getDate()}
                </p>
                <div className="space-y-0.5">
                  {dayItems.slice(0, 3).map((item) => (
                    <CalendarCard
                      key={item.id}
                      item={item}
                      onClick={() => onItemClick(item)}
                      onDragStart={(e) => onDragStart(e, item)}
                    />
                  ))}
                  {dayItems.length > 3 && (
                    <p className="text-[9px] text-muted-foreground text-center">+{dayItems.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
