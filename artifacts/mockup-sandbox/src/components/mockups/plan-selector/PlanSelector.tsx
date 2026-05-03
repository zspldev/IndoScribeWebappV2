import { useState } from "react";
import { Check, Star, Zap, Shield, Clock, ChevronRight, ArrowRight } from "lucide-react";

const PLANS = [
  {
    id: 1,
    planName: "Starter",
    description: "Perfect for individual journalists and freelancers getting started with transcription.",
    monthlyPrice: "0",
    annualPrice: "0",
    totalMinutes: 60,
    daysLimit: 30,
    features: ["live_recording", "rich_text_editor", "docx_watermark", "pdf_watermark"],
    badge: null,
    highlight: false,
  },
  {
    id: 2,
    planName: "Professional",
    description: "For working journalists and media professionals who need reliable, high-volume transcription.",
    monthlyPrice: "799",
    annualPrice: "7990",
    totalMinutes: 600,
    daysLimit: null,
    features: ["live_recording", "audio_upload", "rich_text_editor", "formatting_commands", "translation", "project_history", "docx_no_watermark", "pdf_no_watermark"],
    badge: "Most Popular",
    highlight: true,
  },
  {
    id: 3,
    planName: "Enterprise",
    description: "For newsrooms and organizations requiring team access, advanced features, and priority support.",
    monthlyPrice: "2499",
    annualPrice: "24990",
    totalMinutes: 3000,
    daysLimit: null,
    features: ["live_recording", "audio_upload", "rich_text_editor", "formatting_commands", "translation", "project_history", "docx_no_watermark", "pdf_no_watermark"],
    badge: null,
    highlight: false,
  },
];

const FEATURE_LABELS: Record<string, string> = {
  live_recording: "Live Recording",
  audio_upload: "Audio File Upload",
  rich_text_editor: "Rich Text Editor",
  formatting_commands: "Voice Formatting Commands",
  translation: "Translation",
  project_history: "Project History",
  docx_watermark: "DOCX Export (with watermark)",
  docx_no_watermark: "DOCX Export (no watermark)",
  pdf_watermark: "PDF Export (with watermark)",
  pdf_no_watermark: "PDF Export (no watermark)",
};

const ALL_FEATURES = [
  "live_recording",
  "audio_upload",
  "rich_text_editor",
  "formatting_commands",
  "translation",
  "project_history",
  "docx_no_watermark",
  "pdf_no_watermark",
];

