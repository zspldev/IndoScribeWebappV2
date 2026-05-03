import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AppLogo from "@/components/AppLogo";
import zsplLogo from "@assets/ZSPL-Logo-Symbol-Name-NoBG_1770545314669.png";
import {
  Mic, Globe, Radio, MessageSquareText, Languages, ShieldCheck,
  Play, Check, Clock, Zap, ArrowRight, Star, ChevronRight,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Mic, Globe, Radio, MessageSquareText, Languages, ShieldCheck,
};

interface LandingConfig {
  hero: { tagline: string; headline: string; subheadline: string; ctaPrimary: string; ctaSecondary: string };
  stats: { showLiveStats: boolean; items: { key: string; label: string; fallback: string }[] };
  howItWorks: { step: number; title: string; description: string }[];
  features: { icon: string; title: string; description: string }[];
  video: { url: string | null; title: string; description: string };
  testimonials: { quote: string; author: string; role: string; initials: string }[];
}

interface LiveStats { users: number; minutes: number; documents: number }

interface Plan {
  id: number; planName: string; monthlyPrice: string; annualPrice: string;
  totalMinutes: number; daysLimit: number | null; isActive: boolean;
  description: string | null; features: string[];
}

const FEATURE_LABELS: Record<string, string> = {
  live_recording: "Live Recording", audio_upload: "Audio File Upload",
  rich_text_editor: "Rich Text Editor", formatting_commands: "Voice Formatting Commands",
  translation: "Translation", project_history: "Project History",
  docx_no_watermark: "DOCX Export", pdf_no_watermark: "PDF Export",
  docx_watermark: "DOCX Export (watermarked)", pdf_watermark: "PDF Export (watermarked)",
};

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k+";
  return n > 0 ? `${n}+` : "—";
}

