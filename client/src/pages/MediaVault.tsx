import { useState, useRef, useCallback } from "react";
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
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaItems, useUploadMedia, useDeleteMediaItem } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function MediaVault() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadMood, setUploadMood] = useState("Playful");
  const [uploadOutfit, setUploadOutfit] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: mediaItems, isLoading } = useMediaItems();
  const uploadMutation = useUploadMedia();
  const deleteMutation = useDeleteMediaItem();

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Only image files are allowed.", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mood", uploadMood);
    formData.append("outfit", uploadOutfit || "Untagged");
    uploadMutation.mutate(formData, {
      onSuccess: () => {
        toast({ title: "Uploaded", description: "Media added to vault." });
        setShowUploadForm(false);
        setUploadOutfit("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (err: any) => {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      },
    });
  }, [uploadMood, uploadOutfit, uploadMutation, toast]);

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: "Deleted", description: "Media removed from vault." }),
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const MOODS = ["Playful", "Confident", "Seductive", "Casual", "Mysterious", "Neutral"];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight" data-testid="text-vault-title">Media Vault</h1>
          <p className="text-muted-foreground mt-1">Securely manage and categorize your content library.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-border/50" data-testid="button-history">
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button
            className="bg-primary text-white hover:bg-primary/90"
            onClick={() => setShowUploadForm(!showUploadForm)}
            data-testid="button-upload"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Media
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showUploadForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-6 glass-panel border-primary/30 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-semibold">Upload New Media</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowUploadForm(false)} data-testid="button-close-upload">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Mood / Vibe</label>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((m) => (
                      <Badge
                        key={m}
                        variant={uploadMood === m ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${uploadMood === m ? "bg-primary text-white" : "hover:border-primary/50"}`}
                        onClick={() => setUploadMood(m)}
                        data-testid={`badge-mood-${m.toLowerCase()}`}
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Outfit / Tag</label>
                  <Input
                    placeholder="e.g. Summer Dress, Streetwear..."
                    value={uploadOutfit}
                    onChange={(e) => setUploadOutfit(e.target.value)}
                    className="bg-background/50"
                    data-testid="input-outfit-tag"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  data-testid="input-file-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="bg-gradient-to-r from-primary to-accent text-white border-0"
                  data-testid="button-browse-files"
                >
                  {uploadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploadMutation.isPending ? "Uploading..." : "Browse Files"}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-4 glass-panel border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Input placeholder="Filter by tag or theme..." className="pl-9 bg-background/50" data-testid="input-filter" />
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-center border border-border/50 rounded-lg p-1 bg-background/30">
            <Button
              variant="ghost"
              size="sm"
              className={view === 'grid' ? 'bg-secondary text-primary' : 'text-muted-foreground'}
              onClick={() => setView('grid')}
              data-testid="button-view-grid"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={view === 'list' ? 'bg-secondary text-primary' : 'text-muted-foreground'}
              onClick={() => setView('list')}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors" data-testid="badge-filter-safe">Safe</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors" data-testid="badge-filter-spicy">Spicy</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors" data-testid="badge-filter-unused">Unused</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => { if (!showUploadForm) setShowUploadForm(true); }}
          className={`aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group ${
            dragOver ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
          }`}
          data-testid="upload-placeholder"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-primary">Drag & Drop</p>
            </>
          )}
        </motion.div>

        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden glass-panel border-border/50 h-full">
              <Skeleton className="aspect-[3/4] w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </Card>
          ))
        ) : (
          mediaItems?.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group relative"
              data-testid={`card-media-${item.id}`}
            >
              <Card className="overflow-hidden glass-panel border-border/50 hover:border-primary/30 transition-all duration-300 h-full">
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img
                    src={item.url}
                    alt="Vault content"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-8 h-8 rounded-full bg-red-500/60 backdrop-blur-md border-white/10 hover:bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(item.id)}
                      data-testid={`button-delete-media-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </Button>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <Button className="w-full bg-primary text-white shadow-lg shadow-primary/20" data-testid={`button-media-use-${item.id}`}>
                      Use in Post
                    </Button>
                  </div>

                  {item.usageCount > 3 && (
                    <Badge className="absolute top-2 left-2 bg-yellow-500/90 text-black border-0" data-testid={`badge-usage-high-${item.id}`}>
                      High Usage
                    </Badge>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider" data-testid={`text-mood-${item.id}`}>{item.mood}</Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1" data-testid={`text-last-used-${item.id}`}>
                      <History className="w-3 h-3" /> {item.lastUsed}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-3 h-3 text-primary" />
                    <span className="text-xs text-muted-foreground truncate" data-testid={`text-outfit-${item.id}`}>{item.outfit}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

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