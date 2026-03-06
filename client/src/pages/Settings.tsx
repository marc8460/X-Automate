import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Bot, Settings2, Save, Loader2, CheckCircle2, AlertCircle,
  Wifi, WifiOff, Link2, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { useSettings, useUpdateSetting, useTwitterStatus, useTestTwitterConnection, useThreadsStatus, useTestThreadsConnection } from "@/lib/hooks";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { PlatformBadge } from "@/components/platform/PlatformBadge";
import { AnimatePresence, motion } from "framer-motion";

// ── Platform card configs ─────────────────────────────────────────────────────

type PlatformCardConfig = {
  platform: "x" | "threads" | "instagram" | "tiktok";
  status: "active" | "disconnected" | "coming_soon";
  description: string;
  docLink?: string;
};

const PLATFORM_CARDS: PlatformCardConfig[] = [
  {
    platform: "x",
    status: "active", // overridden at runtime by twitterStatus
    description: "Connect your X (Twitter) account using the official API. Required for posting, engagement, and analytics.",
    docLink: "https://developer.twitter.com/en/portal/dashboard",
  },
  {
    platform: "threads",
    status: "coming_soon",
    description: "API integration is in progress. Threads support will be activated as soon as the Threads API supports publishing.",
  },
  {
    platform: "instagram",
    status: "coming_soon",
    description: "Instagram integration is planned for a future release. Your posts and analytics will appear here once connected.",
  },
  {
    platform: "tiktok",
    status: "coming_soon",
    description: "TikTok integration is on the roadmap. Stay tuned for updates on this platform connection.",
  },
];

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "connected" | "disconnected" | "coming_soon" }) {
  if (status === "connected") {
    return (
      <Badge className="text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-400/30 gap-1">
        <CheckCircle2 className="w-2.5 h-2.5" /> Active
      </Badge>
    );
  }
  if (status === "disconnected") {
    return (
      <Badge className="text-[10px] uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-400/30 gap-1">
        <AlertCircle className="w-2.5 h-2.5" /> Not Connected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground/60 border-border/40">
      Coming Soon
    </Badge>
  );
}

// ── X platform card (live) ────────────────────────────────────────────────────

function XAccountCard({
  twitterStatus,
  twitterCreds,
  setTwitterCreds,
  testConnection,
}: {
  twitterStatus: { connected: boolean; handle?: string; name?: string; followersCount?: number; error?: string } | undefined;
  twitterCreds: { appKey: string; appSecret: string; accessToken: string; accessSecret: string };
  setTwitterCreds: React.Dispatch<React.SetStateAction<typeof twitterCreds>>;
  testConnection: ReturnType<typeof useTestTwitterConnection>;
}) {
  const { toast } = useToast();
  const isConnected = twitterStatus?.connected ?? false;
  const [credsOpen, setCredsOpen] = useState(!isConnected);

  return (
    <div className="rounded-xl border border-border/40 bg-background/30 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <PlatformBadge platform="x" showLabel size="sm" />
        <StatusBadge status={isConnected ? "connected" : "disconnected"} />
      </div>

      {/* Connected state info */}
      {isConnected && twitterStatus && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent shrink-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {twitterStatus.handle?.charAt(1)?.toUpperCase() ?? "X"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate" data-testid="text-twitter-handle">
              {twitterStatus.name || twitterStatus.handle}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {twitterStatus.handle}
              {twitterStatus.followersCount != null && (
                <span className="ml-2 text-muted-foreground/70">
                  · {twitterStatus.followersCount.toLocaleString()} followers
                </span>
              )}
            </p>
          </div>
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
        </div>
      )}

      {/* Not connected prompt */}
      {!isConnected && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">Not Connected</p>
            <p className="text-xs text-amber-400/70">Add credentials below to activate</p>
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Connect using the official X API. Credentials are set as environment secrets on the server.
      </p>

      {/* Credential toggle */}
      <button
        onClick={() => setCredsOpen((v) => !v)}
        className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>API Credentials</span>
        {credsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence initial={false}>
        {credsOpen && (
          <motion.div
            key="creds"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs">App Key (API Key)</Label>
                <Input
                  type="password"
                  value={twitterCreds.appKey}
                  onChange={(e) => setTwitterCreds((p) => ({ ...p, appKey: e.target.value }))}
                  placeholder="Enter your Twitter App Key"
                  className="bg-background/50 text-xs h-8"
                  data-testid="input-twitter-app-key"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">App Secret (API Secret)</Label>
                <Input
                  type="password"
                  value={twitterCreds.appSecret}
                  onChange={(e) => setTwitterCreds((p) => ({ ...p, appSecret: e.target.value }))}
                  placeholder="Enter your Twitter App Secret"
                  className="bg-background/50 text-xs h-8"
                  data-testid="input-twitter-app-secret"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Access Token</Label>
                <Input
                  type="password"
                  value={twitterCreds.accessToken}
                  onChange={(e) => setTwitterCreds((p) => ({ ...p, accessToken: e.target.value }))}
                  placeholder="Enter your Access Token"
                  className="bg-background/50 text-xs h-8"
                  data-testid="input-twitter-access-token"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Access Secret</Label>
                <Input
                  type="password"
                  value={twitterCreds.accessSecret}
                  onChange={(e) => setTwitterCreds((p) => ({ ...p, accessSecret: e.target.value }))}
                  placeholder="Enter your Access Secret"
                  className="bg-background/50 text-xs h-8"
                  data-testid="input-twitter-access-secret"
                />
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight px-0.5">
                Set these as environment secrets:{" "}
                <span className="text-primary font-mono">TWITTER_APP_KEY</span>,{" "}
                <span className="text-primary font-mono">TWITTER_APP_SECRET</span>,{" "}
                <span className="text-primary font-mono">TWITTER_ACCESS_TOKEN</span>,{" "}
                <span className="text-primary font-mono">TWITTER_ACCESS_SECRET</span>.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-8"
          onClick={() => {
            testConnection.mutate(undefined, {
              onSuccess: (data: any) => {
                if (data.connected) {
                  toast({ title: "Connected!", description: `Logged in as ${data.handle}` });
                } else {
                  toast({ title: "Connection failed", description: data.error || "Check your credentials", variant: "destructive" });
                }
              },
            });
          }}
          disabled={testConnection.isPending}
          data-testid="button-test-twitter"
        >
          {testConnection.isPending ? (
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          ) : (
            <Wifi className="w-3 h-3 mr-1.5" />
          )}
          Test Connection
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          asChild
        >
          <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}

// ── Threads account card ──────────────────────────────────────────────────────

function ThreadsAccountCard() {
  const { data: threadsStatus, isLoading } = useThreadsStatus();
  const testConnection = useTestThreadsConnection();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const connected = threadsStatus?.connected ?? false;
  const username = threadsStatus?.username;

  const [tokenOpen, setTokenOpen] = useState(!connected);
  const [token, setToken] = useState("");

  // Auto-open when disconnected once status loads
  useEffect(() => {
    if (!isLoading && !connected) setTokenOpen(true);
  }, [isLoading, connected]);

  const handleSaveAndTest = async () => {
    if (!token.trim()) return;
    try {
      await updateSetting.mutateAsync({ key: "threads_access_token", value: token.trim() });
      const result = await testConnection.mutateAsync();
      if (result?.connected) {
        toast({ title: "Threads connected", description: `Logged in as @${result.username}` });
        setToken("");
        setTokenOpen(false);
      } else {
        toast({ title: "Connection failed", description: result?.error || "Invalid access token.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleTest = async () => {
    try {
      const result = await testConnection.mutateAsync();
      if (result?.connected) {
        toast({ title: "Threads connected", description: `Active as @${result.username}` });
      } else {
        toast({ title: "Not connected", description: result?.error || "No valid token found.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    }
  };

  const isPending = updateSetting.isPending || testConnection.isPending;

  return (
    <div className="rounded-xl border border-border/40 bg-background/30 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <PlatformBadge platform="threads" showLabel size="sm" />
        {isLoading
          ? <div className="h-5 w-16 rounded-full bg-secondary/40 animate-pulse" />
          : <StatusBadge status={connected ? "connected" : "disconnected"} />
        }
      </div>

      {/* Connected state: show username */}
      {connected && username && (
        <div className="flex items-center gap-3 h-[52px] px-3 rounded-lg bg-secondary/20 border border-border/20">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary uppercase">
            {username[0]}
          </div>
          <div>
            <div className="text-sm font-medium">@{username}</div>
            <div className="text-xs text-muted-foreground">Threads Account</div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
        </div>
      )}

      {/* Disconnected placeholder */}
      {!connected && !isLoading && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs text-amber-400">No Threads account connected</span>
        </div>
      )}

      {/* Collapsible token input */}
      <div>
        <button
          type="button"
          onClick={() => setTokenOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        >
          {tokenOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Access Token
        </button>
        <AnimatePresence initial={false}>
          {tokenOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Paste your long-lived access token…"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="text-xs h-8 bg-secondary/30 border-border/40 flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveAndTest}
                    disabled={!token.trim() || isPending}
                    className="h-8 text-xs px-3 shrink-0"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  Get your token from the{" "}
                  <a
                    href="https://developers.facebook.com/apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Meta for Developers
                  </a>{" "}
                  portal under your Threads app.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={testConnection.isPending}
          className="flex-1 text-xs h-8 gap-1.5"
        >
          {testConnection.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />
          }
          Test Connection
        </Button>
        <a
          href="https://developers.facebook.com/docs/threads"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors h-8 px-2"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Docs
        </a>
      </div>
    </div>
  );
}

// ── Coming-soon platform card ─────────────────────────────────────────────────

function ComingSoonCard({ platform, description }: { platform: "threads" | "instagram" | "tiktok"; description: string }) {
  return (
    <div className="rounded-xl border border-border/30 bg-background/20 p-5 flex flex-col gap-4 opacity-70">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <PlatformBadge platform={platform} showLabel size="sm" />
        <StatusBadge status="coming_soon" />
      </div>

      {/* Placeholder bar */}
      <div className="h-[52px] rounded-lg bg-secondary/30 border border-border/20 flex items-center justify-center">
        <span className="text-xs text-muted-foreground/40 font-medium uppercase tracking-wider">Not Connected</span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground/70 leading-relaxed flex-1">{description}</p>

      {/* Disabled button */}
      <Button variant="outline" size="sm" className="w-full text-xs h-8 opacity-40 cursor-not-allowed" disabled>
        Connect Account
      </Button>
    </div>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const { data: twitterStatus } = useTwitterStatus();
  const testConnection = useTestTwitterConnection();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [twitterCreds, setTwitterCreds] = useState({
    appKey: "",
    appSecret: "",
    accessToken: "",
    accessSecret: "",
  });

  useEffect(() => {
    if (settings) {
      const settingsMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
      setLocalSettings(settingsMap);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await Promise.all(
        Object.entries(localSettings).map(([key, value]) =>
          updateSetting.mutateAsync({ key, value }),
        ),
      );
      toast({ title: "Settings saved", description: "Your configuration has been updated successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings. Please try again.", variant: "destructive" });
    }
  };

  const updateLocalSetting = (key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage connected accounts, persona, and system parameters.</p>
      </div>

      {/* ── Connected Accounts ───────────────────────────────────────────────── */}
      <Card className="p-6 glass-panel border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-display font-semibold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Connected Accounts
          </h2>
          <span className="text-xs text-muted-foreground">
            {twitterStatus?.connected ? "1" : "0"} / 4 connected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* X — live */}
          <XAccountCard
            twitterStatus={twitterStatus}
            twitterCreds={twitterCreds}
            setTwitterCreds={setTwitterCreds}
            testConnection={testConnection}
          />

          {/* Threads — live */}
          <ThreadsAccountCard />
          <ComingSoonCard
            platform="instagram"
            description="Instagram integration is planned for a future release. Connect to manage posts and analytics."
          />
          <ComingSoonCard
            platform="tiktok"
            description="TikTok integration is on the roadmap. Stay tuned for updates on this platform connection."
          />
        </div>
      </Card>

      {/* ── Bottom grid: Persona + Operational / Shadowban ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* Persona */}
          <Card className="p-6 glass-panel border-border/50">
            <h2 className="text-xl font-display font-semibold mb-6 flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Persona Configuration
            </h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Seductiveness</Label>
                  <span className="text-xs text-muted-foreground font-mono">{localSettings.seductiveness || "0"}%</span>
                </div>
                <Slider
                  value={[parseInt(localSettings.seductiveness || "0")]}
                  onValueChange={(val) => updateLocalSetting("seductiveness", val[0].toString())}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:border-primary"
                  data-testid="slider-seductiveness"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Dominance</Label>
                  <span className="text-xs text-muted-foreground font-mono">{localSettings.dominance || "0"}%</span>
                </div>
                <Slider
                  value={[parseInt(localSettings.dominance || "0")]}
                  onValueChange={(val) => updateLocalSetting("dominance", val[0].toString())}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:border-primary"
                  data-testid="slider-dominance"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Playfulness</Label>
                  <span className="text-xs text-muted-foreground font-mono">{localSettings.playfulness || "0"}%</span>
                </div>
                <Slider
                  value={[parseInt(localSettings.playfulness || "0")]}
                  onValueChange={(val) => updateLocalSetting("playfulness", val[0].toString())}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:border-primary"
                  data-testid="slider-playfulness"
                />
              </div>
            </div>
          </Card>

          {/* Operational Parameters */}
          <Card className="p-6 glass-panel border-border/50">
            <h2 className="text-xl font-display font-semibold mb-6 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-accent" />
              Operational Parameters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Daily Tweet Target</Label>
                <Input
                  type="number"
                  value={localSettings.dailyTweetTarget || ""}
                  onChange={(e) => updateLocalSetting("dailyTweetTarget", e.target.value)}
                  className="bg-background/50"
                  data-testid="input-daily-tweet-target"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Daily Replies</Label>
                <Input
                  type="number"
                  value={localSettings.maxDailyReplies || ""}
                  onChange={(e) => updateLocalSetting("maxDailyReplies", e.target.value)}
                  className="bg-background/50"
                  data-testid="input-max-daily-replies"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Delay (Minutes)</Label>
                <Input
                  type="number"
                  value={localSettings.minDelayMinutes || ""}
                  onChange={(e) => updateLocalSetting("minDelayMinutes", e.target.value)}
                  className="bg-background/50"
                  data-testid="input-min-delay"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Delay (Minutes)</Label>
                <Input
                  type="number"
                  value={localSettings.maxDelayMinutes || ""}
                  onChange={(e) => updateLocalSetting("maxDelayMinutes", e.target.value)}
                  className="bg-background/50"
                  data-testid="input-max-delay"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Shadowban Protection sidebar */}
        <div>
          <Card className="p-6 glass-panel border-primary/30 bg-primary/5">
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Shadowban Protection
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Human Typing Simulation</Label>
                  <p className="text-xs text-muted-foreground">Varies keystroke intervals</p>
                </div>
                <Switch
                  checked={localSettings.humanTypingSimulation === "true"}
                  onCheckedChange={(val) => updateLocalSetting("humanTypingSimulation", val.toString())}
                  data-testid="switch-human-typing"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Random Jitter Delay</Label>
                  <p className="text-xs text-muted-foreground">+/- 15% interval variance</p>
                </div>
                <Switch
                  checked={localSettings.randomJitterDelay === "true"}
                  onCheckedChange={(val) => updateLocalSetting("randomJitterDelay", val.toString())}
                  data-testid="switch-jitter-delay"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Browser Fingerprinting</Label>
                  <p className="text-xs text-muted-foreground">Rotate user agents</p>
                </div>
                <Switch
                  checked={localSettings.browserFingerprinting === "true"}
                  onCheckedChange={(val) => updateLocalSetting("browserFingerprinting", val.toString())}
                  data-testid="switch-browser-fingerprinting"
                />
              </div>
              <div className="mt-4 p-3 bg-background/50 rounded-md border border-border/50">
                <p className="text-[10px] text-muted-foreground leading-tight">
                  <strong className="text-primary">Note:</strong> Our Anti-Detection Layer uses randomized time windows and engagement caps to ensure your activity patterns never look like a bot's.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-4">
        <Button
          className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
          onClick={handleSave}
          disabled={updateSetting.isPending}
          data-testid="button-save-settings"
        >
          {updateSetting.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
