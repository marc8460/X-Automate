import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Users, UserPlus, Send, CalendarDays, TrendingUp } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useActivityLogs, useDashboardStats } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  const [platform, setPlatform] = useState<OverviewPlatform>("x");
  const { data: stats, isLoading: statsLoading } = useDashboardStats(platform);
  const { data: logs, isLoading: logsLoading } = useActivityLogs();

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight" data-testid="text-dashboard-title">Overview</h1>
          <p className="text-muted-foreground mt-1">Live performance from your connected accounts.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-secondary/30 rounded-lg p-0.5 border border-border/50" data-testid="overview-platform-tabs">
            {(["x", "threads"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  platform === p
                    ? "bg-primary/20 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`tab-overview-${p}`}
              >
                {p === "x" ? (
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                ) : (
                  <svg viewBox="0 0 192 192" className="w-3.5 h-3.5 fill-current"><path d="M141.537 88.988c-.827-.394-1.667-.776-2.518-1.143-1.482-27.307-16.403-42.94-41.457-43.1h-.338c-15 0-27.457 6.397-35.128 18.037l13.779 9.452c5.731-8.695 14.724-10.548 21.347-10.548h.077c8.25.053 14.474 2.451 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.049-7.314-1.243-15.224-1.625-23.68-1.14-23.82 1.372-39.134 15.265-38.106 34.569.52 9.792 5.399 18.216 13.734 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.23-5.436 29.05-14.127 5.178-6.6 8.453-15.153 9.9-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.059-7.484-51.275-21.742-10.502-13.351-15.93-32.635-16.133-57.317.203-24.682 5.631-43.966 16.133-57.317 11.216-14.258 28.466-21.573 51.275-21.742 22.975.17 40.526 7.511 52.171 21.838 5.71 7.025 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.607-16.22-32.643C147.036 10.296 125.202 1.063 97.07.928h-.111C68.88 1.063 47.292 10.274 32.788 27.974 19.882 43.807 13.224 66.174 13.001 95.933L13 96l.001.067c.223 29.759 6.881 52.126 19.787 67.959 14.504 17.7 36.094 26.91 64.169 27.046h.111c24.96-.121 44.456-6.856 58.857-20.853 19.126-18.66 18.752-42.139 12.402-56.747-4.918-11.815-13.874-20.696-26.79-26.484zM98.44 129.507c-10.44.588-21.286-4.098-21.82-14.135-.384-7.442 5.308-15.746 22.473-16.736 1.966-.113 3.896-.168 5.79-.168 6.235 0 12.068.606 17.372 1.766-1.978 24.702-13.58 28.713-23.815 29.273z" /></svg>
                )}
                {p === "x" ? "X" : "Threads"}
              </button>
            ))}
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