export function PlanSelector() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [selected, setSelected] = useState<number | null>(2);

  const annualSavingsPct = 17;

  return (
    <div style={{ fontFamily: "'Open Sans', sans-serif" }} className="min-h-screen bg-[#f9f9fa]">
      {/* Top Nav */}
      <nav className="h-14 bg-white border-b border-[#e5e7ed] flex items-center px-8 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4b1fa8] flex items-center justify-center">
            <span className="text-white text-xs font-bold">IS</span>
          </div>
          <span className="font-semibold text-[#1a1d27] text-sm">IndoScribe</span>
        </div>
        <div className="flex-1" />
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#4b1fa8] flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-[#7a7f99] font-medium">Create Account</span>
          </div>
          <ChevronRight className="w-3 h-3 text-[#c5c8d8]" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#ff9a2e] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">2</span>
            </div>
            <span className="text-[#1a1d27] font-semibold">Choose Plan</span>
          </div>
        </div>
      </nav>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-[#f0eaff] text-[#4b1fa8] text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <Zap className="w-3 h-3" />
            Start transcribing today
          </div>
          <h1 className="text-2xl font-bold text-[#1a1d27] mb-2">Choose your plan</h1>
          <p className="text-sm text-[#7a7f99] max-w-md mx-auto">
            All plans include access to our Indian language transcription engine. Upgrade or cancel anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`text-sm font-medium ${billing === "monthly" ? "text-[#1a1d27]" : "text-[#7a7f99]"}`}>Monthly</span>
          <button
            onClick={() => setBilling(billing === "monthly" ? "annual" : "monthly")}
            className={`relative w-12 h-6 rounded-full transition-colors ${billing === "annual" ? "bg-[#4b1fa8]" : "bg-[#d1d5e0]"}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billing === "annual" ? "translate-x-7" : "translate-x-1"}`}
            />
          </button>
          <span className={`text-sm font-medium ${billing === "annual" ? "text-[#1a1d27]" : "text-[#7a7f99]"}`}>Annual</span>
          {billing === "annual" && (
            <span className="text-xs font-semibold bg-[#fff3e0] text-[#e67a00] px-2 py-0.5 rounded-full">
              Save {annualSavingsPct}%
            </span>
          )}
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {PLANS.map((plan) => {
            const price = billing === "annual" ? plan.annualPrice : plan.monthlyPrice;
            const isSelected = selected === plan.id;
            const isFree = plan.monthlyPrice === "0";

            return (
              <div
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={`relative rounded-xl border-2 cursor-pointer transition-all ${
                  plan.highlight
                    ? isSelected
                      ? "border-[#4b1fa8] bg-white shadow-lg shadow-purple-100"
                      : "border-[#4b1fa8] bg-white shadow-md shadow-purple-100"
                    : isSelected
                    ? "border-[#4b1fa8] bg-white shadow-md"
                    : "border-[#e5e7ed] bg-white hover:border-[#b09de0]"
                }`}
              >
                {/* Popular badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-[#ff9a2e] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                      <Star className="w-3 h-3 fill-white" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="p-5 pt-6">
                  {/* Plan name & description */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-[#1a1d27] text-base">{plan.planName}</h3>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#4b1fa8] flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7a7f99] leading-relaxed">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-4 pb-4 border-b border-[#f0f1f5]">
                    {isFree ? (
                      <div>
                        <span className="text-3xl font-bold text-[#1a1d27]">Free</span>
                        <div className="text-xs text-[#7a7f99] mt-0.5">
                          {plan.daysLimit}-day trial · {plan.totalMinutes} min included
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm text-[#7a7f99] font-medium">₹</span>
                          <span className="text-3xl font-bold text-[#1a1d27]">
                            {billing === "annual"
                              ? Math.round(parseInt(plan.annualPrice) / 12).toLocaleString()
                              : parseInt(plan.monthlyPrice).toLocaleString()}
                          </span>
                          <span className="text-xs text-[#7a7f99]">/mo</span>
                        </div>
                        {billing === "annual" && (
                          <div className="text-xs text-[#7a7f99] mt-0.5">
                            ₹{parseInt(plan.annualPrice).toLocaleString()} billed annually
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="w-3 h-3 text-[#4b1fa8]" />
                          <span className="text-xs text-[#4b1fa8] font-medium">{plan.totalMinutes} min/month</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    {ALL_FEATURES.map((feat) => {
                      const included = plan.features.includes(feat);
                      return (
                        <li key={feat} className={`flex items-start gap-2 text-xs ${included ? "text-[#2d3148]" : "text-[#c5c8d8]"}`}>
                          <span
                            className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                              included ? "bg-[#f0eaff]" : "bg-[#f5f5f8]"
                            }`}
                          >
                            {included ? (
                              <Check className="w-2.5 h-2.5 text-[#4b1fa8]" />
                            ) : (
                              <span className="w-1.5 h-0.5 bg-[#d0d3e0] rounded-full" />
                            )}
                          </span>
                          {FEATURE_LABELS[feat] || feat}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  <button
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isSelected
                        ? plan.highlight
                          ? "bg-[#4b1fa8] text-white"
                          : "bg-[#4b1fa8] text-white"
                        : plan.highlight
                        ? "bg-[#4b1fa8] text-white opacity-80"
                        : "bg-[#f0f1f5] text-[#4b1fa8]"
                    }`}
                  >
                    {isFree ? "Start Free Trial" : isSelected ? "Continue with this plan" : `Choose ${plan.planName}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-8 text-xs text-[#7a7f99] mb-8">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#4b1fa8]" />
            <span>Data stored securely in India</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-[#d0d3e0]" />
          <span>DPDP Act 2023 compliant</span>
          <div className="w-1 h-1 rounded-full bg-[#d0d3e0]" />
          <span>Cancel or upgrade anytime</span>
        </div>

        {/* Bottom action */}
        <div className="text-center">
          <button
            className="inline-flex items-center gap-2 bg-[#4b1fa8] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#3d188a] transition-colors shadow-md"
          >
            Continue to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="mt-3">
            <button className="text-xs text-[#7a7f99] hover:text-[#4b1fa8] underline-offset-2 hover:underline">
              Skip for now — I'll choose a plan later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
