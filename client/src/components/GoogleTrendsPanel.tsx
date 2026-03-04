import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Copy, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRENDS_URL = "https://trends.google.com/trends/trendingsearches/daily?geo=US";

const STEPS = [
  {
    icon: TrendingUp,
    label: "Browse trends",
    desc: "Open Google Trends in a new tab and explore what's hot right now.",
  },
  {
    icon: Copy,
    label: "Copy a topic",
    desc: "Find an interesting trend and copy the keyword or phrase.",
  },
  {
    icon: Search,
    label: "Paste into Viral Engine",
    desc: "Come back here and paste the topic into the search or niche field to find matching posts.",
  },
];

interface GoogleTrendsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function GoogleTrendsPanel({ open, onClose }: GoogleTrendsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = panelRef.current?.offsetWidth ?? 380;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !panelRef.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(700, Math.max(280, startWidth.current + delta));
      panelRef.current.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 h-full z-50 flex"
          style={{ width: 380 }}
        >
          {/* Drag-to-resize handle */}
          <div
            className="w-1.5 h-full cursor-col-resize bg-border/30 hover:bg-primary/50 transition-colors flex-shrink-0"
            onMouseDown={handleResizeMouseDown}
            title="Drag to resize"
          />

          <div className="flex-1 bg-background border-l border-border/60 flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-primary" />
                <span className="font-semibold text-sm">Google Trends</span>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors rounded p-0.5"
                aria-label="Close panel"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* How-to steps */}
              <div className="glass-panel p-4 space-y-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  How to use
                </p>
                <div className="space-y-3">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{i + 1}</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Icon size={12} className="text-primary shrink-0" />
                            <p className="text-sm font-medium">{step.label}</p>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CTA button */}
              <Button
                onClick={() => window.open(TRENDS_URL, "_blank", "noopener,noreferrer")}
                className="w-full gap-2"
              >
                <ExternalLink size={14} />
                Open Google Trends
              </Button>

              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Opens in a new tab. Google Trends does not allow embedding in
                third-party apps (X-Frame-Options policy).
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
