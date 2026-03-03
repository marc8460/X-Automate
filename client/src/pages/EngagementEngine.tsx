import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Search, Heart, MessageSquare, Play, Pause, AlertTriangle } from "lucide-react";
import { useState } from "react";

const MOCK_ENGAGEMENTS = [
  { id: 1, user: "@techbro_99", text: "AI is completely overhyped right now.", sentiment: "neutral", suggestedReply: "Is it? Or are you just not using the right prompts? 😉", time: "2m ago" },
  { id: 2, user: "@founder_x", text: "Just deployed my first Next.js app! So exhausted but worth it.", sentiment: "positive", suggestedReply: "Love that energy. Rest up, you earned it. ☕️🖤", time: "15m ago" },
  { id: 3, user: "@crypto_king", text: "Markets are bleeding today...", sentiment: "negative", suggestedReply: "Perfect time to look away from the charts and focus on building... or other things. 💅", time: "1h ago" },
];

export default function EngagementEngine() {
  const [isActive, setIsActive] = useState(true);

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
            {MOCK_ENGAGEMENTS.map((item, i) => (
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
                        <p className="font-medium text-sm">{item.user}</p>
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {item.sentiment}
                    </Badge>
                  </div>
                  
                  <div className="pl-10 mb-4">
                    <p className="text-sm text-foreground/80 border-l-2 border-border/50 pl-3 py-1">
                      {item.text}
                    </p>
                  </div>

                  <div className="pl-10 space-y-3">
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 relative">
                      <div className="absolute -left-2 top-4 w-2 h-2 bg-primary rotate-45" />
                      <p className="text-sm text-primary-foreground font-medium flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {item.suggestedReply}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 border-border/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20">
                        Skip
                      </Button>
                      <Button size="sm" className="h-8 bg-accent/20 text-accent hover:bg-accent/30">
                        Approve & Send
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Settings Sidebar */}
        <div className="space-y-6">
          <Card className="p-5 glass-panel bg-secondary/10">
            <h3 className="font-display font-medium mb-4 text-sm uppercase tracking-wider text-muted-foreground">Target Keywords</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {['coding', 'tech', 'startup', 'tired', 'gym', 'lonely', 'building'].map(kw => (
                <Badge key={kw} variant="secondary" className="bg-background border-border/50">
                  {kw}
                </Badge>
              ))}
              <Badge variant="outline" className="border-dashed cursor-pointer hover:bg-secondary">
                + Add
              </Badge>
            </div>
            
            <div className="space-y-3 mt-6 border-t border-border/50 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Daily Cap</span>
                <span className="font-mono text-sm">45 / 100</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Delay Range</span>
                <span className="font-mono text-sm">2 - 15 min</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 glass-panel border-yellow-500/20 bg-yellow-500/5">
            <h3 className="font-display font-medium mb-2 text-sm uppercase tracking-wider text-yellow-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Rate Limit Protection
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              System is currently inserting artificial delays between interactions to simulate human behavior and prevent API rate limiting or shadowbans.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}