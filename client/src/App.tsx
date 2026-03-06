import { useEffect } from "react";
import { Switch, Route } from "wouter";
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
import MediaVault from "@/pages/MediaVault";
import UnifiedInbox from "@/pages/UnifiedInbox";
import ViralEngine from "@/pages/ViralEngine";
import Analytics from "@/pages/Analytics";
import SettingsPage from "@/pages/Settings";
import { useSeedData } from "@/lib/hooks";

function SeedOnMount() {
  const { mutate: seed } = useSeedData();
  useEffect(() => {
    seed();
  }, []);
  return null;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/vault" component={MediaVault} />
        <Route path="/composer" component={Composer} />
        {/* Legacy route redirect */}
        <Route path="/content" component={Composer} />
        <Route path="/inbox" component={UnifiedInbox} />
        {/* Legacy route redirect */}
        <Route path="/engagement" component={UnifiedInbox} />
        <Route path="/viral" component={ViralEngine} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlatformProvider>
        <AccountProvider>
          <TooltipProvider>
            <Toaster />
            <SeedOnMount />
            <Router />
          </TooltipProvider>
        </AccountProvider>
      </PlatformProvider>
    </QueryClientProvider>
  );
}

export default App;
