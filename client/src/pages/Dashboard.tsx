import { Card } from "@/components/ui/card";
import { ArrowUpRight, MessageSquare, Repeat, Heart, Eye } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const data = [
  { name: "Mon", engagement: 400, followers: 240 },
  { name: "Tue", engagement: 300, followers: 139 },
  { name: "Wed", engagement: 550, followers: 980 },
  { name: "Thu", engagement: 278, followers: 390 },
  { name: "Fri", engagement: 189, followers: 480 },
  { name: "Sat", engagement: 239, followers: 380 },
  { name: "Sun", engagement: 349, followers: 430 },
];

const StatCard = ({ title, value, change, icon: Icon, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Card className="p-6 glass-panel relative overflow-hidden group">
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
        <p className="text-3xl font-display font-bold tracking-tight">{value}</p>
      </div>
    </Card>
  </motion.div>
);

export default function Dashboard() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">System performance and audience growth.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Engaging Active (24/7)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Impressions" value="1.2M" change="+12.5%" icon={Eye} delay={0.1} />
        <StatCard title="Engagement Rate" value="4.8%" change="+2.1%" icon={Heart} delay={0.2} />
        <StatCard title="Auto-Replies" value="842" change="+18.2%" icon={MessageSquare} delay={0.3} />
        <StatCard title="Retweets" value="12.4K" change="+5.4%" icon={Repeat} delay={0.4} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="glass-panel p-6 rounded-xl"
      >
        <div className="mb-6">
          <h2 className="text-xl font-bold font-display">Performance Metrics</h2>
          <p className="text-sm text-muted-foreground">Engagement and follower growth over time</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
        </div>
      </motion.div>
    </div>
  );
}