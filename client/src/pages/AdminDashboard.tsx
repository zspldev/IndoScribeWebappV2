import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  BarChart3,
  Settings,
  FileText,
  LogOut,
  Clock,
  Loader2,
  ChevronRight,
  Mic,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  Globe,
  CheckSquare,
  Bell,
  Megaphone,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguages } from "@/lib/useLanguages";
import AppLogo from "@/components/AppLogo";
import HowItWorks from "@/components/HowItWorks";

interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  mobile: string | null;
  workplace: string;
  professionalGroup: string | null;
  role: string;
  isActive: boolean;
  planId: number;
  planName: string;
  totalMinutes: number;
  totalProjectsCompleted: number;
  totalMinutesTranscribed: string;
  minutesRemaining: number;
  totalCostInr: number;
  createdAt: string;
}

interface Plan {
  id: number;
  planName: string;
  monthlyPrice: string;
  annualPrice: string;
  totalMinutes: number;
  daysLimit: number | null;
  isActive: boolean;
  description: string | null;
  languageGroupId: number | null;
  features: string[];
}

interface LanguageGroup {
  id: number;
  name: string;
  description: string | null;
  languages: { id: number; name: string; code: string; script: string; isActive: boolean }[];
}

interface Stats {
  totalUsers: number;
  activeProjects: number;
  totalMinutesTranscribed: number;
  totalCostInr: number;
}

interface Announcement {
  id: number;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  targetType: string;
  targetId: number | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

type Tab = "overview" | "users" | "plans" | "language-groups" | "announcements" | "commands" | "providers" | "settings";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { getLanguageName } = useLanguages();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-admin">
      <nav className="h-14 border-b flex items-center px-6 gap-4 bg-card">
        <AppLogo className="text-xl" />
        <span className="text-sm text-muted-foreground" data-testid="text-admin-user-name">
          {user.fullName}
        </span>
        <Badge variant="secondary" className="text-xs">Admin</Badge>
        <div className="flex-1" />
        <HowItWorks />
        <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-user-dashboard">
          My Projects
        </Button>
        <Button variant="ghost" size="icon" onClick={logout} data-testid="button-admin-logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </nav>

