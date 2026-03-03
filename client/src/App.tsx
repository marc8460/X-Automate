import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import ContentEngine from "@/pages/ContentEngine";
import MediaVault from "@/pages/MediaVault";
import EngagementEngine from "@/pages/EngagementEngine";
import TrendScanner from "@/pages/TrendScanner";
import SettingsPage from "@/pages/Settings";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard}/>
        <Route path="/vault" component={MediaVault}/>
        <Route path="/content" component={ContentEngine}/>
        <Route path="/engagement" component={EngagementEngine}/>
        <Route path="/trends" component={TrendScanner}/>
        <Route path="/settings" component={SettingsPage}/>
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
