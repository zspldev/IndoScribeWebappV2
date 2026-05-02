import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { registerSchema, loginSchema } from "@shared/schema";
import { pool } from "./db";

export function setupSession(app: Express) {
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "indoscribe-pro-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any)?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  storage.getUserById(userId).then(user => {
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  }).catch(() => {
    res.status(500).json({ error: "Internal server error" });
  });
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { email, password, fullName, mobile, workplace, professionalGroup, consentAccepted } = parsed.data;

      const existing = await storage.getUserByEmail(email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      if (professionalGroup) {
        const groupLimits: Record<string, number> = {
          "Pune Union of Working Journalists": 50,
        };
        const limit = groupLimits[professionalGroup];
        if (limit !== undefined) {
          const count = await storage.countUsersByProfessionalGroup(professionalGroup);
          if (count >= limit) {
            return res.status(400).json({ error: `The "${professionalGroup}" group has reached its maximum capacity of ${limit} members. Please contact support for assistance.` });
          }
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await storage.createUser({
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        mobile,
        workplace: workplace || "Organization/Freelance",
        professionalGroup,
        consentAccepted,
        consentDate: new Date(),
        planId: 1,
      });

      (req.session as any).userId = user.id;

      const plan = await storage.getPlanById(user.planId || 1);

      const daysLimit = plan?.daysLimit ?? null;
      const trialEndsAt = daysLimit
        ? (user.trialEndsAt || new Date(user.createdAt.getTime() + daysLimit * 24 * 60 * 60 * 1000))
        : null;
      const isTrialExpired = user.role === 'admin' || !trialEndsAt ? false : new Date() > trialEndsAt;

      res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        workplace: user.workplace,
        professionalGroup: user.professionalGroup,
        planId: user.planId,
        planName: plan?.planName || "Unknown",
        totalMinutes: plan?.totalMinutes || 0,
        totalMinutesTranscribed: user.totalMinutesTranscribed,
        trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
        isTrialExpired,
        planFeatures: (plan?.features as string[]) ?? [],
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed. Please try again." });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Your account has been deactivated. Please contact support." });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      (req.session as any).userId = user.id;

      const plan = await storage.getPlanById(user.planId || 1);

      const daysLimit = plan?.daysLimit ?? null;
      const trialEndsAt = daysLimit
        ? (user.trialEndsAt || new Date(user.createdAt.getTime() + daysLimit * 24 * 60 * 60 * 1000))
        : null;
      const isTrialExpired = user.role === 'admin' || !trialEndsAt ? false : new Date() > trialEndsAt;

      res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        workplace: user.workplace,
        professionalGroup: user.professionalGroup,
        planId: user.planId,
        planName: plan?.planName || "Unknown",
        totalMinutes: plan?.totalMinutes || 0,
        totalMinutesTranscribed: user.totalMinutesTranscribed,
        totalProjectsCompleted: user.totalProjectsCompleted,
        trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
        isTrialExpired,
        planFeatures: (plan?.features as string[]) ?? [],
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed. Please try again." });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const plan = await storage.getPlanById(user.planId || 1);
    const minutesUsed = parseFloat(user.totalMinutesTranscribed || "0");
    const totalMinutes = plan?.totalMinutes || 0;
    const minutesRemaining = Math.max(0, totalMinutes - minutesUsed);

    const daysLimit = plan?.daysLimit ?? null;
    const trialEndsAt = daysLimit
      ? (user.trialEndsAt || new Date(user.createdAt.getTime() + daysLimit * 24 * 60 * 60 * 1000))
      : null;
    const isTrialExpired = user.role === 'admin' || !trialEndsAt ? false : new Date() > trialEndsAt;

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      mobile: user.mobile,
      workplace: user.workplace,
      professionalGroup: user.professionalGroup,
      role: user.role,
      isActive: user.isActive,
      planId: user.planId,
      planName: plan?.planName || "Starter",
      totalMinutes,
      totalMinutesTranscribed: user.totalMinutesTranscribed,
      minutesRemaining,
      totalProjectsCompleted: user.totalProjectsCompleted,
      createdAt: user.createdAt,
      trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
      isTrialExpired,
      planFeatures: (plan?.features as string[]) ?? [],
    });
  });
}
