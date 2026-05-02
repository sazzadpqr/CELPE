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

function ProtectedRoute({ component: Component }: { component: any }) {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    setIsAuth(!!token);
  }, []);

  if (isAuth === null) return null;
  
  if (!isAuth) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const [location] = useLocation();

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
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/prompts">
        {() => <ProtectedRoute component={Prompts} />}
      </Route>
      <Route path="/grammar">
        {() => <ProtectedRoute component={Grammar} />}
      </Route>
      <Route path="/quiz">
        {() => <ProtectedRoute component={Quiz} />}
      </Route>
      <Route path="/exams">
        {() => <ProtectedRoute component={Exams} />}
      </Route>
      <Route path="/wotd">
        {() => <ProtectedRoute component={Wotd} />}
      </Route>
      <Route path="/config">
        {() => <ProtectedRoute component={Config} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Force dark mode for admin cockpit vibe
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
