import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { AccountProvider } from "@/contexts/AccountContext";
import Dashboard from "@/pages/Dashboard";
import Composer from "@/pages/Composer";
import ContentStudio from "@/pages/ContentStudio";
import MediaVault from "@/pages/MediaVault";
import UnifiedInbox from "@/pages/UnifiedInbox";
import ViralEngine from "@/pages/ViralEngine";
import Discover from "@/pages/Discover";
import Analytics from "@/pages/Analytics";
import SettingsPage from "@/pages/Settings";
import LandingPage from "@/pages/Landing";
import DailyGoals from "@/pages/DailyGoals";
import DailyPlan from "@/pages/DailyPlan";
import CreatorMonitor from "@/pages/CreatorMonitor";
import { useSeedData } from "@/lib/hooks";
import { useAuth } from "@/hooks/use-auth";
import { registerPushNotifications } from "@/lib/pushSubscription";

function SeedOnMount() {
  const { mutate: seed } = useSeedData();
  useEffect(() => {
    seed();
  }, []);
  return null;
}

function PushNotificationSetup() {
  useEffect(() => {
    registerPushNotifications();
  }, []);
  return null;
}

function AuthenticatedRouter() {
  return (
    <Layout>
      <SeedOnMount />
      <PushNotificationSetup />
      <Switch>
        {/* Core */}
        <Route path="/" component={Dashboard} />

        {/* Content Studio */}
        <Route path="/studio" component={ContentStudio} />
        <Route path="/studio/calendar" component={ContentStudio} />
        <Route path="/studio/stories" component={ContentStudio} />

        {/* Library */}
        <Route path="/vault" component={MediaVault} />

        {/* Inbox — /inbox/threads served by UnifiedInbox */}
        <Route path="/inbox/threads" component={UnifiedInbox} />
        <Route path="/inbox/instagram" component={UnifiedInbox} />
        {/* Legacy aliases */}
        <Route path="/inbox" component={UnifiedInbox} />
        <Route path="/engagement" component={UnifiedInbox} />

        {/* Discover */}
        <Route path="/discover/trends" component={Discover} />
        <Route path="/discover/comments" component={Discover} />
        <Route path="/discover/opportunities" component={Discover} />
        <Route path="/discover" component={Discover} />
        {/* Legacy alias */}
        <Route path="/viral" component={ViralEngine} />

        {/* Growth */}
        <Route path="/analytics" component={Analytics} />
        <Route path="/goals/daily-plan" component={DailyPlan} />
        <Route path="/goals" component={DailyGoals} />
        <Route path="/creators" component={CreatorMonitor} />

        {/* Setup */}
        <Route path="/settings" component={SettingsPage} />
        {/* /setup → phase 5 */}

        {/* Legacy */}
        <Route path="/composer" component={Composer} />
        <Route path="/content" component={Composer} />

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppRouter() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Aura...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlatformProvider>
        <AccountProvider>
          <TooltipProvider>
            <Toaster />
            <AppRouter />
          </TooltipProvider>
        </AccountProvider>
      </PlatformProvider>
    </QueryClientProvider>
  );
}

export default App;
