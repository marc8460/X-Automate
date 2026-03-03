import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Activity, Zap, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useTrends } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrendScanner() {
  const { data: trends, isLoading, refetch } = useTrends();

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight" data-testid="text-page-title">Trend Scanner</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">Discover and adapt to viral conversations.</p>
        </div>
        <Button 
          variant="outline" 
          className="border-primary/50 text-primary hover:bg-primary/10"
          onClick={() => refetch()}
          data-testid="button-refresh-trends"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" data-testid={`skeleton-trend-${i}`} />
          ))
        ) : (
          trends?.map((trend, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={trend.id}
            >
              <Card className={`p-5 glass-panel transition-all hover:-translate-y-1 ${trend.fitScore > 85 ? 'border-primary/30 shadow-[0_0_15px_rgba(217,70,239,0.1)]' : 'border-border/40'}`} data-testid={`card-trend-${trend.id}`}>
                <div className="flex justify-between items-start mb-4">
                  <Badge 
                    variant={trend.fitScore > 85 ? "default" : "secondary"} 
                    className={trend.fitScore > 85 ? "bg-primary text-primary-foreground" : "bg-secondary"}
                    data-testid={`badge-fit-score-${trend.id}`}
                  >
                    Fit: {trend.fitScore}%
                  </Badge>
                  {trend.trending === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : (
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-lg font-bold font-display mb-1" data-testid={`text-trend-tag-${trend.id}`}>{trend.tag}</h3>
                <p className="text-sm text-muted-foreground" data-testid={`text-trend-volume-${trend.id}`}>{trend.volume} Tweets</p>
                
                <Button 
                  className="w-full mt-4 bg-background border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground" 
                  size="sm"
                  data-testid={`button-generate-hook-${trend.id}`}
                >
                  <Zap className="w-3 h-3 mr-2 text-primary" />
                  Generate Hook
                </Button>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Card className="p-6 glass-panel border-border/50" data-testid="card-adaptive-strategy">
        <h2 className="text-xl font-display font-semibold mb-4">Adaptive Strategy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Based on current trends, the system suggests shifting tone towards <strong className="text-foreground">casual late-night builder</strong> aesthetics. 
            </p>
            <div className="p-4 bg-secondary/20 rounded-lg border border-border/50">
              <p className="text-sm italic text-foreground/80 mb-2">"Generate 1 adaptive viral tweet daily matching top persona fit."</p>
              <Button 
                size="sm" 
                className="bg-primary/20 text-primary hover:bg-primary/30 w-full"
                data-testid="button-approve-strategy"
              >
                Approve Strategy Shift
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center bg-background/50 rounded-lg border border-border/50 p-6">
            <div className="text-center">
              <Activity className="w-12 h-12 text-primary/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground" data-testid="text-monitoring-status">Live monitoring active in background</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}