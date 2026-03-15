import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shield, Bot, Settings2, Save, Loader2, CheckCircle2, AlertCircle,
  Wifi, WifiOff, Link2, ExternalLink, Unplug, Sparkles, Plus, X as XIcon, Smartphone,
} from "lucide-react";
import { useSettings, useUpdateSetting, useConnectedAccounts } from "@/lib/hooks";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { PlatformBadge } from "@/components/platform/PlatformBadge";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

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

function XAccountCard({ account }: { account?: { platformUsername?: string | null; platformUserId?: string | null } }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const isConnected = !!account;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/auth/x/connect", { credentials: "include" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Error", description: data.message || "Failed to start X connection", variant: "destructive" });
        setConnecting(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Connection failed", variant: "destructive" });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/auth/disconnect/x", { method: "DELETE", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/connected-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/twitter/status"] });
      toast({ title: "Disconnected", description: "X account disconnected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDisconnecting(false);
  };

  return (
    <div className="rounded-xl border border-border/40 bg-background/30 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <PlatformBadge platform="x" showLabel size="sm" />
        <StatusBadge status={isConnected ? "connected" : "disconnected"} />
      </div>

      {isConnected && account && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent shrink-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {account.platformUsername?.charAt(0)?.toUpperCase() ?? "X"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate" data-testid="text-twitter-handle">
              @{account.platformUsername}
            </p>
            <p className="text-xs text-muted-foreground">Connected via OAuth</p>
          </div>
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
        </div>
      )}

      {!isConnected && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">Not Connected</p>
            <p className="text-xs text-amber-400/70">Click below to connect your X account</p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        Connect your X (Twitter) account to enable posting, engagement tracking, and analytics. No API keys needed.
      </p>

      <div className="flex items-center gap-2 mt-auto pt-1">
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8 text-destructive hover:text-destructive"
            onClick={handleDisconnect}
            disabled={disconnecting}
            data-testid="button-disconnect-x"
          >
            {disconnecting ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <Unplug className="w-3 h-3 mr-1.5" />
            )}
            Disconnect
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1 text-xs h-8 bg-gradient-to-r from-primary to-accent text-white"
            onClick={handleConnect}
            disabled={connecting}
            data-testid="button-connect-x"
          >
            {connecting ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <Link2 className="w-3 h-3 mr-1.5" />
            )}
            Connect X Account
          </Button>
        )}
      </div>
    </div>
  );
}

function ThreadsAccountCard({ account }: { account?: { platformUsername?: string | null; platformUserId?: string | null } }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const isConnected = !!account;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/auth/threads/connect", { credentials: "include" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Error", description: data.message || "Failed to start Threads connection", variant: "destructive" });
        setConnecting(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Connection failed", variant: "destructive" });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/auth/disconnect/threads", { method: "DELETE", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/connected-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/threads/status"] });
      toast({ title: "Disconnected", description: "Threads account disconnected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDisconnecting(false);
  };

  return (
    <div className="rounded-xl border border-border/40 bg-background/30 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <PlatformBadge platform="threads" showLabel size="sm" />
        <StatusBadge status={isConnected ? "connected" : "disconnected"} />
      </div>

      {isConnected && account && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary uppercase">
            {account.platformUsername?.[0] || "T"}
          </div>
          <div>
            <div className="text-sm font-medium">@{account.platformUsername}</div>
            <div className="text-xs text-muted-foreground">Connected via OAuth</div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
        </div>
      )}

      {!isConnected && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs text-amber-400">No Threads account connected</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        Connect your Threads account to enable posting and reply management. Uses Meta OAuth.
      </p>

      <div className="flex items-center gap-2 mt-auto pt-1">
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8 text-destructive hover:text-destructive"
            onClick={handleDisconnect}
            disabled={disconnecting}
            data-testid="button-disconnect-threads"
          >
            {disconnecting ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <Unplug className="w-3 h-3 mr-1.5" />
            )}
            Disconnect
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1 text-xs h-8 bg-gradient-to-r from-primary to-accent text-white"
            onClick={handleConnect}
            disabled={connecting}
            data-testid="button-connect-threads"
          >
            {connecting ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <Link2 className="w-3 h-3 mr-1.5" />
            )}
            Connect Threads
          </Button>
        )}
      </div>
    </div>
  );
}

