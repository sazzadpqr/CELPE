import { Link, useLocation } from "wouter";
import {
  LogOut, LayoutDashboard, MessageSquare, BookOpen, Settings,
  HelpCircle, Archive, Star, Shield, Megaphone, CreditCard,
  FlaskConical, SlidersHorizontal, ChevronDown, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_SECTIONS = [
  {
    label: "Geral",
    items: [
      { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { href: "/prompts", label: "Prompts", icon: MessageSquare },
      { href: "/grammar", label: "Gramática", icon: BookOpen },
      { href: "/quiz", label: "Quiz", icon: HelpCircle },
      { href: "/exams", label: "Provas", icon: Archive },
      { href: "/wotd", label: "Banco de Palavras", icon: Star },
      { href: "/diagnostic", label: "Diagnóstico", icon: FlaskConical },
    ],
  },
  {
    label: "Monetização",
    items: [
      { href: "/paywall-cms", label: "Paywall CMS", icon: CreditCard },
      { href: "/limits", label: "Limites Freemium", icon: SlidersHorizontal },
      { href: "/ads", label: "Anúncios", icon: Megaphone },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/config", label: "Config IA", icon: Settings },
      { href: "/vault", label: "API Vault", icon: Shield },
    ],
  },
];

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setLocation("/login");
  };

  const toggleSection = (label: string) =>
    setCollapsed((c) => ({ ...c, [label]: !c[label] }));

  return (
    <div className="flex h-screen bg-background">
      <div className="w-60 border-r bg-card flex flex-col">
        <div className="p-5 border-b">
          <h1 className="font-mono text-base font-bold tracking-tighter uppercase text-primary">CelpePrep</h1>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Painel Admin</p>
        </div>
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <button
                onClick={() => toggleSection(section.label)}
                className="flex items-center justify-between w-full px-2 mb-1"
              >
                <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                  {section.label}
                </span>
                {collapsed[section.label]
                  ? <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                  : <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
                }
              </button>
              {!collapsed[section.label] && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors cursor-pointer text-xs font-medium ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                          }`}
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
                          {item.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground text-xs"
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Sair
          </Button>
        </div>
      </div>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
