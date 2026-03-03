import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Search, Heart, MessageSquare, Play, Pause, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useEngagements, useFollowerInteractions, useUpdateEngagement } from "@/lib/hooks";

export default function EngagementEngine() {
  const [isActive, setIsActive] = useState(true);
  const { data: engagements, isLoading: loadingEngagements } = useEngagements();
  const { data: interactions, isLoading: loadingInteractions } = useFollowerInteractions();
  const updateEngagement = useUpdateEngagement();

  const handleApprove = (id: number) => {
    updateEngagement.mutate({ id, status: "approved" });
  };

  const handleSkip = (id: number) => {
    updateEngagement.mutate({ id, status: "skipped" });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Engagement Engine</h1>
          <p className="text-muted-foreground mt-1">Autonomous contextual replies and interactions.</p>
        </div>
        <Button 
          variant={isActive ? "outline" : "default"}
          className={isActive ? "border-primary text-primary hover:bg-primary/10" : "bg-primary text-white"}
          onClick={() => setIsActive(!isActive)}
          data-testid="button-toggle-engine"
        >
          {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {isActive ? "Pause Engine" : "Start Engine"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <Search className="w-5 h-5 text-accent" />
              Influencer Feed
            </h2>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Scanning for conversations...
            </div>
          </div>
          
          <div className="space-y-4">
            {loadingEngagements ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="p-5 glass-panel border-border/40">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="pl-10 mb-4">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="pl-10">
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                </Card>
              ))
            ) : (
              engagements?.filter(e => e.status === "pending").map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  key={item.id}
                >
                  <Card className="p-5 glass-panel border-border/40 hover:border-accent/30 transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                          {item.user.charAt(1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm" data-testid={`text-user-${item.id}`}>{item.user}</p>
                          <p className="text-xs text-muted-foreground">{item.time}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {item.sentiment}
                      </Badge>
                    </div>
                    
                    <div className="pl-10 mb-4">
                      <p className="text-sm text-foreground/80 border-l-2 border-border/50 pl-3 py-1" data-testid={`text-engagement-content-${item.id}`}>
                        {item.text}
                      </p>
                    </div>

                    <div className="pl-10 space-y-3">
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 relative">
                        <div className="absolute -left-2 top-4 w-2 h-2 bg-primary rotate-45" />
                        <p className="text-sm text-primary-foreground font-medium flex items-start gap-2" data-testid={`text-suggested-reply-${item.id}`}>
                          <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          {item.suggestedReply}
                        </p>
                      </div>
                      
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" data-testid={`button-edit-${item.id}`}>
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 border-border/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                          onClick={() => handleSkip(item.id)}
                          data-testid={`button-skip-${item.id}`}
                        >
                          Skip
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-8 bg-accent/20 text-accent hover:bg-accent/30"
                          onClick={() => handleApprove(item.id)}
                          data-testid={`button-approve-${item.id}`}
                        >
                          Approve & Send
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
            {!loadingEngagements && engagements?.filter(e => e.status === "pending").length === 0 && (
              <p className="text-center py-12 text-muted-foreground">No pending engagements.</p>
            )}
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <Card className="p-5 glass-panel bg-primary/5 border-primary/20">
            <h3 className="font-display font-medium mb-4 text-sm uppercase tracking-wider text-primary flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Follower Interactions
            </h3>
            <div className="space-y-4">
              {loadingInteractions ? (
                Array(2).fill(0).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))
              ) : (
                interactions?.map((interaction) => (
                  <div key={interaction.id} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-medium text-foreground" data-testid={`text-interaction-user-${interaction.id}`}>{interaction.user}</span>
                      <span className="text-muted-foreground ml-2" data-testid={`text-interaction-action-${interaction.id}`}>{interaction.action}</span>
                    </div>
                    <span className="text-muted-foreground/60">{interaction.time}</span>
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" className="w-full text-[10px] h-7 border-dashed" data-testid="button-set-auto-response">Set Auto-Response</Button>
            </div>
          </Card>

          <Card className="p-5 glass-panel bg-secondary/10">
            <h3 className="font-display font-medium mb-4 text-sm uppercase tracking-wider text-muted-foreground">Target Keywords</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {['coding', 'tech', 'startup', 'tired', 'gym', 'lonely', 'building'].map(kw => (
                <Badge key={kw} variant="secondary" className="bg-background border-border/50">
                  {kw}
                </Badge>
              ))}
            </div>
            
            <div className="space-y-3 mt-6 border-t border-border/50 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Daily Cap</span>
                <span className="font-mono text-sm">45 / 100</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}