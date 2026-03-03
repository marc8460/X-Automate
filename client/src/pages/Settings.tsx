import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Shield, Key, Bot, Settings2, Save } from "lucide-react";

export default function SettingsPage() {
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
                  <span className="text-xs text-muted-foreground font-mono">60%</span>
                </div>
                <Slider defaultValue={[60]} max={100} step={1} className="[&_[role=slider]]:border-primary" />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Dominance</Label>
                  <span className="text-xs text-muted-foreground font-mono">35%</span>
                </div>
                <Slider defaultValue={[35]} max={100} step={1} className="[&_[role=slider]]:border-primary" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Playfulness</Label>
                  <span className="text-xs text-muted-foreground font-mono">85%</span>
                </div>
                <Slider defaultValue={[85]} max={100} step={1} className="[&_[role=slider]]:border-primary" />
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
                <Input type="number" defaultValue="3" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Max Daily Replies</Label>
                <Input type="number" defaultValue="50" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Min Delay (Minutes)</Label>
                <Input type="number" defaultValue="2" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Max Delay (Minutes)</Label>
                <Input type="number" defaultValue="15" className="bg-background/50" />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <Card className="p-6 glass-panel border-border/50">
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Safety & Limits
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Safety Filter</Label>
                  <p className="text-xs text-muted-foreground">Maintain professional standards</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Human Simulation</Label>
                  <p className="text-xs text-muted-foreground">Randomized pauses</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Sleep Mode</Label>
                  <p className="text-xs text-muted-foreground">Pause during 2AM-8AM</p>
                </div>
                <Switch defaultChecked />
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
                <Input type="password" value="************************" className="bg-background/50 text-xs" readOnly />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">OpenAI API Key</Label>
                <Input type="password" value="************************" className="bg-background/50 text-xs" readOnly />
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs">Manage Keys</Button>
            </div>
          </Card>
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
          <Save className="w-4 h-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
}