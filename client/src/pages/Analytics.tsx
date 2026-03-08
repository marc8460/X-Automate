import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import {
  MessageSquare, Repeat, Heart, Users, Zap, TrendingUp, ArrowUpRight, BarChart3, Eye,
} from "lucide-react";
import { useTwitterMetrics, useTwitterPeakTimes, useActivityLogs, useThreadsMetrics } from "@/lib/hooks";
import { PlatformBadge } from "@/components/platform/PlatformBadge";
import { usePlatform } from "@/contexts/PlatformContext";

type AnalyticsTab = "x" | "threads" | "compare";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}


function StatCard({
  title,
  value,
  icon: Icon,
  delay,
  loading,
  platform,
  change,
  ...props
}: {
  title: string;
  value: string;
  icon: React.FC<{ size?: number; className?: string }>;
  delay: number;
  loading: boolean;
  platform?: "x" | "threads";
  change?: string;
  "data-testid"?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <Card className="p-5 glass-panel relative overflow-hidden group" data-testid={props["data-testid"]}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 bg-secondary/50 rounded-lg text-primary">
            <Icon size={18} />
          </div>
          {platform && <PlatformBadge platform={platform} size="xs" />}
        </div>
        <h3 className="text-muted-foreground text-xs font-medium mb-1">{title}</h3>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="flex items-end gap-2">
            <p className="text-2xl font-display font-bold tracking-tight">{value}</p>
            {change && (
              <span className="text-xs text-emerald-400 flex items-center gap-0.5 mb-0.5">
                <ArrowUpRight size={12} />
                {change}
              </span>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function PlatformEmptyState({ platform }: { platform: "threads" }) {
  return (
    <div className="py-16 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center">
        <BarChart3 className="w-7 h-7 text-muted-foreground/30" />
      </div>
      <div className="text-center">
        <p className="font-medium text-muted-foreground mb-1">No {platform.charAt(0).toUpperCase() + platform.slice(1)} data yet</p>
        <p className="text-sm text-muted-foreground/60 max-w-xs">
          Connect your {platform.charAt(0).toUpperCase() + platform.slice(1)} account in Settings to start tracking analytics here.
        </p>
      </div>
      <Badge variant="outline" className="text-xs border-border/40 text-muted-foreground">
        Coming Soon
      </Badge>
    </div>
  );
}

export default function Analytics() {
  const [isCompare, setIsCompare] = useState(false);
  const { selectedPlatform } = usePlatform();
  const tab: AnalyticsTab = isCompare ? "compare" : (selectedPlatform === "threads" ? "threads" : "x");
  const { data: metrics, isLoading: metricsLoading } = useTwitterMetrics();
  const { data: threadsMetrics, isLoading: threadsLoading } = useThreadsMetrics();
  const { data: peakData, isLoading: peakLoading } = useTwitterPeakTimes();
  const { data: logs } = useActivityLogs();

  const peakTimes = peakData?.peakTimes ?? [];
  const topPeak = peakData?.topPeak;
  const dailyMetrics = metrics?.dailyMetrics ?? [];
  const threadsDailyMetrics = threadsMetrics?.dailyMetrics ?? [];

  // Merged data for compare view
  const compareData = dailyMetrics.map((d, i) => ({
    date: d.date,
    "X Engagement": d.engagement,
    "X Impressions": d.impressions,
    "Threads Engagement": threadsDailyMetrics[i]?.engagement ?? 0,
    "Threads Impressions": threadsDailyMetrics[i]?.views ?? 0,
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Unified performance metrics across all platforms.</p>
        </div>

        {/* Compare toggle */}
        <button
          onClick={() => setIsCompare((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
            isCompare
              ? "bg-primary/20 text-primary border-primary/30 shadow-sm"
              : "text-muted-foreground hover:text-foreground border-border/40 bg-secondary/30"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Compare Platforms
        </button>
      </div>

      {/* X tab */}
      {tab === "x" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Followers"
              value={metrics ? formatNumber(metrics.followers) : "—"}
              icon={Users}
              delay={0.1}
              loading={metricsLoading}
              platform="x"
            />
            <StatCard
              title="Engagement Rate"
              value={metrics ? `${metrics.engagementRate}%` : "—"}
              icon={Heart}
              delay={0.15}
              loading={metricsLoading}
              platform="x"
            />
            <StatCard
              title="Impressions"
              value={metrics ? formatNumber(metrics.impressions) : "—"}
              icon={MessageSquare}
              delay={0.2}
              loading={metricsLoading}
              platform="x"
            />
            <StatCard
              title="Retweets"
              value={metrics ? formatNumber(metrics.retweets) : "—"}
              icon={Repeat}
              delay={0.25}
              loading={metricsLoading}
              platform="x"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="glass-panel p-6 rounded-xl">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold font-display">Performance Over Time</h2>
                    <p className="text-sm text-muted-foreground">Engagement and impressions from recent posts</p>
                  </div>
                  {topPeak && (
                    <div className="px-3 py-1.5 bg-accent/10 text-accent border border-accent/20 rounded-full text-xs font-medium flex items-center gap-1.5">
                      <Zap size={12} className="fill-accent" />
                      Peak: {topPeak.day} {topPeak.time}
                    </div>
                  )}
                </div>
                <div className="h-[280px]">
                  {metricsLoading ? (
                    <Skeleton className="h-full w-full rounded-lg" />
                  ) : !dailyMetrics.length ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      No tweet data available yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyMetrics} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gEngagement" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gImpressions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                        <Area type="monotone" dataKey="engagement" name="Engagement" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#gEngagement)" />
                        <Area type="monotone" dataKey="impressions" name="Impressions" stroke="hsl(var(--accent))" strokeWidth={2} fillOpacity={1} fill="url(#gImpressions)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              <Card className="glass-panel p-6 rounded-xl">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h2 className="text-xl font-bold font-display">Audience Activity Peak</h2>
                    <p className="text-sm text-muted-foreground">Best posting times based on engagement data</p>
                  </div>
                  {topPeak && topPeak.score > 0 && (
                    <Badge className="bg-accent text-white border-0">Best: {topPeak.day} {topPeak.time}</Badge>
                  )}
                </div>
                <div className="h-[180px]">
                  {peakLoading ? (
                    <Skeleton className="h-full w-full rounded-lg" />
                  ) : peakTimes.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No peak time data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={peakTimes} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                          labelStyle={{ color: "hsl(var(--primary))", fontWeight: "bold" }}
                          formatter={(value: any, name: string) => name === "score" ? [`${value}/100`, "Engagement Score"] : [value, name]}
                        />
                        <Area type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#gScore)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {!peakLoading && peakTimes.length > 0 && (
                  <div className="grid grid-cols-7 gap-2 mt-4 text-center">
                    {peakTimes.map((t, idx) => (
                      <div key={idx} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">{t.day}</p>
                        <p className={`text-[10px] font-bold ${t.score > 80 ? "text-accent" : "text-foreground"}`}>{t.time}</p>
                        <p className="text-[9px] text-muted-foreground/60">{t.tweetCount} posts</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* System Logs */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="glass-panel p-6 rounded-xl space-y-5"
            >
              <div>
                <h2 className="text-xl font-bold font-display">System Logs</h2>
                <p className="text-sm text-muted-foreground">Real-time activity feed</p>
              </div>
              <div className="space-y-4">
                {(logs ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
                ) : (
                  (logs ?? []).slice(0, 15).map((log) => (
                    <div key={log.id} className="flex gap-3 text-sm">
                      <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${log.status === "success" ? "bg-green-500" : "bg-primary"}`} />
                      <div className="space-y-0.5">
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
        </>
      )}

      {/* Threads tab */}
      {tab === "threads" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Followers"
              value={threadsMetrics ? formatNumber(threadsMetrics.followers) : "—"}
              icon={Users}
              delay={0.1}
              loading={threadsLoading}
              platform="threads"
              data-testid="stat-threads-followers"
            />
            <StatCard
              title="Engagement Rate"
              value={threadsMetrics ? `${threadsMetrics.engagementRate}%` : "—"}
              icon={Heart}
              delay={0.15}
              loading={threadsLoading}
              platform="threads"
              data-testid="stat-threads-engagement"
            />
            <StatCard
              title="Views"
              value={threadsMetrics ? formatNumber(threadsMetrics.views) : "—"}
              icon={Eye}
              delay={0.2}
              loading={threadsLoading}
              platform="threads"
              data-testid="stat-threads-views"
            />
            <StatCard
              title="Replies"
              value={threadsMetrics ? formatNumber(threadsMetrics.replies) : "—"}
              icon={MessageSquare}
              delay={0.25}
              loading={threadsLoading}
              platform="threads"
              data-testid="stat-threads-replies"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="glass-panel p-6 rounded-xl" data-testid="chart-threads-performance">
                <div className="mb-5">
                  <h2 className="text-xl font-bold font-display">Performance Over Time</h2>
                  <p className="text-sm text-muted-foreground">Engagement and views from recent Threads</p>
                </div>
                <div className="h-[280px]">
                  {threadsLoading ? (
                    <Skeleton className="h-full w-full rounded-lg" />
                  ) : !threadsDailyMetrics.length ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      No Threads data available yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={threadsDailyMetrics} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gTEngagement" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gTViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                        <Area type="monotone" dataKey="engagement" name="Engagement" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#gTEngagement)" />
                        <Area type="monotone" dataKey="views" name="Views" stroke="hsl(var(--accent))" strokeWidth={2} fillOpacity={1} fill="url(#gTViews)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              <Card className="glass-panel p-6 rounded-xl" data-testid="table-threads-top-posts">
                <div className="mb-5">
                  <h2 className="text-xl font-bold font-display">Top Posts</h2>
                  <p className="text-sm text-muted-foreground">Highest performing posts by engagement</p>
                </div>
                <div className="space-y-4">
                  {threadsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                  ) : !threadsMetrics?.topPosts.length ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">No posts tracked yet</div>
                  ) : (
                    threadsMetrics.topPosts.map((post) => (
                      <div key={post.id} className="flex gap-4 p-4 rounded-lg bg-secondary/20 border border-border/40 hover:border-primary/30 transition-colors" data-testid={`row-threads-post-${post.id}`}>
                        {post.thumbnail_url && (
                          <div className="w-16 h-16 rounded overflow-hidden shrink-0">
                            <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2 mb-2 font-medium" data-testid={`text-post-content-${post.id}`}>{post.text}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1" data-testid={`text-post-likes-${post.id}`}><Heart size={12} /> {formatNumber(post.likes)}</span>
                            <span className="flex items-center gap-1" data-testid={`text-post-replies-${post.id}`}><MessageSquare size={12} /> {formatNumber(post.replies)}</span>
                            <span className="flex items-center gap-1" data-testid={`text-post-reposts-${post.id}`}><Repeat size={12} /> {formatNumber(post.reposts)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* System Logs */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="glass-panel p-6 rounded-xl space-y-5"
              data-testid="panel-system-logs-threads"
            >
              <div>
                <h2 className="text-xl font-bold font-display">System Logs</h2>
                <p className="text-sm text-muted-foreground">Real-time activity feed</p>
              </div>
              <div className="space-y-4">
                {(logs ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
                ) : (
                  (logs ?? []).slice(0, 15).map((log) => (
                    <div key={log.id} className="flex gap-3 text-sm" data-testid={`log-entry-${log.id}`}>
                      <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${log.status === "success" ? "bg-green-500" : "bg-primary"}`} />
                      <div className="space-y-0.5">
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
      )}

      {/* Compare tab */}
      {tab === "compare" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-primary text-sm" data-testid="banner-compare-mode">
            <TrendingUp className="w-4 h-4 shrink-0" />
            Compare mode overlays X data with real-time Threads data.
          </div>

          {/* Side-by-side stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="X Followers" value={metrics ? formatNumber(metrics.followers) : "—"} icon={Users} delay={0.1} loading={metricsLoading} platform="x" data-testid="stat-compare-x-followers" />
            <StatCard title="Threads Followers" value={threadsMetrics ? formatNumber(threadsMetrics.followers) : "—"} icon={Users} delay={0.15} loading={threadsLoading} platform="threads" data-testid="stat-compare-threads-followers" />
            <StatCard title="X Engagement" value={metrics ? `${metrics.engagementRate}%` : "—"} icon={Heart} delay={0.2} loading={metricsLoading} platform="x" data-testid="stat-compare-x-engagement" />
            <StatCard title="Threads Engagement" value={threadsMetrics ? `${threadsMetrics.engagementRate}%` : "—"} icon={Heart} delay={0.25} loading={threadsLoading} platform="threads" data-testid="stat-compare-threads-engagement" />
          </div>

          {/* Overlaid engagement chart */}
          <Card className="glass-panel p-6 rounded-xl" data-testid="chart-compare-engagement">
            <div className="mb-5">
              <h2 className="text-xl font-bold font-display">Engagement Comparison</h2>
              <p className="text-sm text-muted-foreground">X (live) vs Threads (live)</p>
            </div>
            <div className="h-[300px]">
              {metricsLoading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : !dailyMetrics.length ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data available yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={compareData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cX" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="cT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#aaaaaa" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#aaaaaa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }} />
                    <Area type="monotone" dataKey="X Engagement" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#cX)" />
                    <Area type="monotone" dataKey="Threads Engagement" stroke="#888888" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#cT)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Impressions comparison */}
          <Card className="glass-panel p-6 rounded-xl">
            <div className="mb-5">
              <h2 className="text-xl font-bold font-display">Impressions Comparison</h2>
              <p className="text-sm text-muted-foreground">Total reach across platforms per day</p>
            </div>
            <div className="h-[260px]">
              {metricsLoading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : !dailyMetrics.length ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                    <Bar dataKey="X Impressions" fill="hsl(var(--primary))" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Threads Impressions" fill="#666666" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
