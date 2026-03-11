import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Target, Zap, RefreshCw } from "lucide-react";
import { useDailyGoals, useLogActivity, type DailyGoal } from "@/lib/hooks";
import { usePlatform } from "@/contexts/PlatformContext";
import { useToast } from "@/hooks/use-toast";

type Platform = "x" | "threads" | "instagram";

const PLATFORM_LABELS: Record<Platform, string> = {
  x: "X (Twitter)",
  threads: "Threads",
  instagram: "Instagram",
};

const PLATFORM_RECOMMENDATIONS: Record<Platform, { title: string; tips: string[] }> = {
  x: {
    title: "X Growth Strategy",
    tips: [
      "Reply to 30 tweets per day to maximize reach and discoverability.",
      "Post 2–3 original tweets focused on your niche daily.",
      "Quote tweet viral posts with your unique perspective.",
      "Engage with top creators in your space to get noticed.",
    ],
  },
  threads: {
    title: "Threads Growth Strategy",
    tips: [
      "Post 1–2 threads per day for consistent algorithm boost.",
      "Reply to 15 conversations to build community presence.",
      "Like 20 posts to increase your own visibility.",
      "Start conversations by asking engaging questions.",
    ],
  },
  instagram: {
    title: "Instagram Growth Strategy",
    tips: [
      "Post at least 1 feed photo daily for algorithm priority.",
      "Use 3 stories per day to stay top-of-mind with followers.",
      "Comment on 10 posts in your niche to drive profile visits.",
      "Post 1 Reel weekly — Reels get 3x more reach than images.",
    ],
  },
};

const PLATFORM_ACTIONS: Record<Platform, { action: string; label: string }[]> = {
  x: [
    { action: "reply_posted", label: "Reply posted" },
    { action: "post_created", label: "Post created" },
    { action: "quote_tweet", label: "Quote tweet" },
    { action: "like_given", label: "Like given" },
  ],
  threads: [
    { action: "reply_posted", label: "Reply posted" },
    { action: "post_created", label: "Thread posted" },
    { action: "like_given", label: "Like given" },
    { action: "conversation_started", label: "Conversation started" },
  ],
  instagram: [
    { action: "post_created", label: "Post uploaded" },
    { action: "story_posted", label: "Story posted" },
    { action: "comment_written", label: "Comment written" },
    { action: "reel_uploaded", label: "Reel uploaded" },
  ],
};

function getProgressColor(current: number, target: number) {
  if (current >= target) return "bg-emerald-500";
  if (current / target >= 0.5) return "bg-amber-500";
  return "bg-primary";
}

function GoalCard({ goal, index }: { goal: DailyGoal; index: number }) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const done = goal.current >= goal.target;
  const remaining = Math.max(0, goal.target - goal.current);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      <Card
        className={`p-5 glass-panel relative overflow-hidden transition-all duration-300 ${
          done ? "border-emerald-500/40" : "border-border/50"
        }`}
      >
        {done && (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
        )}

        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{goal.emoji}</span>
            <span className="text-sm font-medium text-foreground">{goal.label}</span>
          </div>
          {done ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs gap-1">
              <CheckCircle2 size={11} />
              Done
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground font-mono">
              {goal.current} / {goal.target}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${getProgressColor(goal.current, goal.target)}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: index * 0.07 + 0.2, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {done
              ? "Goal complete! Great work."
              : `${remaining} ${goal.label.toLowerCase()} remaining to hit your target.`}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

function GoalCardSkeleton() {
  return (
    <Card className="p-5 glass-panel">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="h-2 w-full mb-1.5" />
      <Skeleton className="h-3 w-48" />
    </Card>
  );
}

export default function DailyGoals() {
  const { selectedPlatform } = usePlatform();
  const platform = (selectedPlatform === "all" || !["x", "threads", "instagram"].includes(selectedPlatform)
    ? "x"
    : selectedPlatform) as Platform;
  const [logAction, setLogAction] = useState<string>("");

  const { data, isLoading, refetch, isFetching } = useDailyGoals(platform);
  const { mutate: logActivity, isPending: isLogging } = useLogActivity();
  const { toast } = useToast();
  const prevGoalsRef = useRef<DailyGoal[]>([]);

  const goals = data?.goals ?? [];

  useEffect(() => {
    const prev = prevGoalsRef.current;
    if (prev.length > 0 && goals.length > 0) {
      goals.forEach((goal) => {
        const prevGoal = prev.find((g) => g.action === goal.action);
        if (prevGoal && prevGoal.current < prevGoal.target && goal.current >= goal.target) {
          const celebrationKey = `goal-celebrated-${goal.action}-${new Date().toLocaleDateString("en-CA")}`;
          if (!localStorage.getItem(celebrationKey)) {
            localStorage.setItem(celebrationKey, "1");
            toast({
              title: `🎉 ${goal.label} goal complete!`,
              description:
                goal.action === "reply_posted"
                  ? "Amazing work! You've hit your daily reply target. Keep crushing it! 🚀"
                  : "Great job! Keep up the momentum.",
            });
          }
        }
      });
    }
    prevGoalsRef.current = goals;
  }, [goals]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const completedCount = goals.filter((g) => g.current >= g.target).length;
  const totalGoals = goals.length;
  const overallPct = totalGoals === 0 ? 0 : Math.round((completedCount / totalGoals) * 100);

  const recommendations = PLATFORM_RECOMMENDATIONS[platform];
  const actionOptions = PLATFORM_ACTIONS[platform];

  function handleLogActivity() {
    if (!logAction) return;
    logActivity({ action: logAction, platform });
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Target size={18} />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Daily Goals</h1>
          </div>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>

        {/* Overall progress badge */}
        {!isLoading && totalGoals > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Overall</p>
              <p className="text-sm font-semibold">
                {completedCount} / {totalGoals} goals
              </p>
            </div>
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={overallPct === 100 ? "rgb(52 211 153)" : "hsl(var(--primary))"}
                  strokeWidth="4"
                  strokeDasharray={`${(overallPct / 100) * 125.6} 125.6`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                {overallPct}%
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Refresh button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center"
      >
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
        </button>
      </motion.div>

      {/* Goals grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <GoalCardSkeleton key={i} />)
          : goals.map((goal, i) => <GoalCard key={goal.action} goal={goal} index={i} />)}
      </div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <Card className="p-5 glass-panel">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Zap size={15} />
            </div>
            <h2 className="text-sm font-semibold">{recommendations.title}</h2>
          </div>
          <ul className="space-y-2.5">
            {recommendations.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>

      {/* Manual log section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        <Card className="p-5 glass-panel">
          <h2 className="text-sm font-semibold mb-1">Log an action manually</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Use this to manually record an action, or test the extension integration.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Select value={logAction} onValueChange={setLogAction}>
              <SelectTrigger className="w-52 bg-secondary/30 border-border/50 text-sm">
                <SelectValue placeholder="Select action…" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((opt) => (
                  <SelectItem key={opt.action} value={opt.action}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleLogActivity}
              disabled={!logAction || isLogging}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              {isLogging ? "Logging…" : "Log action"}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
