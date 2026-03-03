import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Shield, Key, Bot, Settings2, Save, Loader2, CheckCircle2, AlertCircle, Twitter, Wifi, WifiOff, Workflow } from "lucide-react";
import { useSettings, useUpdateSetting, useTwitterStatus, useTestTwitterConnection } from "@/lib/hooks";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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
          updateSetting.mutateAsync({ key, value })
        )
      );
      toast({
        title: "Settings saved",
        description: "Your configuration has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
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
        <h1 className="text-3xl font-bold font-display tracking-tight">System Configuration</h1>
        <p className="text-muted-foreground mt-1">Manage API keys, behavioral parameters, and safety limits.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Persona Settings */}
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

          {/* Behavior Settings */}
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

        {/* Anti-Detection Sidebar */}
        <div className="space-y-6">
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

          <Card className="p-6 glass-panel border-border/50">
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Twitter className="w-5 h-5 text-blue-400" />
              Twitter / X Connection
            </h2>

            <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${
              twitterStatus?.connected 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-amber-500/10 border border-amber-500/30'
            }`}>
              {twitterStatus?.connected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-400" data-testid="text-twitter-handle">{twitterStatus.handle}</p>
                    <p className="text-[10px] text-green-400/70">Connected — Live Mode</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-400">Not Connected</p>
                    <p className="text-[10px] text-amber-400/70">Demo Mode — add credentials below</p>
                  </div>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">App Key (API Key)</Label>
                <Input
                  type="password"
                  value={twitterCreds.appKey}
                  onChange={(e) => setTwitterCreds(p => ({ ...p, appKey: e.target.value }))}
                  placeholder="Enter your Twitter App Key"
                  className="bg-background/50 text-xs"
                  data-testid="input-twitter-app-key"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">App Secret (API Secret)</Label>
                <Input
                  type="password"
                  value={twitterCreds.appSecret}
                  onChange={(e) => setTwitterCreds(p => ({ ...p, appSecret: e.target.value }))}
                  placeholder="Enter your Twitter App Secret"
                  className="bg-background/50 text-xs"
                  data-testid="input-twitter-app-secret"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Access Token</Label>
                <Input
                  type="password"
                  value={twitterCreds.accessToken}
                  onChange={(e) => setTwitterCreds(p => ({ ...p, accessToken: e.target.value }))}
                  placeholder="Enter your Access Token"
                  className="bg-background/50 text-xs"
                  data-testid="input-twitter-access-token"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Access Secret</Label>
                <Input
                  type="password"
                  value={twitterCreds.accessSecret}
                  onChange={(e) => setTwitterCreds(p => ({ ...p, accessSecret: e.target.value }))}
                  placeholder="Enter your Access Secret"
                  className="bg-background/50 text-xs"
                  data-testid="input-twitter-access-secret"
                />
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
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
                {testConnection.isPending ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Wifi className="w-3 h-3 mr-1.5" />}
                Test Connection
              </Button>

              <div className="p-2.5 bg-background/50 rounded-md border border-border/50">
                <p className="text-[10px] text-muted-foreground leading-tight">
                  <strong className="text-blue-400">Official API:</strong> Uses Twitter's official API for all operations. No IP spoofing, device emulation, or browser automation needed — server-to-server calls are expected by Twitter.
                </p>
              </div>

              <div className="p-2.5 bg-background/50 rounded-md border border-border/50">
                <p className="text-[10px] text-muted-foreground leading-tight">
                  <strong className="text-primary">Setup:</strong> Add your credentials as environment secrets named TWITTER_APP_KEY, TWITTER_APP_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_SECRET. Get these from the Twitter Developer Portal.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 glass-panel border-border/50">
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Workflow className="w-5 h-5 text-orange-400" />
              n8n Scraper
            </h2>

            <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${
              localSettings.n8nWebhookUrl 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-muted/30 border border-border/50'
            }`}>
              {localSettings.n8nWebhookUrl ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-400">Webhook Configured</p>
                    <p className="text-[10px] text-green-400/70">n8n will scrape real posts when you discover</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Not Configured</p>
                    <p className="text-[10px] text-muted-foreground/70">Add your n8n webhook URL below</p>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">n8n Webhook URL</Label>
                <Input
                  value={localSettings.n8nWebhookUrl || ""}
                  onChange={(e) => updateLocalSetting("n8nWebhookUrl", e.target.value)}
                  placeholder="https://your-n8n.app/webhook/xxxxx"
                  className="bg-background/50 text-xs"
                  data-testid="input-n8n-webhook-url"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Callback URL (for n8n to send results back)</Label>
                <Input
                  value={`${window.location.origin}/api/trending-posts/import`}
                  readOnly
                  className="bg-background/50 text-xs font-mono text-muted-foreground"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).select();
                    navigator.clipboard.writeText(`${window.location.origin}/api/trending-posts/import`);
                    toast({ title: "Copied!", description: "Callback URL copied to clipboard." });
                  }}
                  data-testid="input-n8n-callback-url"
                />
                <p className="text-[9px] text-muted-foreground">Click to copy. Use this in your n8n HTTP Request node.</p>
              </div>

              <div className="p-2.5 bg-background/50 rounded-md border border-border/50">
                <p className="text-[10px] text-muted-foreground leading-tight">
                  <strong className="text-orange-400">How it works:</strong> When you click "Search Twitter" in Trend Scanner, your app sends the niche keywords to n8n. n8n scrapes real tweets and sends them back to your app automatically. No paid Twitter API needed.
                </p>
              </div>

              <div className="p-2.5 bg-background/50 rounded-md border border-border/50">
                <p className="text-[10px] text-muted-foreground leading-tight">
                  <strong className="text-orange-400">n8n Setup:</strong> Create a workflow with: Webhook trigger → X/Twitter scrape node → Code node (format data) → HTTP Request node (POST to callback URL above). Set the Webhook trigger to receive POST requests.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
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