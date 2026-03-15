import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wand2, MessageSquare, Layers, TrendingUp, ChevronRight,
  CheckCircle2, Circle, Target, Flame,
} from "lucide-react";
import { useDailyGoals } from "@/lib/hooks";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

type PlanAction = {
  icon: React.FC<any>;
  label: string;
  count: string;
  href: string;
  badge?: string;
  done?: boolean;
};

function PlanSection({
  title,
  icon: Icon,
  actions,
  delay,
}: {
  title: string;
  icon: React.FC<any>;
  actions: PlanAction[];
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="glass-panel p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
        </div>
        <div className="space-y-2">
          {actions.map((action) => (
            <Link key={action.label} href={action.href}>
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                action.done
                  ? "border-emerald-400/10 bg-emerald-400/5 opacity-60"
                  : "border-border/40 bg-secondary/20 hover:border-primary/20 hover:bg-primary/5"
              )}>
                {action.done
                  ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  : <Circle size={15} className="text-muted-foreground/40 shrink-0" />
                }
                <span className="text-sm font-medium flex-1">{action.label}</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  action.done
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-primary/10 text-primary"
                )}>
                  {action.count}
                </span>
                {action.badge && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40 border border-border/30 rounded px-1">
                    {action.badge}
                  </span>
                )}
                <ChevronRight size={13} className="text-muted-foreground/40 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

export default function DailyPlan() {
  const { data: xGoals } = useDailyGoals("x");
  const { data: threadsGoals } = useDailyGoals("threads");

  const { data: trendsData } = useQuery<{ topics: any[] }>({
    queryKey: ["/api/trending-topics", { geo: "US", niche: "", timeWindow: "now 1-d", sortBy: "recent" }],
    queryFn: async () => {
      const res = await fetch("/api/trending-topics?geo=US&niche=&timeWindow=now 1-d&sortBy=recent");
      if (!res.ok) return { topics: [] };
      return res.json();
    },
    staleTime: 3 * 60 * 1000,
  });

  // Build plan actions from goals
  const xPostGoal = xGoals?.goals?.find((g) => g.action === "post");
  const xReplyGoal = xGoals?.goals?.find((g) => g.action === "reply");
  const threadsPostGoal = threadsGoals?.goals?.find((g) => g.action === "post");
  const threadsReplyGoal = threadsGoals?.goals?.find((g) => g.action === "reply");

  const postActions: PlanAction[] = [
    {
      icon: Wand2,
      label: "Threads post",
      count: `${threadsPostGoal?.current ?? 0}/${threadsPostGoal?.target ?? 1}`,
      href: "/studio",
      badge: "API",
      done: (threadsPostGoal?.current ?? 0) >= (threadsPostGoal?.target ?? 1),
    },
    {
      icon: Wand2,
      label: "X post",
      count: `${xPostGoal?.current ?? 0}/${xPostGoal?.target ?? 1}`,
      href: "/studio",
      badge: "EXT",
      done: (xPostGoal?.current ?? 0) >= (xPostGoal?.target ?? 1),
    },
  ];

  const engageActions: PlanAction[] = [
    {
      icon: MessageSquare,
      label: "Viral comments",
      count: `${xReplyGoal?.current ?? 0}/${xReplyGoal?.target ?? 10}`,
      href: "/discover/comments",
      badge: "EXT",
      done: (xReplyGoal?.current ?? 0) >= (xReplyGoal?.target ?? 10),
    },
    {
      icon: MessageSquare,
      label: "Inbox replies",
      count: `${threadsReplyGoal?.current ?? 0}/${threadsReplyGoal?.target ?? 5}`,
      href: "/inbox/threads",
      done: (threadsReplyGoal?.current ?? 0) >= (threadsReplyGoal?.target ?? 5),
    },
  ];

  const storyActions: PlanAction[] = [
    {
      icon: Layers,
      label: "Instagram story",
      count: "0/2",
      href: "/studio/stories",
      done: false,
    },
  ];

  const completedToday = [
    ...postActions,
    ...engageActions,
    ...storyActions,
  ].filter((a) => a.done).length;

  const totalActions = postActions.length + engageActions.length + storyActions.length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Daily Plan</h1>
          <p className="text-muted-foreground mt-1">{TODAY}</p>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-full text-sm font-semibold border",
          completedToday === totalActions
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-400/20"
            : "bg-primary/10 text-primary border-primary/20"
        )}>
          <Target size={14} className="inline mr-2" />
          {completedToday}/{totalActions} actions completed
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Plan sections */}
        <div className="lg:col-span-2 space-y-5">
          <PlanSection
            title="Post"
            icon={Wand2}
            actions={postActions}
            delay={0.1}
          />
          <PlanSection
            title="Engage"
            icon={MessageSquare}
            actions={engageActions}
            delay={0.2}
          />
          <PlanSection
            title="Stories"
            icon={Layers}
            actions={storyActions}
            delay={0.3}
          />

          {/* Quick links */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="glass-panel p-5">
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Jump To</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Content Studio", href: "/studio" },
                  { label: "Trends", href: "/discover/trends" },
                  { label: "Threads Inbox", href: "/inbox/threads" },
                  { label: "Media Vault", href: "/vault" },
                  { label: "Creator Watch", href: "/creators" },
                  { label: "Analytics", href: "/analytics" },
                ].map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      {link.label} <ChevronRight size={10} className="ml-1" />
                    </Button>
                  </Link>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Right: Trending now */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-5"
        >
          <Card className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <Flame size={16} className="text-amber-400" />
              <p className="text-sm font-semibold">Trending Now</p>
              <span className="text-[10px] text-muted-foreground/50">US</span>
            </div>
            {!trendsData?.topics?.length ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading trends…</p>
            ) : (
              <div className="space-y-2">
                {trendsData.topics.slice(0, 8).map((topic: any, i: number) => (
                  <Link key={i} href="/discover/trends">
                    <div className="flex items-center gap-2 py-1.5 hover:text-primary transition-colors cursor-pointer">
                      <span className="text-[10px] text-muted-foreground/40 w-4 shrink-0">#{i + 1}</span>
                      <span className="text-sm truncate">{topic.topic || topic.title}</span>
                    </div>
                  </Link>
                ))}
                <Link href="/discover/trends">
                  <p className="text-xs text-primary/70 mt-2 hover:text-primary transition-colors">
                    See all trends →
                  </p>
                </Link>
              </div>
            )}
          </Card>

          <Card className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-primary" />
              <p className="text-sm font-semibold">Goal Progress</p>
            </div>
            {[
              { label: "Posts", goal: xGoals },
              { label: "Threads posts", goal: threadsGoals },
            ].map(({ label, goal }) => {
              const postGoal = goal?.goals?.find((g) => g.action === "post");
              if (!postGoal) return null;
              const pct = Math.min(100, Math.round((postGoal.current / postGoal.target) * 100));
              return (
                <div key={label} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-medium">{postGoal.current}/{postGoal.target}</span>
                  </div>
                  <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <Link href="/goals">
              <p className="text-xs text-primary/70 mt-2 hover:text-primary transition-colors">
                View all goals →
              </p>
            </Link>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
