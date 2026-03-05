import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, MessageSquare, Repeat, Heart, Users, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useActivityLogs, useTwitterMetrics, useTwitterPeakTimes } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

const StatCard = ({ title, value, icon: Icon, delay, loading }: any) => (
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
        <div className="flex items-center text-primary/60 text-[10px] font-medium uppercase tracking-wider">
          Live <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
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

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useTwitterMetrics();
  const { data: peakData, isLoading: peakLoading } = useTwitterPeakTimes();
  const { data: logs, isLoading: logsLoading } = useActivityLogs();

  const peakTimes = peakData?.peakTimes ?? [];
  const topPeak = peakData?.topPeak;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight" data-testid="text-dashboard-title">Overview</h1>
          <p className="text-muted-foreground mt-1">Live performance from your connected X account.</p>
        </div>
        <div className="flex items-center gap-2">
          {topPeak && (
            <div className="px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-full text-sm font-medium flex items-center gap-2">
              <Zap size={14} className="fill-accent" />
              Peak: {topPeak.day} {topPeak.time}
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
        <StatCard title="Followers" value={metrics ? formatNumber(metrics.followers) : "—"} icon={Users} delay={0.1} loading={metricsLoading} />
        <StatCard title="Engagement Rate" value={metrics ? `${metrics.engagementRate}%` : "—"} icon={Heart} delay={0.2} loading={metricsLoading} />
        <StatCard title="Impressions" value={metrics ? formatNumber(metrics.impressions) : "—"} icon={MessageSquare} delay={0.3} loading={metricsLoading} />
        <StatCard title="Retweets" value={metrics ? formatNumber(metrics.retweets) : "—"} icon={Repeat} delay={0.4} loading={metricsLoading} />
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
              <h2 className="text-xl font-bold font-display">Performance Metrics</h2>
              <p className="text-sm text-muted-foreground">Engagement per day from your recent tweets</p>
            </div>
            <div className="h-[300px] w-full">
              {metricsLoading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : !metrics?.dailyMetrics?.length ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No tweet data available yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.dailyMetrics} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area type="monotone" dataKey="engagement" name="Engagement" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorEngagement)" />
                    <Area type="monotone" dataKey="impressions" name="Impressions" stroke="hsl(var(--accent))" strokeWidth={2} fillOpacity={1} fill="url(#colorImpressions)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="glass-panel p-6 rounded-xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold font-display">Audience Activity Peak</h2>
                <p className="text-sm text-muted-foreground">Best posting times based on your tweet engagement data</p>
              </div>
              {topPeak && topPeak.score > 0 && (
                <Badge className="bg-accent text-white border-0">Best: {topPeak.day} {topPeak.time}</Badge>
              )}
            </div>
            <div className="h-[200px] w-full">
              {peakLoading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : peakTimes.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No peak time data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={peakTimes} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      labelStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
                      formatter={(value: any, name: string) => {
                        if (name === "score") return [`${value}/100`, "Engagement Score"];
                        return [value, name];
                      }}
                    />
                    <Area type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            {!peakLoading && peakTimes.length > 0 && (
              <div className="grid grid-cols-7 gap-2 mt-4 text-center">
                {peakTimes.map((t, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">{t.day}</p>
                    <p className={`text-[10px] font-bold ${t.score > 80 ? 'text-accent' : 'text-foreground'}`}>{t.time}</p>
                    <p className="text-[9px] text-muted-foreground/60">{t.tweetCount} tweets</p>
                  </div>
                ))}
              </div>
            )}
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
                    <p className="text-[10px] text-muted-foreground/60">{log.time}</p>
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
