import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronRight,
  Clock,
  Shield,
  Zap,
  ArrowRight,
  Star,
  Loader2,
} from "lucide-react";
import combinedLogo from "@/assets/images/ISP-Combined-Logo.png";
import HowItWorks from "@/components/HowItWorks";

interface Plan {
  id: number;
  planName: string;
  monthlyPrice: string;
  annualPrice: string;
  totalMinutes: number;
  daysLimit: number | null;
  isActive: boolean;
  description: string | null;
  features: string[];
}

const FEATURE_LABELS: Record<string, string> = {
  live_recording:      "Live Recording",
  audio_upload:        "Audio File Upload",
  rich_text_editor:    "Rich Text Editor",
  formatting_commands: "Voice Formatting Commands",
  translation:         "Translation",
  project_history:     "Project History",
  docx_no_watermark:   "DOCX Export (no watermark)",
  pdf_no_watermark:    "PDF Export (no watermark)",
};

const PLAN_HIGHLIGHT: Record<string, boolean> = { Pro: true };
const PLAN_BADGE: Record<string, string> = { Pro: "Most Popular" };

function formatPrice(plan: Plan, billing: "monthly" | "annual"): string {
  if (parseFloat(plan.monthlyPrice) === 0) return "Free";
  if (billing === "annual") {
    return `₹${Math.round(parseFloat(plan.annualPrice) / 12).toLocaleString("en-IN")}`;
  }
  return `₹${parseFloat(plan.monthlyPrice).toLocaleString("en-IN")}`;
}

function annualSavingsLabel(plan: Plan): string | null {
  const monthly = parseFloat(plan.monthlyPrice);
  const annual = parseFloat(plan.annualPrice);
  if (monthly === 0 || annual === 0) return null;
  const savings = Math.round(((monthly * 12 - annual) / (monthly * 12)) * 100);
  return savings > 0 ? `Save ${savings}%` : null;
}

