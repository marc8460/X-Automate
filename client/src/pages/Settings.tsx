import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Shield, Key, Bot, Settings2, Save, Loader2 } from "lucide-react";
import { useSettings, useUpdateSetting } from "@/lib/hooks";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

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
              <Key className="w-5 h-5 text-yellow-500" />
              API Keys
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Twitter API Bearer Token</Label>
                <Input 
                  type="password" 
                  value={localSettings.twitterApiToken || ""} 
                  onChange={(e) => updateLocalSetting("twitterApiToken", e.target.value)}
                  className="bg-background/50 text-xs" 
                  data-testid="input-twitter-token"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">OpenAI API Key</Label>
                <Input 
                  type="password" 
                  value={localSettings.openaiApiKey || ""} 
                  onChange={(e) => updateLocalSetting("openaiApiKey", e.target.value)}
                  className="bg-background/50 text-xs" 
                  data-testid="input-openai-key"
                />
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" data-testid="button-manage-keys">Manage Keys</Button>
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