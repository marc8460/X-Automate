import { Link, useLocation } from "wouter";
import {
  Home, PenSquare, Inbox, Flame, BarChart2, Settings,
  Image, Users, Zap, Hash, Bot, Key, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  soon?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV: NavSection[] = [
  {
    label: "System Core",
    items: [
      { href: "/", label: "Overview", icon: Home },
      { href: "/vault", label: "Media Vault", icon: Image },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/composer", label: "Composer", icon: PenSquare },
      { href: "/viral", label: "Viral Engine", icon: Flame },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/inbox", label: "Unified Inbox", icon: Inbox },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/boost", label: "Boost Pods", icon: Zap, soon: true },
      { href: "/keywords", label: "Keyword Scanner", icon: Hash, soon: true },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/analytics", label: "Performance", icon: BarChart2 },
      { href: "/audience", label: "Audience Insights", icon: Users, soon: true },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings", label: "Connected Accounts", icon: Bot },
      { href: "/settings", label: "Automation", icon: Settings },
      { href: "/settings", label: "API", icon: Key },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();

  const isActive = (href: string, soon?: boolean) => {
    if (soon) return false;
    if (href === "/") return location === "/";
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
      <div className="flex-1 py-5 px-3 overflow-y-auto space-y-6">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-3 mb-2">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.soon);
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
