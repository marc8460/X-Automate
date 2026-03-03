import { Link, useLocation } from "wouter";
import { 
  Home, 
  PenTool, 
  MessageSquareHeart, 
  TrendingUp, 
  Settings,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/content", label: "Content Engine", icon: PenTool },
  { href: "/engagement", label: "Engagement", icon: MessageSquareHeart },
  { href: "/trends", label: "Trend Scanner", icon: TrendingUp },
  { href: "/settings", label: "Configuration", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 border-r border-border/50 bg-card/30 backdrop-blur-xl h-screen flex flex-col fixed left-0 top-0 z-40 hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-3 text-primary font-display font-bold text-xl tracking-tight">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary glow-primary">
            <User size={24} />
          </div>
          Aura
        </div>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-medium text-muted-foreground mb-4 px-2 uppercase tracking-wider">
          System Core
        </div>
        
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full shadow-[0_0_10px_rgba(217,70,239,0.8)]" />
              )}
              <Icon size={18} className={cn(
                "transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {item.label}
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/30 border border-border/50">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <div className="text-sm font-medium text-muted-foreground">
            System Online
          </div>
        </div>
      </div>
    </aside>
  );
}