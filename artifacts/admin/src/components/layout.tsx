import { Link, useLocation } from "wouter";
import { LogOut, LayoutDashboard, MessageSquare, BookOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setLocation("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/prompts", label: "Prompts", icon: MessageSquare },
    { href: "/grammar", label: "Grammar", icon: BookOpen },
    { href: "/config", label: "Config", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <h1 className="font-mono text-xl font-bold tracking-tighter uppercase">CelpePrep Ops</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
