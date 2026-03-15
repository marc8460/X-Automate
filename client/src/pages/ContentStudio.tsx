import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Calendar, Layers, ChevronRight, Loader2, Copy, Check, Image as ImageIcon, Link, Sparkles, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMediaItems } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Composer from "./Composer";

// ─── Story Ideas ─────────────────────────────────────────────────────────────

type StoryTemplate = "tease-reveal-cta" | "single-cta" | "countdown" | "custom";

interface StorySlide {
  headline: string;
  body: string;
  cta: string;
}

const STORY_TEMPLATES: { id: StoryTemplate; label: string; desc: string; slides: number }[] = [
  { id: "tease-reveal-cta", label: "Tease → Reveal → CTA", desc: "Build curiosity, deliver the reveal, then drive action", slides: 3 },
  { id: "single-cta", label: "Single Story + CTA", desc: "One punchy slide with a direct call-to-action", slides: 1 },
  { id: "countdown", label: "Countdown Sequence", desc: "Multi-slide countdown leading to a big moment", slides: 4 },
  { id: "custom", label: "Custom Sequence", desc: "Define your own slide count and flow", slides: 0 },
];

const CTA_PRESETS = ["See it here", "More of me", "Tap here", "Link in bio", "Swipe up", "Don't miss out"];

function CopiedCheck() {
  return <Check size={13} className="text-emerald-400" />;
}

