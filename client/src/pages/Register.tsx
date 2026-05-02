import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import combinedLogo from "@/assets/images/ISP-Combined-Logo.png";
import HowItWorks from "@/components/HowItWorks";

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [workplace, setWorkplace] = useState("Organization/Freelance");
  const [professionalGroup, setProfessionalGroup] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!workplace.trim()) {
      setError("Workplace is required");
      return;
    }
    if (!consentAccepted) {
      setError("You must accept the privacy policy to continue");
      return;
    }

    setIsLoading(true);
    try {
      await register({ email, password, confirmPassword, fullName, mobile, workplace, professionalGroup: professionalGroup || undefined, consentAccepted });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-register">
      <nav className="h-14 border-b flex items-center px-6 gap-4 bg-card">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2" data-testid="link-home">
          <img src={combinedLogo} alt="IndoScribe Pro" className="h-8" />
        </button>
        <div className="flex-1" />
        <HowItWorks />
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <Card className="w-full max-w-md p-6" data-testid="card-register">
          <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-register-title">
            Create Account
          </h2>
          <form onSubmit={handleRegister} className="space-y-3">
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md" data-testid="text-register-error">
                {error}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                data-testid="input-fullname"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-email" className="text-xs">Email Address</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-reg-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile" className="text-xs">Mobile Number</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-muted rounded-md text-xs text-muted-foreground">
                  +91
                </div>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  data-testid="input-mobile"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workplace" className="text-xs">Workplace <span className="text-destructive">*</span></Label>
              <Input
                id="workplace"
                placeholder="Organization name or Freelance"
                value={workplace}
                onChange={(e) => setWorkplace(e.target.value)}
                required
                data-testid="input-workplace"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="professionalGroup" className="text-xs">Professional Group <span className="text-muted-foreground">(optional)</span></Label>
              <Select
                value={professionalGroup}
                onValueChange={(val) => setProfessionalGroup(val === "none" ? "" : val)}
              >
                <SelectTrigger data-testid="select-professional-group">
                  <SelectValue placeholder="Select a professional group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Pune Union of Working Journalists">Pune Union of Working Journalists</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-password" className="text-xs">Password</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-reg-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                data-testid="input-confirm-password"
              />
            </div>
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="consent"
                checked={consentAccepted}
                onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                data-testid="checkbox-consent"
              />
              <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the Privacy Policy and consent to data processing as per DPDP Act 2023.
                Your data is stored securely in India. Audio files are retained for 15 days after project completion.
              </label>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-create-account">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
            <div className="text-center pt-1">
              <span className="text-xs text-muted-foreground">Already have an account? </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                data-testid="link-sign-in"
              >
                Sign In
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
