import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Filter, 
  Grid, 
  List, 
  Tag, 
  History, 
  Plus, 
  MoreVertical,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MOCK_VAULT_ITEMS = [
  { 
    id: 1, 
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400", 
    mood: "Playful", 
    outfit: "Summer Dress", 
    usageCount: 2, 
    lastUsed: "3 days ago",
    risk: "safe" 
  },
  { 
    id: 2, 
    url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400", 
    mood: "Confident", 
    outfit: "Streetwear", 
    usageCount: 0, 
    lastUsed: "Never",
    risk: "safe" 
  },
  { 
    id: 3, 
    url: "https://images.unsplash.com/photo-1529139513477-3235a14a139b?auto=format&fit=crop&q=80&w=400", 
    mood: "Seductive", 
    outfit: "Evening Wear", 
    usageCount: 5, 
    lastUsed: "12 hours ago",
    risk: "spicy" 
  }
];

export default function MediaVault() {
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Media Vault</h1>
          <p className="text-muted-foreground mt-1">Securely manage and categorize your content library.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-border/50">
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button className="bg-primary text-white hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Upload Media
          </Button>
        </div>
      </div>

      {/* Filters & Controls */}
      <Card className="p-4 glass-panel border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Input placeholder="Filter by tag or theme..." className="pl-9 bg-background/50" />
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-center border border-border/50 rounded-lg p-1 bg-background/30">
            <Button 
              variant="ghost" 
              size="sm" 
              className={view === 'grid' ? 'bg-secondary text-primary' : 'text-muted-foreground'}
              onClick={() => setView('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={view === 'list' ? 'bg-secondary text-primary' : 'text-muted-foreground'}
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors">Safe</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors">Spicy</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors">Unused</Badge>
        </div>
      </Card>

      {/* Vault Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Upload Placeholder */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="aspect-[3/4] rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-muted-foreground group-hover:text-primary">Drag & Drop</p>
        </motion.div>

        {MOCK_VAULT_ITEMS.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative"
          >
            <Card className="overflow-hidden glass-panel border-border/50 hover:border-primary/30 transition-all duration-300 h-full">
              <div className="aspect-[3/4] relative overflow-hidden">
                <img 
                  src={item.url} 
                  alt="Vault content" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="absolute top-2 right-2">
                  <Button variant="secondary" size="icon" className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border-white/10 hover:bg-black/60">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div className="absolute bottom-3 left-3 right-3 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <Button className="w-full bg-primary text-white shadow-lg shadow-primary/20">
                    Use in Post
                  </Button>
                </div>

                {item.usageCount > 3 && (
                  <Badge className="absolute top-2 left-2 bg-yellow-500/90 text-black border-0">
                    High Usage
                  </Badge>
                )}
              </div>
              
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{item.mood}</Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <History className="w-3 h-3" /> {item.lastUsed}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-3 h-3 text-primary" />
                  <span className="text-xs text-muted-foreground truncate">{item.outfit}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Risk Alert */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-4"
        >
          <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-500">Frequency Warning</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              One of your selected images was posted <strong className="text-foreground">12 hours ago</strong>. To avoid bot-like patterns, we recommend waiting at least 48 hours before reposting similar content.
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}