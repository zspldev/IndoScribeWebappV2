import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";

const SESSION_KEY = "isp_session_active";

interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  mobile?: string;
  workplace: string;
  professionalGroup?: string;
  role: string;
  isActive: boolean;
  planId: number;
  planName: string;
  totalMinutes: number;
  totalMinutesTranscribed: string;
  minutesRemaining: number;
  totalProjectsCompleted: number;
  createdAt: string;
  trialEndsAt: string;
  isTrialExpired: boolean;
  planFeatures: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  mobile?: string;
  workplace: string;
  professionalGroup?: string;
  consentAccepted: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const pendingRoute = useRef<string | null>(null);
  const isInitialLoad = useRef(true);

  const fetchUser = useCallback(async () => {
    try {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        if (!sessionStorage.getItem(SESSION_KEY)) {
          await fetch("/api/auth/logout", { method: "POST" });
          setUser(null);
          setIsLoading(false);
          return;
        }
      }
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user && pendingRoute.current) {
      const route = pendingRoute.current;
      pendingRoute.current = null;
      setLocation(route);
    }
  }, [user, setLocation]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }
    const userData = await res.json().catch(() => null);
    sessionStorage.setItem(SESSION_KEY, "true");
    pendingRoute.current = userData?.role === "admin" ? "/admin" : "/dashboard";
    await fetchUser();
  };

  const register = async (data: RegisterData) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Registration failed");
    }
    sessionStorage.setItem(SESSION_KEY, "true");
    pendingRoute.current = "/select-plan";
    await fetchUser();
  };

  const logout = async () => {
    sessionStorage.removeItem(SESSION_KEY);
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refetchUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
