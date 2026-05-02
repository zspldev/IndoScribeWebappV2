import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Mic,
  Globe,
  Radio,
  MessageSquareText,
  Languages,
  ShieldCheck,
} from "lucide-react";
import combinedLogo from "@/assets/images/ISP-Combined-Logo.png";
import zapurzaaLogo from "@/assets/images/Zapurzaa-Logo.png";
import HowItWorks from "@/components/HowItWorks";

const whyFeatures = [
  {
    icon: Mic,
    title: "Dictate. Transcribe. Format. Translate.",
    description: "Everything in one seamless workflow.",
  },
  {
    icon: Globe,
    title: "Powered by an Advanced Indian LLM",
    description: "Built specifically for Marathi, Hindi, and other Indic languages.",
  },
  {
    icon: Radio,
    title: "Live or Recorded Audio",
    description: "Speak in real time or upload audio — your choice.",
  },
  {
    icon: MessageSquareText,
    title: "Voice-Controlled Formatting",
    description: 'Say "new line," "bold on," "new page" — and structure your document as you speak.',
  },
  {
    icon: Languages,
    title: "One-Click Indian Language Translation",
    description: "Instantly convert your content across multiple Indian languages.",
  },
  {
    icon: ShieldCheck,
    title: "Private. Secure. Sovereign.",
    description: "Download outputs directly to your device. All data encrypted and securely stored in Mumbai, India.",
  },
];

export default function Landing() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background flex flex-col" data-testid="page-landing">
      <div className="flex items-center justify-center px-6 pt-6 pb-8">
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="flex-1 flex flex-col items-center text-center max-w-lg">
            <div className="flex flex-col items-center mb-6">
              <img src={combinedLogo} alt="IndoScribe Pro" className="h-16 md:h-20 mb-4" data-testid="img-hero-logo" />
              <span className="text-sm font-semibold text-muted-foreground tracking-wide mb-1">Created by</span>
              <img src={zapurzaaLogo} alt="Zapurzaa Systems" className="h-6" data-testid="img-zapurzaa-logo" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-3" data-testid="text-hero-title">
              Your Voice. Your Language. Perfectly Written. And Translated!
            </h1>
            <p className="text-base text-muted-foreground mb-6 leading-relaxed" data-testid="text-hero-subtitle">
              Dictation, transcription, formatting, and translation across Indian languages—built for serious writing.
            </p>
            <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
              <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">Hindi</span>
              <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">Marathi</span>
              <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">English</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Button
                onClick={() => setLocation("/register")}
                className="bg-[hsl(30,100%,50%)] border-[hsl(30,100%,42%)] text-white"
                data-testid="button-get-started"
              >
                Get Started Free (120 min audio | 14 days)
              </Button>
              <HowItWorks />
            </div>
          </div>

          <Card className="w-full max-w-sm p-6" data-testid="card-login">
            <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-login-title">Sign In</h2>
            <form onSubmit={handleLogin} className="space-y-3">
              {error && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md" data-testid="text-login-error">
                  {error}
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-sign-in">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setLocation("/register")}
                  className="text-xs text-[hsl(270,61%,40%)] hover:underline"
                  data-testid="link-create-account"
                >
                  Create Account
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      <section className="border-t bg-card" data-testid="section-why">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2" data-testid="text-why-title">
              Why IndoScribe Pro?
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto" data-testid="text-why-subtitle">
              India's most complete voice-to-document platform for Indic languages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyFeatures.map((feature, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 rounded-md"
                data-testid={`why-feature-${i}`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-md bg-[hsl(30,100%,50%)]/10 flex items-center justify-center" data-testid={`why-icon-${i}`}>
                  <feature.icon className="h-5 w-5 text-[hsl(30,100%,50%)]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-1" data-testid={`why-title-${i}`}>{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`why-desc-${i}`}>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
