import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-accent/10 rounded-full blur-[150px]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Aura</span>
        </div>
        <Button
          onClick={() => { window.location.href = "/api/login"; }}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium px-6"
          data-testid="button-login"
        >
          Sign In
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </nav>

      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-20 pb-32 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-8">
          <Zap className="w-3.5 h-3.5" />
          AI-Powered Social Automation
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.1] mb-6">
          Your AI Influencer
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Command Center
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          Generate viral content, automate engagement, and grow your audience across X and Threads
          with AI-powered tools designed for modern influencers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Button
            size="lg"
            onClick={() => { window.location.href = "/api/login"; }}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold px-8 py-6 text-base"
            data-testid="button-get-started"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <FeatureCard
            icon={<Sparkles className="w-5 h-5" />}
            title="AI Content Studio"
            description="Generate on-brand tweets with persona controls for tone, style, and seductiveness."
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="Viral Engine"
            description="Scan trending topics, browse your feed, and generate engagement-optimized comments."
          />
          <FeatureCard
            icon={<Shield className="w-5 h-5" />}
            title="Smart Inbox"
            description="Auto-detect mentions, replies, and follower activity across X and Threads."
          />
        </div>
      </main>

      <footer className="relative z-10 text-center py-8 border-t border-border/30">
        <p className="text-sm text-muted-foreground">
          Sign in with Google, X, Apple, or email to get started.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl border border-border/40 bg-background/30 backdrop-blur-sm text-left hover:bg-background/50 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
