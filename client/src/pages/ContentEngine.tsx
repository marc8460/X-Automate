import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Sparkles, Save, RefreshCw, Send, CheckCircle2 } from "lucide-react";

const TWEET_STYLES = [
  "Flirty Bait",
  "Question-based",
  "Soft Promo",
  "Viral Meme",
  "Controversial/Hot Take"
];

const MOCK_GENERATED_TWEETS = [
  { id: 1, text: "Is it just me, or do late-night coding sessions hit different? ☕️✨ What's everyone working on?", style: "Question-based", status: "queued" },
  { id: 2, text: "They said I couldn't build it. So I built it twice as fast. 💅🚀 #buildinpublic", style: "Soft Promo", status: "posted" },
];

export default function ContentEngine() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(TWEET_STYLES[0]);
  
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight">Content Engine</h1>
        <p className="text-muted-foreground mt-1">Generate, refine, and schedule your daily tweets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Generator Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 glass-panel border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
            <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="text-primary w-5 h-5" />
              AI Prompt Studio
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Context / Topic</label>
                <Textarea 
                  placeholder="What's on your mind today? (e.g. 'Coffee, coding, and crypto')"
                  className="bg-background/50 border-border/50 resize-none h-24"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 block">Target Style</label>
                <div className="flex flex-wrap gap-2">
                  {TWEET_STYLES.map(style => (
                    <Badge 
                      key={style}
                      variant={selectedStyle === style ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${selectedStyle === style ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:border-primary/50'}`}
                      onClick={() => setSelectedStyle(style)}
                    >
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-muted-foreground">Seductiveness / Playfulness</label>
                  <span className="text-xs text-primary font-mono">75%</span>
                </div>
                <Slider defaultValue={[75]} max={100} step={1} className="[&_[role=slider]]:border-primary [&_[role=slider]]:bg-primary" />
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? "Synthesizing..." : "Generate Tweets"}
              </Button>
            </div>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-display font-medium">Recent Outputs</h3>
            {MOCK_GENERATED_TWEETS.map((tweet, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={tweet.id}
              >
                <Card className="p-4 glass-panel border-border/40 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-xs bg-secondary/50 text-muted-foreground">
                      {tweet.style}
                    </Badge>
                    {tweet.status === 'posted' ? (
                      <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Posted</span>
                    ) : (
                      <span className="text-accent text-xs flex items-center gap-1">In Queue</span>
                    )}
                  </div>
                  <p className="text-foreground text-sm leading-relaxed mb-4">
                    {tweet.text}
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground">
                      <RefreshCw className="w-3 h-3 mr-1" /> Re-roll
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 border-border/50">
                      <Save className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" className="h-8 bg-primary/20 text-primary hover:bg-primary/30">
                      <Send className="w-3 h-3 mr-1" /> Queue
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <Card className="p-5 glass-panel bg-secondary/10">
            <h3 className="font-display font-medium mb-2 text-sm uppercase tracking-wider text-muted-foreground">Queue Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Scheduled Today</span>
                <span className="font-mono text-primary font-medium">3/5</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Generated Library</span>
                <span className="font-mono font-medium">142</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Next Post In</span>
                <span className="font-mono text-accent font-medium">01:24:00</span>
              </div>
            </div>
          </Card>
          
          <Card className="p-5 glass-panel border-accent/20">
            <h3 className="font-display font-medium mb-2 text-sm uppercase tracking-wider text-accent">Safe Mode Active</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Explicit terms are currently being filtered. The AI will rely on suggestion, soft dominance, and playful teasing rather than explicit vocabulary to protect account health.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}