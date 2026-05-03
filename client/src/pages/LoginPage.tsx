import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import AppLogo from "@/components/AppLogo";

export default function LoginPage() {
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
    <div className="min-h-screen bg-[#0f0728] flex flex-col" data-testid="page-login">
      <nav className="h-14 flex items-center px-6 gap-4">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          data-testid="link-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </button>
        <div className="flex-1" />
        <AppLogo className="text-xl" />
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-white/60 text-sm">Sign in to your IndoScribe account</p>
          </div>

          <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-sm" data-testid="card-login">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-md" data-testid="text-login-error">
                  {error}
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-white/70">Email</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#FF9933]"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-white/70">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#FF9933]"
                  data-testid="input-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#FF9933] hover:bg-[#e8881f] text-white border-0"
                disabled={isLoading}
                data-testid="button-sign-in"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setLocation("/register")}
                  className="text-xs text-white/50 hover:text-[#FF9933] transition-colors"
                  data-testid="link-create-account"
                >
                  Don't have an account? <span className="underline">Create one free</span>
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