function ComingSoonCard({ platform, description }: { platform: "instagram" | "tiktok"; description: string }) {
  return (
    <div className="rounded-xl border border-border/30 bg-background/20 p-5 flex flex-col gap-4 opacity-70">
      <div className="flex items-start justify-between gap-2">
        <PlatformBadge platform={platform} showLabel size="sm" />
        <StatusBadge status="coming_soon" />
      </div>
      <div className="h-[52px] rounded-lg bg-secondary/30 border border-border/20 flex items-center justify-center">
        <span className="text-xs text-muted-foreground/40 font-medium uppercase tracking-wider">Not Connected</span>
      </div>
      <p className="text-xs text-muted-foreground/70 leading-relaxed flex-1">{description}</p>
      <Button variant="outline" size="sm" className="w-full text-xs h-8 opacity-40 cursor-not-allowed" disabled>
        Connect Account
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const { data: connectedAccounts } = useConnectedAccounts();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [location] = useLocation();

  const xAccount = connectedAccounts?.find((a: any) => a.platform === "x");
  const threadsAccount = connectedAccounts?.find((a: any) => a.platform === "threads");
  const connectedCount = (xAccount ? 1 : 0) + (threadsAccount ? 1 : 0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const username = params.get("username");
    const error = params.get("error");

    if (connected) {
      toast({
        title: `${connected === "x" ? "X" : "Threads"} Connected!`,
        description: username ? `Logged in as @${username}` : "Account connected successfully",
      });
      window.history.replaceState({}, "", "/settings");
    }
    if (error) {
      toast({ title: "Connection Failed", description: decodeURIComponent(error), variant: "destructive" });
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  useEffect(() => {
    if (settings) {
      const settingsMap = settings.reduce((acc: Record<string, string>, s: any) => ({ ...acc, [s.key]: s.value }), {});
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

      <Card className="p-6 glass-panel border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-display font-semibold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Connected Accounts
          </h2>
          <span className="text-xs text-muted-foreground">
            {connectedCount} / 4 connected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <XAccountCard account={xAccount} />
          <ThreadsAccountCard account={threadsAccount} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
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
                  onValueChange={([v]) => updateLocalSetting("seductiveness", String(v))}
                  max={100}
                  step={1}
                  data-testid="slider-seductiveness"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Playfulness</Label>
                  <span className="text-xs text-muted-foreground font-mono">{localSettings.playfulness || "0"}%</span>
                </div>
                <Slider
                  value={[parseInt(localSettings.playfulness || "0")]}
                  onValueChange={([v]) => updateLocalSetting("playfulness", String(v))}
                  max={100}
                  step={1}
                  data-testid="slider-playfulness"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Dominance</Label>
                  <span className="text-xs text-muted-foreground font-mono">{localSettings.dominance || "0"}%</span>
                </div>
                <Slider
                  value={[parseInt(localSettings.dominance || "0")]}
                  onValueChange={([v]) => updateLocalSetting("dominance", String(v))}
                  max={100}
                  step={1}
                  data-testid="slider-dominance"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 glass-panel border-border/50">
            <h2 className="text-xl font-display font-semibold mb-6 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Operational Parameters
            </h2>
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Daily Tweet Target</Label>
                  <span className="text-xs text-muted-foreground font-mono">{localSettings.dailyTweetTarget || "3"}</span>
                </div>
                <Slider
                  value={[parseInt(localSettings.dailyTweetTarget || "3")]}
                  onValueChange={([v]) => updateLocalSetting("dailyTweetTarget", String(v))}
                  max={20}
                  step={1}
                  data-testid="slider-daily-target"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Max Daily Replies</Label>
                  <span className="text-xs text-muted-foreground font-mono">{localSettings.maxDailyReplies || "50"}</span>
                </div>
                <Slider
                  value={[parseInt(localSettings.maxDailyReplies || "50")]}
                  onValueChange={([v]) => updateLocalSetting("maxDailyReplies", String(v))}
                  max={200}
                  step={5}
                  data-testid="slider-max-replies"
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label>Human Typing Simulation</Label>
                <Switch
                  checked={localSettings.humanTypingSimulation === "true"}
                  onCheckedChange={(v) => updateLocalSetting("humanTypingSimulation", String(v))}
                  data-testid="switch-typing-sim"
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label>Random Jitter Delay</Label>
                <Switch
                  checked={localSettings.randomJitterDelay === "true"}
                  onCheckedChange={(v) => updateLocalSetting("randomJitterDelay", String(v))}
                  data-testid="switch-jitter"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 glass-panel border-border/50">
            <h2 className="text-xl font-display font-semibold mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Safety
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <Label>Browser Fingerprinting</Label>
                <Switch
                  checked={localSettings.browserFingerprinting === "true"}
                  onCheckedChange={(v) => updateLocalSetting("browserFingerprinting", String(v))}
                  data-testid="switch-fingerprint"
                />
              </div>
            </div>
          </Card>

          <Button
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white"
            onClick={handleSave}
            disabled={updateSetting.isPending}
            data-testid="button-save-settings"
          >
            {updateSetting.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save All Settings
          </Button>
        </div>
      </div>

      {/* Persona Engine */}
      <Card className="p-6 glass-panel border-primary/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/40 to-accent/40" />
        <h2 className="text-xl font-display font-semibold mb-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Persona Engine
        </h2>
        <p className="text-sm text-muted-foreground mb-6">Define your AI voice. These settings apply across captions, comments, DM replies, and story ideas.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: tone + emoji style */}
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-semibold text-foreground mb-3 block">Tone</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["playful", "seductive", "direct", "professional"] as const).map((tone) => (
                  <button
                    key={tone}
                    onClick={() => updateLocalSetting("persona_tone", tone)}
                    className={`px-4 py-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${
                      (localSettings.persona_tone || "seductive") === tone
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-foreground mb-3 block">Emoji Style</Label>
              <div className="flex gap-2">
                {(["none", "minimal", "expressive"] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => updateLocalSetting("persona_emoji_style", style)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                      (localSettings.persona_emoji_style || "minimal") === style
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {style === "none" && "🚫 None"}
                    {style === "minimal" && "✨ Minimal"}
                    {style === "expressive" && "🔥 Expressive"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: signature + forbidden phrases */}
          <div className="space-y-6">
            <PhraseListEditor
              label="Signature Phrases"
              description="AI will occasionally use these phrases in your content."
              placeholder="e.g. as always, babe"
              storageKey="persona_signature_phrases"
              localSettings={localSettings}
              updateLocalSetting={updateLocalSetting}
            />
            <PhraseListEditor
              label="Forbidden Phrases"
              description="AI will never use these words or phrases."
              placeholder="e.g. competitor name"
              storageKey="persona_forbidden_phrases"
              localSettings={localSettings}
              updateLocalSetting={updateLocalSetting}
              forbidden
            />
          </div>
        </div>
      </Card>

      <MobileApiTokenCard />
    </div>
  );
}

function MobileApiTokenCard() {
  const [tokens, setTokens] = useState<Array<{ id: number; label: string; tokenPreview: string; createdAt: string; lastUsedAt: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const { toast } = useToast();

  const loadTokens = async () => {
    try {
      const resp = await fetch("/api/mobile/auth/tokens", { credentials: "include" });
      if (resp.ok) setTokens(await resp.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadTokens(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const resp = await fetch("/api/mobile/auth/generate-token", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel || "Mobile Device" }),
      });
      if (!resp.ok) throw new Error("Failed to generate token");
      const data = await resp.json();
      setNewToken(data.token);
      setNewLabel("");
      loadTokens();
      toast({ title: "Token Generated", description: "Copy it now — it won't be shown again." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleRevoke = async (id: number) => {
    try {
      const resp = await fetch(`/api/mobile/auth/tokens/${id}`, { method: "DELETE", credentials: "include" });
      if (!resp.ok) throw new Error("Failed to revoke token");
      setTokens((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Token Revoked" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-6 glass-panel border-border/50">
      <h2 className="text-xl font-display font-semibold mb-1 flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-primary" />
        Mobile API Tokens
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Generate tokens to connect the Aura AI Keyboard mobile app.
      </p>

      <div className="flex gap-2 mb-4">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Device label (e.g. iPhone 15)"
          className="text-sm h-9"
          data-testid="input-mobile-token-label"
        />
        <Button
          onClick={handleGenerate}
          disabled={generating}
          size="sm"
          className="shrink-0"
          data-testid="button-generate-mobile-token"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Token"}
        </Button>
      </div>

      {newToken && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-primary font-semibold mb-1">NEW TOKEN — Copy now, it won't be shown again:</p>
          <code className="text-xs text-foreground break-all select-all" data-testid="text-new-mobile-token">{newToken}</code>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No active tokens</p>
      ) : (
        <div className="space-y-2">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50" data-testid={`row-mobile-token-${t.id}`}>
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">
                  {t.tokenPreview} · Created {new Date(t.createdAt).toLocaleDateString()}
                  {t.lastUsedAt && ` · Last used ${new Date(t.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRevoke(t.id)} data-testid={`button-revoke-token-${t.id}`}>
                <XIcon size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PhraseListEditor({
  label,
  description,
  placeholder,
  storageKey,
  localSettings,
  updateLocalSetting,
  forbidden = false,
}: {
  label: string;
  description: string;
  placeholder: string;
  storageKey: string;
  localSettings: Record<string, string>;
  updateLocalSetting: (key: string, value: string) => void;
  forbidden?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const phrases = (localSettings[storageKey] || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const addPhrase = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || phrases.includes(trimmed)) return;
    updateLocalSetting(storageKey, [...phrases, trimmed].join(", "));
    setInputValue("");
  };

  const removePhrase = (phrase: string) => {
    updateLocalSetting(storageKey, phrases.filter((p) => p !== phrase).join(", "));
  };

  return (
    <div>
      <Label className="text-sm font-semibold text-foreground mb-1 block">{label}</Label>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      <div className="flex gap-2 mb-3">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="text-sm h-9"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhrase())}
        />
        <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={addPhrase}>
          <Plus size={14} />
        </Button>
      </div>
      {phrases.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {phrases.map((phrase) => (
            <span
              key={phrase}
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
                forbidden
                  ? "bg-red-500/10 text-red-400 border-red-400/20"
                  : "bg-primary/10 text-primary/80 border-primary/20"
              }`}
            >
              {phrase}
              <button onClick={() => removePhrase(phrase)} className="opacity-60 hover:opacity-100 transition-opacity">
                <XIcon size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