function StorySlideCard({ slide, index }: { slide: StorySlide; index: number }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const fullText = [slide.headline, slide.body, slide.cta].filter(Boolean).join("\n\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: `Slide ${index + 1} copied` });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="glass-panel p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Slide {index + 1}</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleCopy}>
            {copied ? <CopiedCheck /> : <Copy size={13} />}
          </Button>
        </div>
        <div className="space-y-2">
          {slide.headline && (
            <p className="font-semibold text-sm text-foreground leading-snug">{slide.headline}</p>
          )}
          {slide.body && (
            <p className="text-sm text-muted-foreground leading-relaxed">{slide.body}</p>
          )}
          {slide.cta && (
            <div className="mt-3 inline-block px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
              {slide.cta}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function StoryIdeasTab() {
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate>("tease-reveal-cta");
  const [customSlides, setCustomSlides] = useState(3);
  const [linkUrl, setLinkUrl] = useState("");
  const [context, setContext] = useState("");
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [slides, setSlides] = useState<StorySlide[]>([]);
  const { toast } = useToast();
  const { data: mediaItems = [] } = useMediaItems();

  const template = STORY_TEMPLATES.find((t) => t.id === selectedTemplate)!;
  const slideCount = selectedTemplate === "custom" ? customSlides : template.slides;

  const selectedImage = mediaItems.find((m: any) => m.id === selectedImageId);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSlides([]);
    try {
      const res = await apiRequest("POST", "/api/studio/story-ideas", {
        template: selectedTemplate,
        slideCount,
        linkUrl,
        context,
        imageTag: selectedImage ? `${selectedImage.mood ?? ""} ${selectedImage.outfit ?? ""}`.trim() : "",
      });
      const data = await res.json();
      if (data.slides) {
        setSlides(data.slides);
      }
    } catch {
      toast({ title: "Generation failed", description: "Try again or check your connection.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight">Story Ideas</h2>
        <p className="text-muted-foreground mt-1">Generate Instagram story sequences with AI — approve each slide before use.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Config */}
        <div className="space-y-5">
          {/* Template picker */}
          <Card className="glass-panel p-5">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">Story Template</p>
            <div className="space-y-2">
              {STORY_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all duration-150",
                    selectedTemplate === t.id
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t.label}</span>
                    {t.slides > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">{t.slides} slides</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 opacity-70">{t.desc}</p>
                </button>
              ))}
            </div>
            {selectedTemplate === "custom" && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Slides:</span>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={customSlides}
                  onChange={(e) => setCustomSlides(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-20 h-8 text-sm"
                />
              </div>
            )}
          </Card>

          {/* Image from vault */}
          <Card className="glass-panel p-5">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">Media (optional)</p>
            {selectedImage ? (
              <div className="flex items-center gap-3">
                <img
                  src={`/uploads/${selectedImage.filename}`}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover border border-border/50"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedImage.filename}</p>
                  <p className="text-xs text-muted-foreground">{[selectedImage.mood, selectedImage.outfit].filter(Boolean).join(" · ")}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedImageId(null)} className="text-muted-foreground">
                  Clear
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed text-muted-foreground"
                onClick={() => setShowVaultPicker(true)}
              >
                <ImageIcon size={14} className="mr-2" />
                Pick from Media Vault
              </Button>
            )}
          </Card>

          {/* URL + Context */}
          <Card className="glass-panel p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">Link URL</p>
              <div className="relative">
                <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  placeholder="https://linktr.ee/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">Context / Topic</p>
              <Textarea
                placeholder="What's this story about? (e.g. new photo set, promo, event...)"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="text-sm resize-none"
                rows={3}
              />
            </div>
          </Card>

          {/* CTA presets hint */}
          <div>
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-2">Common CTAs</p>
            <div className="flex flex-wrap gap-1.5">
              {CTA_PRESETS.map((cta) => (
                <span key={cta} className="text-xs px-2 py-1 rounded-full bg-secondary/40 text-muted-foreground border border-border/30">
                  {cta}
                </span>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || (!context && !selectedImage)}
          >
            {isGenerating ? (
              <><Loader2 size={15} className="mr-2 animate-spin" /> Generating {slideCount} slide{slideCount !== 1 ? "s" : ""}…</>
            ) : (
              <><Sparkles size={15} className="mr-2" /> Generate Story</>
            )}
          </Button>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {slides.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{slides.length} slide{slides.length !== 1 ? "s" : ""} generated</p>
                <Button size="sm" variant="ghost" onClick={handleGenerate} disabled={isGenerating} className="text-muted-foreground gap-1.5">
                  <RefreshCw size={12} /> Regenerate
                </Button>
              </div>
              {slides.map((slide, i) => (
                <StorySlideCard key={i} slide={slide} index={i} />
              ))}
            </>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-border/40">
              <Layers size={32} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Your story slides will appear here.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Choose a template, add context, then hit Generate.</p>
            </div>
          )}
        </div>
      </div>

      {/* Vault picker modal */}
      <AnimatePresence>
        {showVaultPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowVaultPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Pick from Media Vault</h3>
                <Button size="sm" variant="ghost" onClick={() => setShowVaultPicker(false)}>Close</Button>
              </div>
              <div className="overflow-y-auto flex-1">
                {mediaItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No media in your vault yet.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {(mediaItems as any[]).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setSelectedImageId(item.id); setShowVaultPicker(false); }}
                        className={cn(
                          "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                          selectedImageId === item.id ? "border-primary" : "border-transparent hover:border-border"
                        )}
                      >
                        <img
                          src={`/uploads/${item.filename}`}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.parentElement!.classList.add("bg-secondary/40");
                            el.style.display = "none";
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Calendar Placeholder ─────────────────────────────────────────────────────

function CalendarTab() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-4">
        <Calendar size={32} className="text-primary/40" />
      </div>
      <h3 className="text-xl font-bold font-display mb-2">Content Calendar</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        Plan and visualize your posting schedule across all platforms. Coming in the next phase.
      </p>
    </div>
  );
}

// ─── Content Studio Shell ─────────────────────────────────────────────────────

type StudioTab = "create" | "stories" | "calendar";

const STUDIO_TABS: { id: StudioTab; label: string; icon: React.FC<any> }[] = [
  { id: "create", label: "Create", icon: Wand2 },
  { id: "stories", label: "Story Ideas", icon: Layers },
  { id: "calendar", label: "Calendar", icon: Calendar },
];

export default function ContentStudio() {
  const [activeTab, setActiveTab] = useState<StudioTab>("create");

  return (
    <div className="space-y-0 pb-12">
      {/* Studio Tab Bar */}
      <div className="flex items-center gap-1 mb-8 border-b border-border/40 pb-0">
        {STUDIO_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "create" && <Composer />}
          {activeTab === "stories" && <StoryIdeasTab />}
          {activeTab === "calendar" && <CalendarTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
