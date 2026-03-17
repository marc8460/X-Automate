import { Link, useLocation } from "wouter";
import {
  Home, BarChart2, Settings, Image, Bot, Target, Eye,
  Calendar, MessageSquare, Mail, TrendingUp, Lightbulb,
  Plug, Zap, Sparkles, Layers, Wand2, ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CapBadge = "api" | "ext";

type NavItem = {
  href: string;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  soon?: boolean;
  exact?: boolean;
  capBadge?: CapBadge;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV: NavSection[] = [
  {
    label: "",
    items: [
      { href: "/", label: "Home", icon: Home, exact: true },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/studio", label: "Content Studio", icon: Wand2 },
      { href: "/studio/calendar", label: "Calendar", icon: Calendar },
      { href: "/studio/stories", label: "Story Ideas", icon: Layers, soon: true },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/vault", label: "Media Vault", icon: Image },
    ],
  },
  {
    label: "Inbox",
    items: [
      { href: "/inbox/threads", label: "Threads", icon: MessageSquare },
      { href: "/inbox/instagram", label: "Instagram DMs", icon: Mail, soon: true, capBadge: "api" },
    ],
  },
  {
    label: "Discover",
    items: [
      { href: "/discover/trends", label: "Trends", icon: TrendingUp },
      { href: "/discover/opportunities", label: "Opportunities", icon: Lightbulb, soon: true },
      { href: "/discover/comments", label: "Comment Engine", icon: Zap, capBadge: "ext" },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/analytics", label: "Performance", icon: BarChart2 },
      { href: "/goals/daily-plan", label: "Daily Plan", icon: ListChecks },
      { href: "/goals", label: "Daily Goals", icon: Target, exact: true },
      { href: "/creators", label: "Creator Watch", icon: Eye },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/setup", label: "Install", icon: Plug, soon: true },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();

  const isActive = (href: string, soon?: boolean, exact?: boolean) => {
    if (soon) return false;
    if (exact || href === "/") return location === href;
    return location.startsWith(href);
  };

  return (
    <aside className="w-64 border-r border-border/50 bg-card/30 backdrop-blur-xl h-screen flex flex-col fixed left-0 top-0 z-40 hidden md:flex">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3 text-primary font-display font-bold text-xl tracking-tight">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary glow-primary">
            <Bot size={22} />
          </div>
          Aura
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 py-5 px-3 overflow-y-auto space-y-5">
        {NAV.map((section) => (
          <div key={section.label || "_home"}>
            {section.label && (
              <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-3 mb-2">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.soon, item.exact);
                const Icon = item.icon;
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.soon ? "#" : item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group relative overflow-hidden",
                      active
                        ? "text-primary bg-primary/10"
                        : item.soon
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                    onClick={item.soon ? (e) => e.preventDefault() : undefined}
                  >
                    {active && (
                      <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r-full shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
                    )}
                    <Icon
                      size={16}
                      className={cn(
                        "transition-colors shrink-0",
                        active
                          ? "text-primary"
                          : item.soon
                          ? "text-muted-foreground/30"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.soon && (
                      <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground/30">
                        Soon
                      </span>
                    )}
                    {item.capBadge === "api" && !item.soon && (
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-primary/60 border border-primary/20 rounded px-1 py-0.5 leading-none">
                        API
                      </span>
                    )}
                    {item.capBadge === "ext" && !item.soon && (
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-amber-400/70 border border-amber-400/20 rounded px-1 py-0.5 leading-none">
                        EXT
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Status footer */}
      <div className="p-4 border-t border-border/50 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/30 border border-border/50">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <div className="text-sm font-medium text-muted-foreground">System Online</div>
        </div>
      </div>
    </aside>
  );
}