      <div className="flex-1 flex">
        <div className="w-48 border-r bg-card p-3 space-y-1 flex-shrink-0" data-testid="admin-sidebar">
          {([
            { id: "overview" as Tab, label: "Overview", icon: BarChart3 },
            { id: "users" as Tab, label: "Users", icon: Users },
            { id: "plans" as Tab, label: "Plans", icon: CreditCard },
            { id: "language-groups" as Tab, label: "Lang Groups", icon: Globe },
            { id: "announcements" as Tab, label: "Announce", icon: Bell },
            { id: "commands" as Tab, label: "Commands", icon: FileText },
            { id: "providers" as Tab, label: "Providers", icon: Mic },
            { id: "settings" as Tab, label: "Settings", icon: Settings },
          ]).map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              className={`w-full justify-start toggle-elevate ${activeTab === tab.id ? "toggle-elevated" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "plans" && <PlansTab />}
          {activeTab === "language-groups" && <LanguageGroupsTab />}
          {activeTab === "announcements" && <AnnouncementsTab />}
          {activeTab === "commands" && <CommandsTab />}
          {activeTab === "providers" && <ProvidersTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <div data-testid="admin-overview">
      <h2 className="text-lg font-semibold mb-4">System Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4" data-testid="stat-users">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted"><Users className="h-4 w-4 text-muted-foreground" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Users</p>
              <p className="text-xl font-semibold">{stats?.totalUsers || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" data-testid="stat-projects">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted"><FileText className="h-4 w-4 text-muted-foreground" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Projects</p>
              <p className="text-xl font-semibold">{stats?.activeProjects || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" data-testid="stat-minutes">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted"><Clock className="h-4 w-4 text-muted-foreground" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Minutes Transcribed</p>
              <p className="text-xl font-semibold">{(stats?.totalMinutesTranscribed || 0).toFixed(1)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" data-testid="stat-cost">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted"><BarChart3 className="h-4 w-4 text-muted-foreground" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cost (INR)</p>
              <p className="text-xl font-semibold">{stats?.totalCostInr?.toFixed(2) || "0.00"}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function UsersTab() {
  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: allPlans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <div data-testid="admin-users">
      <h2 className="text-lg font-semibold mb-4">User Management</h2>
      <div className="space-y-2">
        {users?.map((u) => (
          <Card key={u.id} className="p-4" data-testid={`card-user-${u.id}`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{u.fullName}</p>
                  <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                  <Badge variant="outline" className="text-xs">{u.planName}</Badge>
                  {!u.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {u.workplace}{u.professionalGroup ? ` | ${u.professionalGroup}` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-user-stats-${u.id}`}>
                  Projects: {u.totalProjectsCompleted} | Minutes: {parseFloat(u.totalMinutesTranscribed || "0").toFixed(1)} / {u.totalMinutes} | Remaining: {u.minutesRemaining.toFixed(1)}
                </p>
                <p className="text-xs mt-1" data-testid={`text-user-cost-${u.id}`}>
                  <span className="text-muted-foreground">API Cost: </span>
                  <span className={u.totalCostInr > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                    ₹{(u.totalCostInr || 0).toFixed(4)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Active</span>
                  <Switch
                    checked={u.isActive}
                    onCheckedChange={(checked) => updateUserMutation.mutate({ id: u.id, updates: { isActive: checked } })}
                    data-testid={`switch-active-${u.id}`}
                  />
                </div>
                {allPlans && allPlans.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Plan</span>
                    <Select
                      value={String(u.planId)}
                      onValueChange={(val) => updateUserMutation.mutate({ id: u.id, updates: { planId: parseInt(val) } })}
                    >
                      <SelectTrigger className="w-28 text-xs" data-testid={`select-plan-${u.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allPlans.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.planName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const PLAN_FEATURES: { key: string; label: string; group: string }[] = [
  { key: "audio_upload", label: "Upload Audio Files", group: "Input" },
  { key: "live_recording", label: "Live Microphone Recording", group: "Input" },
  { key: "formatting_commands", label: "Formatting Commands (109)", group: "Editor" },
  { key: "rich_text_editor", label: "Rich Text Editor (TipTap)", group: "Editor" },
  { key: "translation", label: "Translation", group: "Editor" },
  { key: "project_history", label: "Project History", group: "Editor" },
  { key: "docx_export", label: "DOCX Export (gate)", group: "Export" },
  { key: "docx_watermark", label: "DOCX with Watermark (Starter)", group: "Export" },
  { key: "docx_no_watermark", label: "DOCX Clean (Basic+)", group: "Export" },
  { key: "pdf_watermark", label: "PDF with Watermark (Starter)", group: "Export" },
  { key: "pdf_no_watermark", label: "PDF Clean (Basic+)", group: "Export" },
];

const FEATURE_GROUPS = Array.from(new Set(PLAN_FEATURES.map(f => f.group)));

const emptyPlanForm = {
  planName: "", monthlyPrice: "0", annualPrice: "0",
  totalMinutes: 0, daysLimit: "" as string | number,
  isActive: true, description: "", features: [] as string[],
  languageGroupId: "" as string | number,
};

function PlansTab() {
  const { data: allPlans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });
  const { data: allLanguageGroups } = useQuery<LanguageGroup[]>({
    queryKey: ["/api/admin/language-groups"],
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<typeof emptyPlanForm>(emptyPlanForm);
  const [isAdding, setIsAdding] = useState(false);
  const [newPlan, setNewPlan] = useState<typeof emptyPlanForm>({ ...emptyPlanForm });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyPlanForm) =>
      apiRequest("POST", "/api/admin/plans", {
        ...data,
        monthlyPrice: data.monthlyPrice || "0",
        annualPrice: data.annualPrice || "0",
        daysLimit: data.daysLimit === "" ? null : Number(data.daysLimit),
        totalMinutes: Number(data.totalMinutes),
        languageGroupId: data.languageGroupId === "" ? null : Number(data.languageGroupId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsAdding(false);
      setNewPlan({ ...emptyPlanForm });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof emptyPlanForm }) =>
      apiRequest("PUT", `/api/admin/plans/${id}`, {
        ...data,
        monthlyPrice: data.monthlyPrice || "0",
        annualPrice: data.annualPrice || "0",
        daysLimit: data.daysLimit === "" ? null : Number(data.daysLimit),
        totalMinutes: Number(data.totalMinutes),
        languageGroupId: data.languageGroupId === "" ? null : Number(data.languageGroupId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setConfirmDeleteId(null);
    },
  });

  const startEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setEditForm({
      planName: plan.planName,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      totalMinutes: plan.totalMinutes,
      daysLimit: plan.daysLimit ?? "",
      isActive: plan.isActive,
      description: plan.description ?? "",
      features: (plan.features as string[]) ?? [],
      languageGroupId: plan.languageGroupId ?? "",
    });
  };

  const toggleFeature = (featureKey: string, form: typeof emptyPlanForm, setForm: (f: typeof emptyPlanForm) => void) => {
    const current = form.features;
    setForm({
      ...form,
      features: current.includes(featureKey)
        ? current.filter(f => f !== featureKey)
        : [...current, featureKey],
    });
  };

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

  const renderFeatureEditor = (form: typeof emptyPlanForm, setForm: (f: typeof emptyPlanForm) => void) => (
    <div className="mt-4 border-t pt-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Features</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {FEATURE_GROUPS.map(group => (
          <div key={group}>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{group}</p>
            <div className="space-y-1.5">
              {PLAN_FEATURES.filter(f => f.group === group).map(f => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer" data-testid={`toggle-feature-${f.key}`}>
                  <Switch
                    checked={form.features.includes(f.key)}
                    onCheckedChange={() => toggleFeature(f.key, form, setForm)}
                    className="scale-90"
                  />
                  <span className="text-sm">{f.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPlanForm = (form: typeof emptyPlanForm, setForm: (f: typeof emptyPlanForm) => void, onSave: () => void, onCancel: () => void, isPending: boolean, saveLabel = "Save") => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground">Plan Name</label>
          <Input value={form.planName} onChange={e => setForm({ ...form, planName: e.target.value })}
            placeholder="e.g. Professional" data-testid="input-plan-name" className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Monthly Price (₹)</label>
          <Input value={form.monthlyPrice} onChange={e => setForm({ ...form, monthlyPrice: e.target.value })}
            placeholder="0" type="number" min="0" data-testid="input-plan-monthly" className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Annual Price (₹)</label>
          <Input value={form.annualPrice} onChange={e => setForm({ ...form, annualPrice: e.target.value })}
            placeholder="0" type="number" min="0" data-testid="input-plan-annual" className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Total Minutes</label>
          <Input value={form.totalMinutes} onChange={e => setForm({ ...form, totalMinutes: parseInt(e.target.value) || 0 })}
            placeholder="0" type="number" min="0" data-testid="input-plan-minutes" className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Days Limit (blank = unlimited)</label>
          <Input value={form.daysLimit} onChange={e => setForm({ ...form, daysLimit: e.target.value })}
            placeholder="Unlimited" type="number" min="1" data-testid="input-plan-days" className="mt-1 h-8 text-sm" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground">Description</label>
          <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description" data-testid="input-plan-description" className="mt-1 h-8 text-sm" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground">Language Group</label>
          <Select value={String(form.languageGroupId || "none")} onValueChange={v => setForm({ ...form, languageGroupId: v === "none" ? "" : parseInt(v) })}>
            <SelectTrigger className="mt-1 h-8 text-sm" data-testid="select-plan-language-group">
              <SelectValue placeholder="No language group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No group (show all active)</SelectItem>
              {(allLanguageGroups || []).map(g => (
                <SelectItem key={g.id} value={String(g.id)}>{g.name} ({g.languages.length} languages)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} data-testid="toggle-plan-active" />
          <span className="text-sm">Active</span>
        </div>
      </div>
      {renderFeatureEditor(form, setForm)}
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={onSave} disabled={isPending || !form.planName.trim()} data-testid="button-save-plan">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          {saveLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} data-testid="button-cancel-plan"><X className="h-3 w-3 mr-1" />Cancel</Button>
      </div>
    </div>
  );

  return (
    <div data-testid="admin-plans">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Billing Plans</h2>
        {!isAdding && (
          <Button size="sm" onClick={() => { setIsAdding(true); setEditingId(null); }} data-testid="button-add-plan">
            <Plus className="h-4 w-4 mr-1" /> Add Plan
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="p-4 mb-4 border-primary/40" data-testid="card-new-plan">
          <p className="text-sm font-semibold mb-3">New Plan</p>
          {renderPlanForm(newPlan, setNewPlan, () => createMutation.mutate(newPlan), () => { setIsAdding(false); setNewPlan({ ...emptyPlanForm }); }, createMutation.isPending, "Create Plan")}
        </Card>
      )}

      <div className="space-y-3">
        {allPlans?.map((plan) => (
          <Card key={plan.id} className="p-4" data-testid={`card-plan-${plan.id}`}>
            {editingId === plan.id ? (
              <>
                <p className="text-sm font-semibold mb-3">Editing: {plan.planName}</p>
                {renderPlanForm(editForm, setEditForm,
                  () => updateMutation.mutate({ id: plan.id, data: editForm }),
                  () => setEditingId(null),
                  updateMutation.isPending
                )}
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" data-testid={`text-plan-name-${plan.id}`}>{plan.planName}</p>
                      <Badge variant={plan.isActive ? "secondary" : "destructive"} className="text-xs">
                        {plan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                    )}
                    {plan.languageGroupId && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium">Lang Group:</span>{" "}
                        {allLanguageGroups?.find(g => g.id === plan.languageGroupId)?.name || `Group #${plan.languageGroupId}`}
                        {" "}({allLanguageGroups?.find(g => g.id === plan.languageGroupId)?.languages.length || 0} languages)
                      </p>
                    )}
                    {(plan.features as string[] ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(plan.features as string[]).map(fk => {
                          const feat = PLAN_FEATURES.find(f => f.key === fk);
                          return feat ? (
                            <Badge key={fk} variant="outline" className="text-xs py-0">{feat.label}</Badge>
                          ) : (
                            <Badge key={fk} variant="outline" className="text-xs py-0 opacity-60">{fk}</Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Minutes</p>
                      <p className="text-sm font-semibold" data-testid={`text-plan-minutes-${plan.id}`}>{plan.totalMinutes}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Validity</p>
                      <p className="text-sm font-semibold" data-testid={`text-plan-days-${plan.id}`}>
                        {plan.daysLimit ? `${plan.daysLimit} days` : "Unlimited"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Monthly</p>
                      <p className="text-sm font-semibold" data-testid={`text-plan-monthly-${plan.id}`}>
                        {parseFloat(plan.monthlyPrice) === 0 ? "Free" : `₹${plan.monthlyPrice}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Annual</p>
                      <p className="text-sm font-semibold" data-testid={`text-plan-annual-${plan.id}`}>
                        {parseFloat(plan.annualPrice) === 0 ? "Free" : `₹${plan.annualPrice}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(plan)} data-testid={`button-edit-plan-${plan.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {confirmDeleteId === plan.id ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="destructive" className="h-7 text-xs px-2"
                            onClick={() => deleteMutation.mutate(plan.id)} disabled={deleteMutation.isPending}
                            data-testid={`button-confirm-delete-plan-${plan.id}`}>
                            {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setConfirmDeleteId(null)}
                            data-testid={`button-cancel-delete-plan-${plan.id}`}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDeleteId(plan.id)} data-testid={`button-delete-plan-${plan.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        ))}
        {(!allPlans || allPlans.length === 0) && !isAdding && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No plans configured yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

interface FormattingCommand {
  id: string;
  phrase: string;
  replacement: string;
  isActive: boolean;
  language: string;
  description?: string;
}

function LanguageGroupsTab() {
  const { data: groups, isLoading } = useQuery<LanguageGroup[]>({
    queryKey: ["/api/admin/language-groups"],
  });
  const { data: allLangs } = useQuery<{ id: number; name: string; code: string; script: string; isActive: boolean }[]>({
    queryKey: ["/api/admin/languages"],
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", languageIds: [] as number[] });
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", description: "", languageIds: [] as number[] });

  const createMutation = useMutation({
    mutationFn: (data: typeof newForm) => apiRequest("POST", "/api/admin/language-groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/language-groups"] });
      setIsAdding(false);
      setNewForm({ name: "", description: "", languageIds: [] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof editForm }) =>
      apiRequest("PUT", `/api/admin/language-groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/language-groups"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/language-groups/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/language-groups"] }),
  });

  const toggleLang = (form: typeof editForm, setForm: (f: typeof editForm) => void, langId: number) => {
    const ids = form.languageIds;
    setForm({ ...form, languageIds: ids.includes(langId) ? ids.filter(i => i !== langId) : [...ids, langId] });
  };

  const renderGroupForm = (form: typeof editForm, setForm: (f: typeof editForm) => void, onSave: () => void, onCancel: () => void, isPending: boolean, saveLabel = "Save") => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Group Name</label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Extended Group" className="mt-1 h-8 text-sm" data-testid="input-group-name" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Description</label>
          <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description" className="mt-1 h-8 text-sm" data-testid="input-group-description" />
        </div>
      </div>
      <div className="border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Languages in this group</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
          {(allLangs || []).map(lang => (
            <label key={lang.id} className="flex items-center gap-1.5 text-xs cursor-pointer" data-testid={`toggle-lang-${lang.id}`}>
              <input
                type="checkbox"
                checked={form.languageIds.includes(lang.id)}
                onChange={() => toggleLang(form, setForm, lang.id)}
                className="accent-[hsl(30,100%,50%)]"
              />
              <span className={lang.isActive ? "" : "opacity-50"}>{lang.name}</span>
              <span className="text-muted-foreground text-[10px]">{lang.code}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onSave} disabled={isPending || !form.name.trim()} data-testid="button-save-group">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          {saveLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} data-testid="button-cancel-group">
          <X className="h-3 w-3 mr-1" />Cancel
        </Button>
      </div>
    </div>
  );

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <div data-testid="admin-language-groups">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Language Groups</h2>
        {!isAdding && (
          <Button size="sm" onClick={() => { setIsAdding(true); setEditingId(null); }} data-testid="button-add-group">
            <Plus className="h-4 w-4 mr-1" /> Add Group
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Language groups control which languages are available per billing plan. Assign a group to a plan in the Plans tab.
      </p>

      {isAdding && (
        <Card className="p-4 mb-4 border-primary/40" data-testid="card-new-group">
          <p className="text-sm font-semibold mb-3">New Language Group</p>
          {renderGroupForm(
            newForm as typeof editForm,
            setNewForm as (f: typeof editForm) => void,
            () => createMutation.mutate(newForm),
            () => { setIsAdding(false); setNewForm({ name: "", description: "", languageIds: [] }); },
            createMutation.isPending,
            "Create Group"
          )}
        </Card>
      )}

      <div className="space-y-3">
        {(groups || []).map((group) => (
          <Card key={group.id} className="p-4" data-testid={`card-group-${group.id}`}>
            {editingId === group.id ? (
              <>
                <p className="text-sm font-semibold mb-3">Editing: {group.name}</p>
                {renderGroupForm(
                  editForm,
                  setEditForm,
                  () => updateMutation.mutate({ id: group.id, data: editForm }),
                  () => setEditingId(null),
                  updateMutation.isPending
                )}
              </>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" data-testid={`text-group-name-${group.id}`}>{group.name}</p>
                    <Badge variant="secondary" className="text-xs">{group.languages.length} languages</Badge>
                  </div>
                  {group.description && <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {group.languages.map(l => (
                      <Badge key={l.id} variant="outline" className="text-xs py-0">{l.name}</Badge>
                    ))}
                    {group.languages.length === 0 && (
                      <p className="text-xs text-muted-foreground">No languages assigned</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => {
                      setEditingId(group.id);
                      setEditForm({ name: group.name, description: group.description || "", languageIds: group.languages.map(l => l.id) });
                    }}
                    data-testid={`button-edit-group-${group.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => { if (confirm(`Delete group "${group.name}"?`)) deleteMutation.mutate(group.id); }}
                    data-testid={`button-delete-group-${group.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
        {(!groups || groups.length === 0) && !isAdding && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No language groups yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function CommandsTab() {
  const { data: commands, isLoading } = useQuery<FormattingCommand[]>({
    queryKey: ["/api/admin/commands"],
  });

  const [filterLang, setFilterLang] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FormattingCommand>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newCmd, setNewCmd] = useState<Partial<FormattingCommand>>({
    id: "", phrase: "", replacement: "", isActive: true, language: "en", description: "",
  });

  const toggleMutation = useMutation({
    mutationFn: async (cmd: FormattingCommand) => {
      await apiRequest("POST", "/api/admin/commands", { ...cmd, isActive: !cmd.isActive });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/commands"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async (cmd: FormattingCommand) => {
      await apiRequest("PUT", `/api/admin/commands/${cmd.id}`, cmd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commands"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/commands/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/commands"] }),
  });

  const addMutation = useMutation({
    mutationFn: async (cmd: Partial<FormattingCommand>) => {
      await apiRequest("POST", "/api/admin/commands", cmd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commands"] });
      setIsAdding(false);
      setNewCmd({ id: "", phrase: "", replacement: "", isActive: true, language: "en", description: "" });
    },
  });

  const startEdit = (cmd: FormattingCommand) => {
    setEditingId(cmd.id);
    setEditForm({ ...cmd });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editForm.id) {
      updateMutation.mutate(editForm as FormattingCommand);
    }
  };

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

  const filtered = (commands || []).filter((cmd) => {
    if (filterLang !== "all" && cmd.language !== filterLang) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return cmd.phrase.toLowerCase().includes(q) || cmd.replacement.toLowerCase().includes(q) || (cmd.description || "").toLowerCase().includes(q);
    }
    return true;
  });

  const displayReplacement = (r: string) => {
    return r.replace(/\n\n/g, "\\n\\n").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  };

  const langColors: Record<string, string> = {
    en: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    hi: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    mr: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <div data-testid="admin-commands">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <h2 className="text-lg font-semibold" data-testid="text-commands-count">
          Formatting Commands ({filtered.length} of {commands?.length || 0})
        </h2>
        <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding} data-testid="button-add-command">
          <Plus className="h-4 w-4 mr-1" /> Add Command
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search phrase or replacement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-command-search"
          />
        </div>
        <Select value={filterLang} onValueChange={setFilterLang}>
          <SelectTrigger className="w-32" data-testid="select-command-language-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="hi">Hindi</SelectItem>
            <SelectItem value="mr">Marathi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isAdding && (
        <Card className="p-4 mb-4" data-testid="form-add-command">
          <p className="text-sm font-medium mb-3">New Command</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Input placeholder="ID (e.g. new-line-en)" value={newCmd.id || ""} onChange={(e) => setNewCmd({ ...newCmd, id: e.target.value })} data-testid="input-new-cmd-id" />
            <Select value={newCmd.language || "en"} onValueChange={(v) => setNewCmd({ ...newCmd, language: v })}>
              <SelectTrigger data-testid="select-new-cmd-lang"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
                <SelectItem value="mr">Marathi</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Spoken phrase (e.g. new line)" value={newCmd.phrase || ""} onChange={(e) => setNewCmd({ ...newCmd, phrase: e.target.value })} data-testid="input-new-cmd-phrase" />
            <Input placeholder="Replacement (use \n for newline)" value={newCmd.replacement || ""} onChange={(e) => setNewCmd({ ...newCmd, replacement: e.target.value })} data-testid="input-new-cmd-replacement" />
          </div>
          <Input placeholder="Description (optional)" value={newCmd.description || ""} onChange={(e) => setNewCmd({ ...newCmd, description: e.target.value })} className="mb-3" data-testid="input-new-cmd-desc" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => addMutation.mutate(newCmd)} disabled={!newCmd.id || !newCmd.phrase || addMutation.isPending} data-testid="button-save-new-cmd">
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(false)} data-testid="button-cancel-new-cmd">
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filtered.map((cmd, i) => (
          <div key={cmd.id || i} data-testid={`cmd-row-${cmd.id}`}>
            {editingId === cmd.id ? (
              <Card className="p-3 mb-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <Input value={editForm.phrase || ""} onChange={(e) => setEditForm({ ...editForm, phrase: e.target.value })} placeholder="Phrase" data-testid="input-edit-phrase" />
                  <Input value={editForm.replacement || ""} onChange={(e) => setEditForm({ ...editForm, replacement: e.target.value })} placeholder="Replacement" data-testid="input-edit-replacement" />
                  <Select value={editForm.language || "en"} onValueChange={(v) => setEditForm({ ...editForm, language: v })}>
                    <SelectTrigger data-testid="select-edit-lang"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" data-testid="input-edit-desc" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending} data-testid="button-save-edit">
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit} data-testid="button-cancel-edit">
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2 text-xs rounded-md bg-muted/50 group">
                <Badge variant="secondary" className={`text-xs w-14 justify-center flex-shrink-0 no-default-hover-elevate no-default-active-elevate ${langColors[cmd.language] || ""}`}>
                  {cmd.language}
                </Badge>
                <span className="font-medium min-w-[120px] flex-shrink-0" data-testid={`text-phrase-${cmd.id}`}>{cmd.phrase}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground flex-1 truncate font-mono text-[11px]" data-testid={`text-replacement-${cmd.id}`}>{displayReplacement(cmd.replacement)}</span>
                {cmd.description && (
                  <span className="text-muted-foreground truncate max-w-[150px] hidden sm:inline" data-testid={`text-desc-${cmd.id}`}>{cmd.description}</span>
                )}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch
                    checked={cmd.isActive}
                    onCheckedChange={() => toggleMutation.mutate(cmd)}
                    className="scale-75"
                    data-testid={`switch-active-${cmd.id}`}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit(cmd)} data-testid={`button-edit-${cmd.id}`}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => { if (confirm(`Delete command "${cmd.phrase}"?`)) deleteMutation.mutate(cmd.id); }} data-testid={`button-delete-${cmd.id}`}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-commands">No commands found.</p>
        )}
      </div>
    </div>
  );
}

function ProvidersTab() {
  const { data: providers, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/providers"],
  });
  const { getLanguageName } = useLanguages();

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <div data-testid="admin-providers">
      <h2 className="text-lg font-semibold mb-4">STT Provider Configuration</h2>
      {providers && providers.length > 0 ? (
        <div className="space-y-2">
          {providers.map((p: any) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{getLanguageName(p.languageCode)}</Badge>
                <span className="text-sm">{p.primaryProvider}</span>
                {p.fallbackProvider && (
                  <span className="text-xs text-muted-foreground">fallback: {p.fallbackProvider}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No provider configurations yet. The system uses Sarvam AI by default.
          </p>
        </Card>
      )}
    </div>
  );
}

function AnnouncementsTab() {
  const { data: allAnnouncements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/admin/announcements"],
  });
  const { data: allPlans = [] } = useQuery<Plan[]>({ queryKey: ["/api/plans"] });
  const { data: allUsers = [] } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"] });

  const emptyForm = { title: "", body: "", ctaLabel: "", ctaUrl: "", targetType: "all", targetId: "" as string | number, isActive: true, expiresAt: "" };
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ ...emptyForm });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => apiRequest("POST", "/api/admin/announcements", {
      ...data,
      ctaLabel: data.ctaLabel || null,
      ctaUrl: data.ctaUrl || null,
      targetId: data.targetId === "" ? null : Number(data.targetId),
      expiresAt: data.expiresAt || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      setIsAdding(false);
      setForm({ ...emptyForm });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof emptyForm }) =>
      apiRequest("PUT", `/api/admin/announcements/${id}`, {
        ...data,
        ctaLabel: data.ctaLabel || null,
        ctaUrl: data.ctaUrl || null,
        targetId: data.targetId === "" ? null : Number(data.targetId),
        expiresAt: data.expiresAt || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PUT", `/api/admin/announcements/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] }),
  });

  const startEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setIsAdding(false);
    setEditForm({
      title: ann.title,
      body: ann.body,
      ctaLabel: ann.ctaLabel || "",
      ctaUrl: ann.ctaUrl || "",
      targetType: ann.targetType,
      targetId: ann.targetId ?? "",
      isActive: ann.isActive,
      expiresAt: ann.expiresAt ? ann.expiresAt.slice(0, 10) : "",
    });
  };

  const getTargetLabel = (ann: Announcement) => {
    if (ann.targetType === "all") return "All Users";
    if (ann.targetType === "plan") {
      const plan = allPlans.find((p) => p.id === ann.targetId);
      return `Plan: ${plan?.planName || ann.targetId}`;
    }
    if (ann.targetType === "user") {
      const u = allUsers.find((u) => u.id === ann.targetId);
      return `User: ${u?.fullName || `#${ann.targetId}`}`;
    }
    return ann.targetType;
  };

  const renderForm = (
    f: typeof emptyForm,
    setF: (v: typeof emptyForm) => void,
    onSave: () => void,
    onCancel: () => void,
    isPending: boolean,
    saveLabel = "Publish"
  ) => (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground">Title *</label>
        <input
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
          placeholder="Announcement title"
          className="mt-1 w-full h-8 px-3 text-sm border rounded-md bg-background"
          data-testid="input-ann-title"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Message *</label>
        <Textarea
          value={f.body}
          onChange={(e) => setF({ ...f, body: e.target.value })}
          placeholder="Write your message here..."
          className="mt-1 text-sm min-h-[80px]"
          data-testid="input-ann-body"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Target Audience</label>
          <Select value={f.targetType} onValueChange={(v) => setF({ ...f, targetType: v, targetId: "" })}>
            <SelectTrigger className="mt-1 h-8 text-sm" data-testid="select-ann-target-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="plan">By Plan</SelectItem>
              <SelectItem value="user">Specific User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {f.targetType === "plan" && (
          <div>
            <label className="text-xs text-muted-foreground">Plan</label>
            <Select value={String(f.targetId || "")} onValueChange={(v) => setF({ ...f, targetId: v })}>
              <SelectTrigger className="mt-1 h-8 text-sm" data-testid="select-ann-plan">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {allPlans.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.planName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {f.targetType === "user" && (
          <div>
            <label className="text-xs text-muted-foreground">User</label>
            <Select value={String(f.targetId || "")} onValueChange={(v) => setF({ ...f, targetId: v })}>
              <SelectTrigger className="mt-1 h-8 text-sm" data-testid="select-ann-user">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.filter((u) => u.role !== "admin").map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.fullName} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">CTA Button Label</label>
          <input
            value={f.ctaLabel}
            onChange={(e) => setF({ ...f, ctaLabel: e.target.value })}
            placeholder="e.g. Learn more"
            className="mt-1 w-full h-8 px-3 text-sm border rounded-md bg-background"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">CTA URL</label>
          <input
            value={f.ctaUrl}
            onChange={(e) => setF({ ...f, ctaUrl: e.target.value })}
            placeholder="https://..."
            className="mt-1 w-full h-8 px-3 text-sm border rounded-md bg-background"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Expires On (optional)</label>
          <input
            type="date"
            value={f.expiresAt}
            onChange={(e) => setF({ ...f, expiresAt: e.target.value })}
            className="mt-1 w-full h-8 px-3 text-sm border rounded-md bg-background"
          />
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <Switch checked={f.isActive} onCheckedChange={(v) => setF({ ...f, isActive: v })} />
          <span className="text-sm">{f.isActive ? "Active" : "Inactive"}</span>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={onSave}
          disabled={isPending || !f.title.trim() || !f.body.trim()}
          data-testid="button-save-announcement"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          {saveLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3 w-3 mr-1" />Cancel
        </Button>
      </div>
    </div>
  );

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div data-testid="admin-announcements">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Announcements</h2>
        {!isAdding && (
          <Button size="sm" onClick={() => { setIsAdding(true); setEditingId(null); }} data-testid="button-add-announcement">
            <Plus className="h-4 w-4 mr-1" /> New Announcement
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="p-4 mb-4 border-primary/40" data-testid="card-new-announcement">
          <p className="text-sm font-semibold mb-3">New Announcement</p>
          {renderForm(
            form,
            setForm,
            () => createMutation.mutate(form),
            () => { setIsAdding(false); setForm({ ...emptyForm }); },
            createMutation.isPending,
            "Publish"
          )}
        </Card>
      )}

      {allAnnouncements.length === 0 && !isAdding ? (
        <Card className="p-10 text-center">
          <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No announcements yet. Create one to notify your users.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {allAnnouncements.map((ann) => (
            <Card key={ann.id} className="p-4" data-testid={`card-announcement-${ann.id}`}>
              {editingId === ann.id ? (
                <>
                  <p className="text-sm font-semibold mb-3">Editing announcement</p>
                  {renderForm(
                    editForm,
                    setEditForm,
                    () => updateMutation.mutate({ id: ann.id, data: editForm }),
                    () => setEditingId(null),
                    updateMutation.isPending,
                    "Save Changes"
                  )}
                </>
              ) : (
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold">{ann.title}</p>
                      <Badge variant={ann.isActive ? "secondary" : "outline"} className="text-xs">
                        {ann.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{getTargetLabel(ann)}</Badge>
                      {ann.expiresAt && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Expires {new Date(ann.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ann.body}</p>
                    {ann.ctaLabel && (
                      <p className="text-xs text-[#FF9933] mt-1">CTA: {ann.ctaLabel} → {ann.ctaUrl}</p>
                    )}
                    <p className="text-xs text-muted-foreground/50 mt-1.5">
                      Created {new Date(ann.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Active</span>
                      <Switch
                        checked={ann.isActive}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: ann.id, isActive: v })}
                        data-testid={`switch-ann-active-${ann.id}`}
                      />
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(ann)} data-testid={`button-edit-ann-${ann.id}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(ann.id)}
                      data-testid={`button-delete-ann-${ann.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  return (
    <div data-testid="admin-settings">
      <h2 className="text-lg font-semibold mb-4">System Settings</h2>
      <div className="space-y-3">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium">Audio Retention Period</p>
              <p className="text-xs text-muted-foreground">Days to keep audio after project completion</p>
            </div>
            <Badge variant="secondary" className="text-sm">15 days</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium">Max Upload Size</p>
              <p className="text-xs text-muted-foreground">Maximum audio file size</p>
            </div>
            <Badge variant="secondary" className="text-sm">25 MB / 30 min</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium">Default STT Provider</p>
              <p className="text-xs text-muted-foreground">Primary speech-to-text service</p>
            </div>
            <Badge variant="secondary" className="text-sm">Sarvam AI</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
