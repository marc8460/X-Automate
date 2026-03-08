import { Bell, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function TopNav() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-30 gap-4">
      <div className="flex items-center md:hidden">
        <span className="font-display font-bold text-xl text-primary tracking-tight">Aura</span>
      </div>

      <div className="hidden md:flex items-center max-w-sm w-full relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          placeholder="Search content, campaigns, settings..."
          className="w-full bg-secondary/50 border border-border/50 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
        </Button>

        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] cursor-pointer"
            data-testid="img-user-avatar"
          >
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-xs font-bold text-primary">
                  {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {user && (
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-medium text-foreground leading-tight" data-testid="text-username">
                {user.firstName || user.email?.split("@")[0] || "User"}
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground w-7 h-7"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
