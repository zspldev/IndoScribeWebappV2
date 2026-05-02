import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, FileText, Clock, FolderOpen, LogOut, Loader2, AlertTriangle, Mail, CalendarClock } from "lucide-react";
import { useLanguages } from "@/lib/useLanguages";
import combinedLogo from "@/assets/images/ISP-Combined-Logo.png";
import HowItWorks from "@/components/HowItWorks";

interface Project {
  id: number;
  title: string;
  languageCode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const { user, logout, refetchUser } = useAuth();
  const canViewHistory = user?.role === "admin" || (user?.planFeatures ?? []).includes("project_history");
  const { getLanguageName } = useLanguages();
  const [, setLocation] = useLocation();
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showTrialExpiredDialog, setShowTrialExpiredDialog] = useState(false);

  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    refetchOnMount: "always",
  });

  const minutesUsed = parseFloat(user?.totalMinutesTranscribed || "0");
  const totalMinutes = user?.totalMinutes || 0;
  const minutesRemaining = Math.max(0, totalMinutes - minutesUsed);
  const hasMinutesLeft = minutesRemaining > 0;

  const trialEndDate = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const isTrialExpired = user?.isTrialExpired || false;
  const formatTrialDate = (date: Date) => date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="text-xs" data-testid={`badge-status-${status}`}>Completed</Badge>;
      case "transcribing":
        return <Badge className="text-xs bg-[hsl(30,100%,50%)] text-white" data-testid={`badge-status-${status}`}>Transcribing</Badge>;
      case "editing":
        return <Badge variant="outline" className="text-xs" data-testid={`badge-status-${status}`}>Editing</Badge>;
      case "translated":
        return <Badge className="text-xs bg-[hsl(270,50%,40%)] text-white" data-testid={`badge-status-${status}`}>Translated</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-dashboard">
      <nav className="h-14 border-b flex items-center px-6 gap-4 bg-card">
        <img src={combinedLogo} alt="IndoScribe Pro" className="h-8" />
        <div className="flex items-center gap-2" data-testid="text-user-name">
          <span className="text-sm text-muted-foreground">
            {user.fullName}
          </span>
          <span className="text-xs text-muted-foreground">|</span>
          {user.role !== "admin" ? (
            <button
              onClick={() => setLocation("/upgrade")}
              className={`text-xs underline underline-offset-2 decoration-dotted hover:decoration-solid transition-all ${isTrialExpired ? "text-destructive font-medium" : "text-muted-foreground hover:text-foreground"}`}
              data-testid="text-trial-info"
              title="Click to change plan"
            >
              {user.planName} plan{trialEndDate && !isTrialExpired ? `; Ends on ${formatTrialDate(trialEndDate)}` : ""}
              {isTrialExpired ? "; Trial Expired" : ""}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground" data-testid="text-trial-info">
              {user.planName} plan
            </span>
          )}
        </div>
        <div className="flex-1" />
        <HowItWorks />
        {user.role === "admin" && (
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")} data-testid="button-admin">
            Admin
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={logout} data-testid="button-logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </nav>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground" data-testid="text-dashboard-title">
              My Projects
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-plan-status">
              {user.planName} Plan &middot; {minutesRemaining.toFixed(1)} of {totalMinutes} minutes remaining
              {user.role !== "admin" && (
                <button
                  onClick={() => setLocation("/upgrade")}
                  className="ml-2 text-primary underline underline-offset-2 hover:no-underline transition-all"
                  data-testid="link-change-plan"
                >
                  Change plan
                </button>
              )}
            </p>
          </div>
          <Button
            onClick={() => {
              if (isTrialExpired) {
                setShowTrialExpiredDialog(true);
              } else {
                setLocation("/projects/new");
              }
            }}
            className="bg-[hsl(30,100%,50%)] border-[hsl(30,100%,42%)] text-white"
            data-testid="button-new-project"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card className="p-4" data-testid="card-stat-projects">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Projects</p>
                <p className="text-lg font-semibold">{projects?.length ?? 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4" data-testid="card-stat-minutes">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Minutes Used</p>
                <p className="text-lg font-semibold">{minutesUsed.toFixed(1)} / {totalMinutes}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4" data-testid="card-stat-remaining">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Minutes Remaining</p>
                <p className={`text-lg font-semibold ${!hasMinutesLeft ? "text-destructive" : ""}`}>{minutesRemaining.toFixed(1)}</p>
              </div>
            </div>
          </Card>
        </div>

        {!canViewHistory ? (
          <Card className="p-12 text-center" data-testid="card-no-history-feature">
            <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">Project History Not Available</p>
            <p className="text-xs text-muted-foreground">Your current plan does not include project history. Please upgrade to view and manage past projects.</p>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12" data-testid="loading-projects">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="space-y-2" data-testid="list-projects">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="p-4 hover-elevate cursor-pointer"
                onClick={() => setLocation(`/projects/${project.id}`)}
                data-testid={`card-project-${project.id}`}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-project-name-${project.id}`}>
                        {project.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getLanguageName(project.languageCode)} &middot; {formatDate(project.createdAt)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center" data-testid="empty-projects">
            <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No projects yet</p>
            <Button
              onClick={() => setLocation("/projects/new")}
              variant="outline"
              data-testid="button-first-project"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create your first project
            </Button>
          </Card>
        )}
      </div>

      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-limit-reached">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-md bg-[hsl(30,100%,95%)]">
                <AlertTriangle className="h-5 w-5 text-[hsl(30,100%,50%)]" />
              </div>
              <DialogTitle>Minutes Limit Reached</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed pt-2" data-testid="text-limit-message">
              You have used all your transcription minutes. You can still access and work on your existing projects anytime from this dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border p-4 bg-muted/50 space-y-3">
            <p className="text-sm font-medium" data-testid="text-upgrade-message">
              Need more transcription minutes?
            </p>
            <p className="text-sm text-muted-foreground">
              Contact us to upgrade your plan for more minutes and priority support.
            </p>
            <a
              href="mailto:operations@zapurzaasystems.com?subject=IndoScribe%20Pro%20-%20Plan%20Upgrade%20Request"
              className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(270,61%,40%)] underline"
              data-testid="link-contact-email"
            >
              <Mail className="h-4 w-4" />
              operations@zapurzaasystems.com
            </a>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLimitDialog(false)}
              data-testid="button-close-limit-dialog"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTrialExpiredDialog} onOpenChange={setShowTrialExpiredDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-trial-expired">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-md bg-destructive/10">
                <CalendarClock className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle>Trial Period Expired</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed pt-2" data-testid="text-trial-expired-message">
              Your 14-day trial ended on {trialEndDate ? formatTrialDate(trialEndDate) : ""}. Transcription and translation services are no longer available.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border p-4 bg-muted/50 space-y-3">
            <p className="text-sm font-medium">What you can still do:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Open and view all your existing projects</li>
              <li>Edit transcribed and translated text</li>
              <li>Export documents to DOCX</li>
            </ul>
          </div>

          <div className="rounded-md border p-4 bg-muted/50 space-y-3">
            <p className="text-sm font-medium" data-testid="text-trial-upgrade-message">
              Want to continue transcribing and translating?
            </p>
            <p className="text-sm text-muted-foreground">
              Contact us to upgrade your plan and unlock unlimited access.
            </p>
            <a
              href="mailto:operations@zapurzaasystems.com?subject=IndoScribe%20Pro%20-%20Trial%20Expired%20-%20Plan%20Upgrade%20Request"
              className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(270,61%,40%)] underline"
              data-testid="link-trial-contact-email"
            >
              <Mail className="h-4 w-4" />
              operations@zapurzaasystems.com
            </a>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTrialExpiredDialog(false)}
              data-testid="button-close-trial-dialog"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