function featureLabel(key: string): string {
  return FEATURE_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function SelectPlan() {
  const { user, refetchUser } = useAuth();
  const [location, setLocation] = useLocation();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const isUpgradeMode = location === "/upgrade";

  const { data: allPlans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const plans = (allPlans ?? [])
    .filter(p => p.isActive && p.planName !== "Enterprise")
    .sort((a, b) => parseFloat(a.monthlyPrice) - parseFloat(b.monthlyPrice));

  const currentPlan = plans.find(p => p.id === user?.planId);
  const starterPlan = plans.find(p => parseFloat(p.monthlyPrice) === 0);

  const mutation = useMutation({
    mutationFn: async (planId: number) => {
      await apiRequest("PATCH", "/api/users/me/plan", { planId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      refetchUser().finally(() => setLocation("/dashboard"));
    },
  });

  const handleContinue = () => {
    const planToAssign = selectedPlanId ?? starterPlan?.id ?? null;
    if (planToAssign !== null) {
      mutation.mutate(planToAssign);
    } else {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-select-plan">
      {/* Nav */}
      <nav className="h-14 border-b flex items-center px-6 gap-4 bg-card">
        <button
          onClick={() => setLocation(isUpgradeMode ? "/dashboard" : "/")}
          className="flex items-center gap-2"
          data-testid="link-logo"
        >
          <img src={combinedLogo} alt="IndoScribe Pro" className="h-8" />
        </button>
        <div className="flex-1" />

        {!isUpgradeMode && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-primary" />
              </span>
              <span>Create Account</span>
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="w-5 h-5 rounded-full bg-sidebar-primary flex items-center justify-center">
                <span className="text-sidebar-primary-foreground text-[10px] font-bold">2</span>
              </span>
              <span>Choose Plan</span>
            </div>
          </div>
        )}

        {isUpgradeMode && <HowItWorks />}
      </nav>

      {/* Main content */}
      <div className="flex-1 px-4 py-8 sm:px-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-3">
              <Zap className="w-3 h-3" />
              {isUpgradeMode ? "Upgrade your plan" : "Start transcribing today"}
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isUpgradeMode ? "Choose your new plan" : "Choose your plan"}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              All plans include access to our Indian language transcription engine.
              {isUpgradeMode ? " Your data and projects are preserved." : " Upgrade or cancel anytime."}
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex flex-col items-center gap-2 mb-8" data-testid="billing-toggle">
            <div className="inline-flex items-center rounded-lg border border-border bg-muted p-1 gap-1">
              <button
                onClick={() => setBilling("monthly")}
                data-testid="toggle-billing-monthly"
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  billing === "monthly"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("annual")}
                data-testid="toggle-billing-annual"
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  billing === "annual"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
                <span className="text-[10px] font-bold bg-sidebar-primary/15 text-sidebar-primary px-1.5 py-0.5 rounded-full leading-none">
                  −17%
                </span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isCurrent = isUpgradeMode && currentPlan?.id === plan.id;
                const highlight = !!PLAN_HIGHLIGHT[plan.planName];
                const badge = PLAN_BADGE[plan.planName];
                const isFree = parseFloat(plan.monthlyPrice) === 0;
                const savings = annualSavingsLabel(plan);
                const planFeatures: string[] = Array.isArray(plan.features) ? plan.features : [];

                return (
                  <div
                    key={plan.id}
                    data-testid={`card-plan-${plan.id}`}
                    onClick={() => !isCurrent && setSelectedPlanId(plan.id)}
                    className={`relative rounded-xl border-2 transition-all flex flex-col ${
                      isCurrent
                        ? "border-border bg-card cursor-default opacity-70"
                        : isSelected
                        ? "border-primary bg-card shadow-lg cursor-pointer"
                        : highlight
                        ? "border-primary/60 bg-card shadow-md cursor-pointer hover:border-primary"
                        : "border-border bg-card cursor-pointer hover:border-primary/50"
                    }`}
                  >
                    {/* Top badge row — Most Popular / Current Plan / Selected checkmark */}
                    <div className="absolute -top-3.5 left-0 right-0 flex justify-center z-10">
                      {isCurrent ? (
                        <span className="inline-flex items-center bg-muted text-muted-foreground text-[11px] font-semibold px-3 py-1 rounded-full border border-border">
                          Current Plan
                        </span>
                      ) : isSelected ? (
                        <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                          <Check className="w-3 h-3" />
                          Selected
                        </span>
                      ) : badge ? (
                        <span className="inline-flex items-center gap-1 bg-sidebar-primary text-sidebar-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                          <Star className="w-3 h-3 fill-current" />
                          {badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="p-5 pt-7 flex-1">
                      {/* Plan name */}
                      <h3 className="font-bold text-foreground text-base mb-1" data-testid={`text-plan-name-${plan.id}`}>
                        {plan.planName}
                      </h3>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                        {plan.description || `The ${plan.planName} plan for IndoScribe Pro.`}
                      </p>

                      {/* Price */}
                      <div className="mb-4 pb-4 border-b border-border">
                        <div className="flex items-baseline gap-1">
                          {!isFree && (
                            <span className="text-sm text-muted-foreground font-medium">₹</span>
                          )}
                          <span className="text-3xl font-bold text-foreground" data-testid={`text-price-${plan.id}`}>
                            {isFree ? "Free" : formatPrice(plan, billing).replace("₹", "")}
                          </span>
                          {!isFree && (
                            <span className="text-xs text-muted-foreground">/mo</span>
                          )}
                        </div>
                        {billing === "annual" && !isFree && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            ₹{parseFloat(plan.annualPrice).toLocaleString("en-IN")} billed annually
                            {savings && (
                              <span className="ml-1 text-sidebar-primary font-medium">· {savings}</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="w-3 h-3 text-primary" />
                          <span className="text-xs text-primary font-medium">
                            {plan.totalMinutes.toLocaleString("en-IN")} min
                            {plan.daysLimit ? ` · ${plan.daysLimit}-day trial` : "/month"}
                          </span>
                        </div>
                      </div>

                      {/* Features — from plan data */}
                      {planFeatures.length > 0 ? (
                        <ul className="space-y-2">
                          {planFeatures.map((feat) => (
                            <li key={feat} className="flex items-start gap-2 text-xs text-foreground">
                              <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Check className="w-2.5 h-2.5 text-primary" />
                              </span>
                              {featureLabel(feat)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No features listed.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground mb-8">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Data stored securely in India</span>
            </div>
            <span className="hidden sm:inline w-1 h-1 rounded-full bg-border" />
            <span>DPDP Act 2023 compliant</span>
            <span className="hidden sm:inline w-1 h-1 rounded-full bg-border" />
            <span>Cancel or upgrade anytime</span>
          </div>

          {/* Bottom actions */}
          <div className="text-center space-y-3">
            {mutation.isError && (
              <p className="text-xs text-destructive" data-testid="text-plan-error">
                Failed to save plan selection. Please try again.
              </p>
            )}
            <Button
              onClick={handleContinue}
              disabled={mutation.isPending}
              className="px-8"
              data-testid="button-continue"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {selectedPlanId ? "Go to Dashboard" : "Start with Free Plan"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            {selectedPlanId && selectedPlanId !== starterPlan?.id && (
              <div>
                <button
                  onClick={() => starterPlan ? mutation.mutate(starterPlan.id) : setLocation("/dashboard")}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                  data-testid="link-skip-plan"
                >
                  Skip — start with the free Starter plan
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
