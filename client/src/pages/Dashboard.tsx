import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Users, UserPlus, Send, CalendarDays, TrendingUp, Eye, Heart, MessageSquare, Globe, Plug, Smartphone, CheckCircle2, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useActivityLogs, useDashboardStats, useConnectedAccounts } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/contexts/PlatformContext";
import { isExtensionConnected } from "@/lib/extensionBridge";
import { Link } from "wouter";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

const StatCard = ({ title, value, icon: Icon, delay, loading, badge }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Card className="p-6 glass-panel relative overflow-hidden group" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-secondary/50 rounded-lg text-primary">
          <Icon size={20} />
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <div className="flex items-center text-primary/60 text-[10px] font-medium uppercase tracking-wider">
            Live <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-3xl font-display font-bold tracking-tight" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
        )}
      </div>
    </Card>
  </motion.div>
);

function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
      {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {positive ? "+" : ""}{value} today
    </span>
  );
}

type OverviewPlatform = "x" | "threads";

export default function Dashboard() {
  const { selectedPlatform } = usePlatform();
  const platform = (selectedPlatform === "all" || !["x", "threads"].includes(selectedPlatform) ? "x" : selectedPlatform) as OverviewPlatform;
  const { data: stats, isLoading: statsLoading } = useDashboardStats(platform);
  const { data: logs, isLoading: logsLoading } = useActivityLogs();
  const { data: connectedAccounts } = useConnectedAccounts();

  const xConnected = Array.isArray(connectedAccounts) && connectedAccounts.some((a: any) => a.platform === "x");
  const threadsConnected = Array.isArray(connectedAccounts) && connectedAccounts.some((a: any) => a.platform === "threads");
  const extensionConnected = isExtensionConnected();
  const setupSteps = [xConnected, threadsConnected, extensionConnected, false];
  const setupComplete = setupSteps.filter(Boolean).length;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight" data-testid="text-dashboard-title">Overview</h1>
          <p className="text-muted-foreground mt-1">Live performance from your connected accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          {stats && stats.postsThisWeek > 0 && (
            <div className="px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-full text-sm font-medium flex items-center gap-2">
              <TrendingUp size={14} />
              {stats.postsThisWeek} posts this week
            </div>
          )}
          <div className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Engaging Active (24/7)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Followers"
          value={stats ? formatNumber(stats.followers) : "—"}
          icon={Users}
          delay={0.1}
          loading={statsLoading}
          badge={stats ? <GrowthBadge value={stats.followerGrowthToday} /> : null}
        />
        <StatCard
          title="Following"
          value={stats ? formatNumber(stats.following) : "—"}
          icon={UserPlus}
          delay={0.2}
          loading={statsLoading}
        />
        <StatCard
          title="Total Posts"
          value={stats ? formatNumber(stats.tweetCount) : "—"}
          icon={Send}
          delay={0.3}
          loading={statsLoading}
        />
        <StatCard
          title="Posts Today"
          value={stats ? String(stats.postsToday) : "—"}
          icon={CalendarDays}
          delay={0.4}
          loading={statsLoading}
          badge={stats && stats.repliesToday > 0 ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
              +{stats.repliesToday} replies
            </span>
          ) : null}
        />
      </div>

      {/* Aura Tools + Setup Status row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Aura Tools Widget */}
        <Card className="glass-panel p-5">
          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-4">Your Aura Toolkit</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Globe size={16} className="text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Webapp <span className="text-[10px] font-normal text-primary/60 ml-1">you're here</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">Planning · Analytics · AI creation · Instagram DMs</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/40">
              <Plug size={16} className={cn("mt-0.5 shrink-0", extensionConnected ? "text-amber-400" : "text-muted-foreground/50")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Browser Extension</p>
                <p className="text-xs text-muted-foreground mt-0.5">Desktop comments · X publishing</p>
              </div>
              {extensionConnected ? (
                <span className="text-[9px] font-semibold text-amber-400 border border-amber-400/20 rounded px-1.5 py-0.5 shrink-0">Active</span>
              ) : (
                <a href="https://chrome.google.com/webstore" target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-primary/70 border border-primary/20 rounded px-1.5 py-0.5 shrink-0 hover:text-primary transition-colors whitespace-nowrap">
                  Install →
                </a>
              )}
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border/30 opacity-60">
              <Smartphone size={16} className="text-muted-foreground/50 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground/60">Mobile Tool</p>
                <p className="text-xs text-muted-foreground mt-0.5">On-the-go replies · Comment generation</p>
              </div>
              <span className="text-[9px] font-medium text-muted-foreground/40 border border-border/30 rounded px-1.5 py-0.5 shrink-0">Soon</span>
            </div>
          </div>
        </Card>

        {/* Setup Status Widget */}
        <Card className="glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Aura Setup</p>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              setupComplete === 4 ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/10 text-primary"
            )}>
              {setupComplete}/4 complete
            </span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "X Connected", done: xConnected, href: "/settings" },
              { label: "Threads Connected", done: threadsConnected, href: "/settings" },
              { label: "Browser Extension", done: extensionConnected, href: "/setup", actionLabel: "Install now" },
              { label: "AI Keyboard", done: false, soon: true },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                {step.done ? (
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                ) : step.soon ? (
                  <Clock size={15} className="text-muted-foreground/30 shrink-0" />
                ) : (
                  <AlertCircle size={15} className="text-amber-400/70 shrink-0" />
                )}
                <span className={cn(
                  "text-sm flex-1",
                  step.done ? "text-foreground/70" : step.soon ? "text-muted-foreground/40" : "text-foreground"
                )}>
                  {step.label}
                </span>
                {!step.done && !step.soon && step.href && (
                  <Link href={step.href} className="text-[10px] font-medium text-primary/70 hover:text-primary transition-colors flex items-center gap-0.5">
                    {step.actionLabel || "Set up"} <ChevronRight size={10} />
                  </Link>
                )}
                {step.soon && (
                  <span className="text-[9px] text-muted-foreground/30">Soon</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {platform === "threads" && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <StatCard
            title="Total Likes"
            value={stats?.totalLikes !== undefined ? formatNumber(stats.totalLikes) : "—"}
            icon={Heart}
            delay={0.1}
            loading={statsLoading}
          />
          <StatCard
            title="Total Replies"
            value={stats?.totalReplies !== undefined ? formatNumber(stats.totalReplies) : "—"}
            icon={MessageSquare}
            delay={0.2}
            loading={statsLoading}
          />
          <StatCard
            title="Total Views"
            value={stats?.totalViews !== undefined ? formatNumber(stats.totalViews) : "—"}
            icon={Eye}
            delay={0.3}
            loading={statsLoading}
          />
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="lg:col-span-2 space-y-8"
        >
          <Card className="glass-panel p-6 rounded-xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold font-display">Posting Activity</h2>
              <p className="text-sm text-muted-foreground">Posts and replies per day (last 14 days)</p>
            </div>
            <div className="h-[300px] w-full">
              {statsLoading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : !stats?.postingHistory?.length ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No posting data yet — post a tweet to see activity here.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.postingHistory} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} dy={10} interval={1} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: any) => [value, "Posts"]}
                    />
                    <Bar dataKey="posts" fill="url(#colorPosts)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="glass-panel p-6 rounded-xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold font-display">Follower Growth</h2>
                <p className="text-sm text-muted-foreground">Follower count over time</p>
              </div>
              {stats && stats.followerGrowthWeek !== 0 && (
                <Badge className={`border-0 ${stats.followerGrowthWeek > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {stats.followerGrowthWeek > 0 ? "+" : ""}{stats.followerGrowthWeek} this week
                </Badge>
              )}
            </div>
            <div className="h-[200px] w-full">
              {statsLoading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : !stats?.followerHistory?.length ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Follower tracking will appear after the first poll cycle.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.followerHistory} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} interval="preserveStartEnd" />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      labelStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
                      formatter={(value: any, name: string) => {
                        if (name === "followers") return [formatNumber(value), "Followers"];
                        return [value, name];
                      }}
                    />
                    <Area type="monotone" dataKey="followers" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorFollowers)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="glass-panel p-6 rounded-xl space-y-6"
        >
          <div>
            <h2 className="text-xl font-bold font-display">System Logs</h2>
            <p className="text-sm text-muted-foreground">Real-time activity feed</p>
          </div>
          <div className="space-y-4" data-testid="activity-logs">
            {logsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-1.5 h-1.5 rounded-full mt-1" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                </div>
              ))
            ) : (logs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No activity yet — post a tweet or reply to see logs here.</p>
            ) : (
              (logs ?? []).slice(0, 15).map((log) => (
                <div key={log.id} className="flex gap-3 text-sm" data-testid={`log-entry-${log.id}`}>
                  <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-primary'}`} />
                  <div className="space-y-1">
                    <p className="font-medium leading-none">{log.action}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{log.detail}</p>
                    <p className="text-[10px] text-muted-foreground/60">{(() => {
                      const d = new Date(log.time);
                      return isNaN(d.getTime()) ? log.time : d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, month: "short", day: "numeric" });
                    })()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
