import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, MessageSquare, Repeat, Heart, Eye, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useActivityLogs, usePeakTimes, useAnalyticsData } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const StatCard = ({ title, value, change, icon: Icon, delay }: any) => (
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
        <div className="flex items-center text-green-400 text-sm font-medium">
          {change} <ArrowUpRight size={16} />
        </div>
      </div>
      <div>
        <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-display font-bold tracking-tight" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
      </div>
    </Card>
  </motion.div>
);

export default function Dashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsData();
  const { data: peakTimes, isLoading: peakTimesLoading } = usePeakTimes();
  const { data: logs, isLoading: logsLoading } = useActivityLogs();

  const topPeak = peakTimes?.reduce((best, t) => (t.score > (best?.score ?? 0) ? t : best), peakTimes[0]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight" data-testid="text-dashboard-title">Overview</h1>
          <p className="text-muted-foreground mt-1">System performance and audience growth.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-full text-sm font-medium flex items-center gap-2">
            <Zap size={14} className="fill-accent" />
            Peak Engagement: {topPeak ? topPeak.time : "—"}
          </div>
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
        <StatCard title="Total Impressions" value="1.2M" change="+12.5%" icon={Eye} delay={0.1} />
        <StatCard title="Engagement Rate" value="4.8%" change="+2.1%" icon={Heart} delay={0.2} />
        <StatCard title="Auto-Replies" value="842" change="+18.2%" icon={MessageSquare} delay={0.3} />
        <StatCard title="Retweets" value="12.4K" change="+5.4%" icon={Repeat} delay={0.4} />
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
              <p className="text-sm text-muted-foreground">Engagement and follower growth over time</p>
            </div>
            <div className="h-[300px] w-full">
              {analyticsLoading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics ?? []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area type="monotone" dataKey="engagement" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorEngagement)" />
                    <Area type="monotone" dataKey="followers" stroke="hsl(var(--accent))" strokeWidth={2} fillOpacity={1} fill="url(#colorFollowers)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="glass-panel p-6 rounded-xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold font-display">Audience Activity Peak</h2>
                <p className="text-sm text-muted-foreground">Recommended posting times based on follower heatmaps</p>
              </div>
              <Badge className="bg-accent text-white border-0">Highly Optimized</Badge>
            </div>
            <div className="h-[200px] w-full">
              {peakTimesLoading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={peakTimes ?? []} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
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
                    />
                    <Area type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            {!peakTimesLoading && peakTimes && peakTimes.length > 0 && (
              <div className="grid grid-cols-7 gap-2 mt-4 text-center">
                {peakTimes.map((t, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">{t.day}</p>
                    <p className={`text-[10px] font-bold ${t.score > 90 ? 'text-accent' : 'text-foreground'}`}>{t.time}</p>
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
              <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
            ) : (
              (logs ?? []).map((log) => (
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
            <div className="flex gap-3 text-sm border-l-2 border-accent/20 pl-3">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
              <div className="space-y-1">
                <p className="font-medium leading-none text-accent">Heatmap Sync</p>
                <p className="text-xs text-muted-foreground">Updating best times based on last 24h engagement...</p>
                <p className="text-[10px] text-muted-foreground/60">Just now</p>
              </div>
            </div>
          </div>
          <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-primary" data-testid="button-view-logs">View Full Logs</Button>
        </motion.div>
      </div>
    </div>
  );
}