import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Save, RefreshCw, Send, CheckCircle2, Image as ImageIcon, X } from "lucide-react";

const TWEET_STYLES = [
  "Engagement Bait",
  "Direct Question",
  "Soft Tease",
  "Viral Hook",
  "Community Love"
];

const MOCK_VAULT_IMAGES = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1529139513477-3235a14a139b?auto=format&fit=crop&q=80&w=200",
];

const MOCK_GENERATED_TWEETS = [
  { id: 1, text: "tell me honestly, am i your type? 🥺👉👈", style: "Direct Question", status: "queued", image: null },
  { id: 2, text: "can i dm youuuuu?!! 😩 don't ignore me", style: "Engagement Bait", status: "posted", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400" },
  { id: 3, text: "free pic if you stop scrolling and say hi 😇", style: "Soft Tease", status: "queued", image: null },
];

export default function ContentEngine() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(TWEET_STYLES[0]);
  const [showVault, setShowVault] = useState<number | null>(null);
  const [tweets, setTweets] = useState(MOCK_GENERATED_TWEETS);
  
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  const attachImage = (tweetId: number, imageUrl: string) => {
    setTweets(prev => prev.map(t => t.id === tweetId ? { ...t, image: imageUrl } : t));
    setShowVault(null);
  };

  const removeImage = (tweetId: number) => {
    setTweets(prev => prev.map(t => t.id === tweetId ? { ...t, image: null } : t));
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
              Content Studio
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">What's happening?</label>
                <Textarea 
                  placeholder="Share a thought, a vibe, or a life update..."
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
                {isGenerating ? "Drafting..." : "Draft Tweets"}
              </Button>
            </div>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-display font-medium">Recently Drafted</h3>
            {tweets.map((tweet, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={tweet.id}
                className="relative"
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
                  
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-foreground text-sm leading-relaxed mb-4">
                        {tweet.text}
                      </p>
                    </div>
                    {tweet.image && (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border/50 shrink-0">
                        <img src={tweet.image} className="w-full h-full object-cover" alt="Attached content" />
                        <button 
                          onClick={() => removeImage(tweet.id)}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-between items-center mt-2 pt-2 border-t border-border/10">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-primary hover:text-primary/80 hover:bg-primary/5"
                      onClick={() => setShowVault(showVault === tweet.id ? null : tweet.id)}
                    >
                      <ImageIcon className="w-3 h-3 mr-1" />
                      {tweet.image ? "Change Media" : "Attach from Vault"}
                    </Button>
                    
                    <div className="flex gap-2">
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
                  </div>

                  {/* Inline Vault Selector */}
                  <AnimatePresence>
                    {showVault === tweet.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-4 pt-4 border-t border-border/20"
                      >
                        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Select from Media Vault</p>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          {MOCK_VAULT_IMAGES.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => attachImage(tweet.id, img)}
                              className="w-20 h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary shrink-0 transition-all active:scale-95"
                            >
                              <img src={img} className="w-full h-full object-cover" alt="Vault thumbnail" />
                            </button>
                          ))}
                          <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 cursor-pointer shrink-0 transition-all">
                            <Plus size={20} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
            <h3 className="font-display font-medium mb-2 text-sm uppercase tracking-wider text-accent">Safety Filter Active</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Inappropriate terms are currently being filtered. The system will rely on suggestion, soft dominance, and playful teasing to maintain a professional yet engaging presence.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}