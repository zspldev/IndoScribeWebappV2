import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import LandingMarketing from "@/pages/LandingMarketing";
import LoginPage from "@/pages/LoginPage";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import NewProject from "@/pages/NewProject";
import ProjectEditor from "@/pages/ProjectEditor";
import AdminDashboard from "@/pages/AdminDashboard";
import SelectPlan from "@/pages/SelectPlan";
import TranslateDocument from "@/pages/TranslateDocument";
import NotFound from "@/pages/not-found";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";

const NO_FOOTER_ROUTES = ["/", "/login"];

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "admin") return <Redirect to="/dashboard" />;
  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (user) {
    return <Redirect to={user.role === "admin" ? "/admin" : "/dashboard"} />;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => <PublicRoute component={LandingMarketing} />}
      </Route>
      <Route path="/login">
        {() => <PublicRoute component={LoginPage} />}
      </Route>
      <Route path="/register">
        {() => <Register />}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/projects/new">
        {() => <ProtectedRoute component={NewProject} />}
      </Route>
      <Route path="/projects/:id">
        {() => <ProtectedRoute component={ProjectEditor} />}
      </Route>
      <Route path="/select-plan">
        {() => <ProtectedRoute component={SelectPlan} />}
      </Route>
      <Route path="/upgrade">
        {() => <ProtectedRoute component={SelectPlan} />}
      </Route>
      <Route path="/translate-document">
        {() => <ProtectedRoute component={TranslateDocument} />}
      </Route>
      <Route path="/admin">
        {() => <AdminRoute component={AdminDashboard} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const [location] = useLocation();
  const showFooter = !NO_FOOTER_ROUTES.includes(location);
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <Router />
      </div>
      {showFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppShell />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
