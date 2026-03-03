import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopNav() {
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center md:hidden">
        <span className="font-display font-bold text-xl text-primary tracking-tight">Aura</span>
      </div>
      
      <div className="hidden md:flex items-center max-w-md w-full relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input 
          type="text"
          placeholder="Search tweets, campaigns, settings..."
          className="w-full bg-secondary/50 border border-border/50 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] cursor-pointer">
          <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </header>
  );
}