export default function LandingMarketing() {
  const [, setLocation] = useLocation();

  const { data: config } = useQuery<LandingConfig>({ queryKey: ["/api/landing-config"] });
  const { data: liveStats } = useQuery<LiveStats>({ queryKey: ["/api/landing-stats"] });
  const { data: allPlans } = useQuery<Plan[]>({ queryKey: ["/api/plans"] });

  const plans = (allPlans ?? [])
    .filter(p => p.isActive && p.planName !== "Enterprise")
    .sort((a, b) => parseFloat(a.monthlyPrice) - parseFloat(b.monthlyPrice));

  const getStatValue = (key: string, fallback: string): string => {
    if (!liveStats) return fallback;
    const n = key === "users" ? liveStats.users : key === "minutes" ? liveStats.minutes : liveStats.documents;
    return n > 0 ? formatNum(n) : fallback;
  };

  return (
    <div className="bg-white" data-testid="page-landing-marketing">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 flex items-center px-6 gap-4 py-2">
        <div className="flex flex-col items-center">
          <AppLogo className="text-xl" />
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-gray-400 leading-none">Created by</span>
            <img src={zsplLogo} alt="Zapurzaa Systems" className="h-5" />
          </div>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setLocation("/login")}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors mr-2"
          data-testid="link-sign-in-nav"
        >
          Sign In
        </button>
        <Button
          onClick={() => setLocation("/register")}
          size="sm"
          className="bg-[#FF9933] hover:bg-[#e8881f] text-white border-0"
          data-testid="button-nav-get-started"
        >
          Get Started Free
        </Button>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f0728 0%, #1a0a3e 50%, #0d1a4e 100%)" }}
        data-testid="section-hero"
      >
        {/* Background decorative Devanagari glyphs */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
          {["अ","इ","उ","ए","क","ख","ग","म","न","प","र","स"].map((ch, i) => (
            <span
              key={i}
              className="absolute text-white/[0.04] font-bold"
              style={{
                fontSize: `${80 + (i % 4) * 40}px`,
                top: `${(i * 17 + 5) % 90}%`,
                left: `${(i * 23 + 3) % 95}%`,
                transform: `rotate(${(i % 3 - 1) * 15}deg)`,
              }}
            >
              {ch}
            </span>
          ))}
        </div>

        <div className="relative max-w-3xl mx-auto flex flex-col items-center">
          {/* Tagline */}
          <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
            {(config?.hero.tagline ?? "Hindi • Marathi • English • and more").split(" • ").map((lang, i) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full border border-white/20 text-white/60 bg-white/5">
                {lang}
              </span>
            ))}
          </div>

          {/* Logo */}
          <AppLogo className="text-6xl md:text-7xl lg:text-8xl mb-6" data-testid="img-hero-logo" />

          {/* Headline */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mb-4" data-testid="text-hero-title">
            {config?.hero.headline ?? "Your Voice. Your Language. Perfectly Written."}
          </h1>

          {/* Subheadline */}
          <p className="text-base md:text-lg text-white/60 max-w-xl leading-relaxed mb-10" data-testid="text-hero-subtitle">
            {config?.hero.subheadline ?? "Professional audio transcription, formatting, and translation for Indian languages."}
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Button
              onClick={() => setLocation("/register")}
              size="lg"
              className="bg-[#FF9933] hover:bg-[#e8881f] text-white border-0 text-base px-8"
              data-testid="button-hero-get-started"
            >
              {config?.hero.ctaPrimary ?? "Start Free — 30 Minutes Included"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              onClick={() => setLocation("/login")}
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
              data-testid="button-hero-sign-in"
            >
              Already a user? Sign In
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex items-center gap-6 text-white/30 text-xs flex-wrap justify-center">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#FF9933]" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#FF9933]" /> 30 minutes free audio</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#FF9933]" /> Data stored in India</span>
          </div>

        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────── */}
      <section className="bg-[#1a0a3e] border-y border-white/10 py-10 px-6" data-testid="section-stats">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
          {(config?.stats.items ?? [
            { key: "users", label: "Professionals", fallback: "500+" },
            { key: "minutes", label: "Minutes Transcribed", fallback: "12,000+" },
            { key: "documents", label: "Documents Created", fallback: "2,400+" },
          ]).map((item, i) => (
            <div key={i} data-testid={`stat-${item.key}`}>
              <div className="text-3xl md:text-4xl font-bold text-[#FF9933] mb-1">
                {getStatValue(item.key, item.fallback)}
              </div>
              <div className="text-xs text-white/50 tracking-wide uppercase">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section className="bg-white py-20 px-6" data-testid="section-how-it-works">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-[#FF9933] uppercase tracking-widest">Simple workflow</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">How IndoScribe works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#FF9933]/30 via-[#6B21A8]/30 to-[#FF9933]/30" />

            {(config?.howItWorks ?? []).map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center" data-testid={`step-${step.step}`}>
                <div
                  className="relative w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 z-10"
                  style={{ background: i % 2 === 0 ? "#FF9933" : "#6B21A8" }}
                >
                  {step.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20 px-6" data-testid="section-features">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-[#FF9933] uppercase tracking-widest">Capabilities</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">Everything you need</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
              India's most complete voice-to-document platform for Indic languages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(config?.features ?? []).map((feature, i) => {
              const Icon = ICON_MAP[feature.icon] ?? Mic;
              return (
                <div
                  key={i}
                  className="bg-white rounded-xl p-6 border border-gray-100 hover:border-[#FF9933]/30 hover:shadow-md transition-all"
                  data-testid={`feature-card-${i}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FF9933]/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-[#FF9933]" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-2">{feature.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── VIDEO ───────────────────────────────────────────────────── */}
      <section className="bg-white py-20 px-6" data-testid="section-video">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-semibold text-[#FF9933] uppercase tracking-widest">See it in action</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 mb-3">
            {config?.video.title ?? "See IndoScribe in Action"}
          </h2>
          <p className="text-gray-500 text-sm mb-10 max-w-md mx-auto">
            {config?.video.description ?? "Watch how professionals transcribe, edit, and export Indic language audio in minutes."}
          </p>

          {config?.video.url ? (
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video">
              <iframe
                src={config.video.url}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="IndoScribe Demo"
              />
            </div>
          ) : (
            <div
              className="relative rounded-2xl overflow-hidden shadow-xl aspect-video flex flex-col items-center justify-center cursor-pointer group"
              style={{ background: "linear-gradient(135deg, #0f0728 0%, #1a0a3e 100%)" }}
              data-testid="video-placeholder"
            >
              <div className="w-20 h-20 rounded-full bg-[#FF9933] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-[#FF9933]/30">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
              <p className="text-white font-semibold">Demo video coming soon</p>
              <p className="text-white/40 text-sm mt-1">We're recording it — check back shortly</p>
              {/* Devanagari decoration */}
              <span className="absolute top-4 left-6 text-white/5 text-7xl font-bold select-none">इंडो</span>
              <span className="absolute bottom-4 right-6 text-white/5 text-7xl font-bold select-none">स्क्राइब</span>
            </div>
          )}
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "#faf7ff" }} data-testid="section-testimonials">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-[#FF9933] uppercase tracking-widest">Early adopters</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">What our users say</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(config?.testimonials ?? []).map((t, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 border border-purple-100 shadow-sm"
                data-testid={`testimonial-${i}`}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-[#FF9933] text-[#FF9933]" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: i % 2 === 0 ? "#FF9933" : "#6B21A8" }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.author}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────── */}
      <section className="bg-white py-20 px-6" data-testid="section-pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-[#FF9933] uppercase tracking-widest">Pricing</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">Simple, transparent plans</h2>
            <p className="text-gray-500 text-sm mt-2">Start free — no credit card needed</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => {
              const isFree = parseFloat(plan.monthlyPrice) === 0;
              const isPopular = i === 1;
              const displayFeatures = plan.features.filter(
                f => !["docx_watermark", "pdf_watermark", "docx_export"].includes(f)
              );
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl p-6 border-2 flex flex-col transition-all ${
                    isPopular
                      ? "border-[#6B21A8] shadow-lg shadow-purple-100"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                  data-testid={`pricing-card-${plan.id}`}
                >
                  {isPopular && (
                    <div className="mb-3">
                      <Badge className="bg-[#6B21A8] text-white text-xs">Most Popular</Badge>
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{plan.planName}</h3>
                  <div className="mt-3 mb-5">
                    {isFree ? (
                      <span className="text-3xl font-bold text-gray-900">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-900">
                          ₹{parseFloat(plan.monthlyPrice).toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm text-gray-400">/mo</span>
                      </>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {plan.totalMinutes} min audio
                      {plan.daysLimit ? ` · ${plan.daysLimit}-day trial` : ""}
                    </p>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {displayFeatures.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="h-3.5 w-3.5 text-[#FF9933] flex-shrink-0" />
                        {FEATURE_LABELS[f] ?? f.replace(/_/g, " ")}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => setLocation("/register")}
                    className={`w-full ${
                      isPopular
                        ? "bg-[#6B21A8] hover:bg-[#5b1a96] text-white border-0"
                        : "bg-[#FF9933] hover:bg-[#e8881f] text-white border-0"
                    }`}
                    data-testid={`button-plan-${plan.id}`}
                  >
                    {isFree ? "Get Started Free" : `Choose ${plan.planName}`}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ──────────────────────────────────────────────── */}
      <section
        className="py-20 px-6 text-center"
        style={{ background: "linear-gradient(135deg, #0f0728 0%, #1a0a3e 100%)" }}
        data-testid="section-cta"
      >
        <div className="max-w-2xl mx-auto">
          <AppLogo className="text-4xl md:text-5xl mb-6 inline-block" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to start transcribing?
          </h2>
          <p className="text-white/60 text-base mb-8">
            Join professionals across India who trust IndoScribe for accurate, fast Indic language transcription.
          </p>
          <Button
            onClick={() => setLocation("/register")}
            size="lg"
            className="bg-[#FF9933] hover:bg-[#e8881f] text-white border-0 text-base px-10"
            data-testid="button-cta-final"
          >
            Start Free — 30 Minutes Included
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-white/30 text-xs mt-4">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-200 py-6 px-6" data-testid="footer-marketing">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <AppLogo className="text-lg" />
          <p className="text-gray-400 text-xs">© 2026 Zapurzaa Systems. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <img src={zsplLogo} alt="Zapurzaa Systems" className="h-5" />
          </div>
        </div>
      </footer>
    </div>
  );
}
