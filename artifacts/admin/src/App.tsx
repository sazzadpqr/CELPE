import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Prompts from "@/pages/prompts";
import Grammar from "@/pages/grammar";
import Config from "@/pages/config";
import Quiz from "@/pages/quiz";
import Exams from "@/pages/exams";
import Wotd from "@/pages/wotd";
import Vault from "@/pages/vault";
import AdsPage from "@/pages/ads";
import PaywallCmsPage from "@/pages/paywall-cms";
import DiagnosticAdmin from "@/pages/diagnostic-admin";
import LimitsPage from "@/pages/limits";
import UsersPage from "@/pages/users";
import StudyLibraryPage from "@/pages/study-library";
import FeatureFlagsPage from "@/pages/feature-flags";
import BannersPage from "@/pages/banners";
import NotificationsAdminPage from "@/pages/notifications-admin";
import LearningPathsPage from "@/pages/learning-paths";
import CoursesAdminPage from "@/pages/courses-admin";
import MonetizationPage from "@/pages/monetization";
import OralTasksPage from "@/pages/oral-tasks";
import PronunciationContentPage from "@/pages/pronunciation-content";
import ListeningContentPage from "@/pages/listening-content";
import ConversationScenariosPage from "@/pages/conversation-scenarios";
import TeachersPage from "@/pages/teachers";
import TeacherLoginPage from "@/pages/teacher-login";
import TeacherPortalPage from "@/pages/teacher-portal";
import LiveEventsPage from "@/pages/live-events";
import CommunityAdminPage from "@/pages/community-admin";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

setAuthTokenGetter(() => localStorage.getItem("admin_token"));

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { setIsAuth(false); return; }
    // Check expiry if set
    const expires = localStorage.getItem("admin_token_expires");
    if (expires && Date.now() > Number(expires)) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_token_expires");
      setIsAuth(false);
      return;
    }
    setIsAuth(true);
  }, []);

  if (isAuth === null) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isAuth) return <Redirect to="/login" />;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => {
          const token = localStorage.getItem("admin_token");
          if (token) return <Redirect to="/dashboard" />;
          return <Redirect to="/login" />;
        }}
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/prompts">{() => <ProtectedRoute component={Prompts} />}</Route>
      <Route path="/grammar">{() => <ProtectedRoute component={Grammar} />}</Route>
      <Route path="/quiz">{() => <ProtectedRoute component={Quiz} />}</Route>
      <Route path="/exams">{() => <ProtectedRoute component={Exams} />}</Route>
      <Route path="/wotd">{() => <ProtectedRoute component={Wotd} />}</Route>
      <Route path="/config">{() => <ProtectedRoute component={Config} />}</Route>
      <Route path="/vault">{() => <ProtectedRoute component={Vault} />}</Route>
      <Route path="/ads">{() => <ProtectedRoute component={AdsPage} />}</Route>
      <Route path="/paywall-cms">{() => <ProtectedRoute component={PaywallCmsPage} />}</Route>
      <Route path="/diagnostic">{() => <ProtectedRoute component={DiagnosticAdmin} />}</Route>
      <Route path="/limits">{() => <ProtectedRoute component={LimitsPage} />}</Route>
      <Route path="/users">{() => <ProtectedRoute component={UsersPage} />}</Route>
      <Route path="/study-library">{() => <ProtectedRoute component={StudyLibraryPage} />}</Route>
      <Route path="/feature-flags">{() => <ProtectedRoute component={FeatureFlagsPage} />}</Route>
      <Route path="/banners">{() => <ProtectedRoute component={BannersPage} />}</Route>
      <Route path="/notifications">{() => <ProtectedRoute component={NotificationsAdminPage} />}</Route>
      <Route path="/learning-paths">{() => <ProtectedRoute component={LearningPathsPage} />}</Route>
      <Route path="/courses">{() => <ProtectedRoute component={CoursesAdminPage} />}</Route>
      <Route path="/monetization">{() => <ProtectedRoute component={MonetizationPage} />}</Route>
      <Route path="/oral-tasks">{() => <ProtectedRoute component={OralTasksPage} />}</Route>
      <Route path="/pronunciation-content">{() => <ProtectedRoute component={PronunciationContentPage} />}</Route>
      <Route path="/listening-content">{() => <ProtectedRoute component={ListeningContentPage} />}</Route>
      <Route path="/conversation-scenarios">{() => <ProtectedRoute component={ConversationScenariosPage} />}</Route>
      <Route path="/teachers">{() => <ProtectedRoute component={TeachersPage} />}</Route>
      <Route path="/teacher-login" component={TeacherLoginPage} />
      <Route path="/teacher-portal" component={TeacherPortalPage} />
      <Route path="/live-events">{() => <ProtectedRoute component={LiveEventsPage} />}</Route>
      <Route path="/community">{() => <ProtectedRoute component={CommunityAdminPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
