import { Link, useLocation } from "wouter";
import {
  LogOut, LayoutDashboard, MessageSquare, BookOpen, Settings,
  HelpCircle, Archive, Star, Shield, Megaphone, CreditCard,
  FlaskConical, SlidersHorizontal, ChevronDown, ChevronRight,
  Users, Library, Flag, Bell, Map, GraduationCap, DollarSign,
  Mic, Volume2, Headphones, MessageCircle, UserCheck, ExternalLink,
  Video, Users2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CommandPalette, useCommandPalette } from "./command-palette";
import { TopBar } from "./top-bar";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_SECTIONS = [
  {
    label: "Geral",
    items: [
      { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard },
      { href: "/users", label: "Usuários", icon: Users },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { href: "/prompts", label: "Prompts de Prática", icon: MessageSquare },
      { href: "/grammar", label: "Gramática", icon: BookOpen },
      { href: "/quiz", label: "Quiz", icon: HelpCircle },
      { href: "/exams", label: "Provas Anteriores", icon: Archive },
      { href: "/wotd", label: "Banco de Palavras", icon: Star },
      { href: "/diagnostic", label: "Diagnóstico", icon: FlaskConical },
      { href: "/study-library", label: "Biblioteca de Estudo", icon: Library },
      { href: "/courses", label: "Cursos e Aulas", icon: GraduationCap },
      { href: "/learning-paths", label: "Trilhas de Aprendizado", icon: Map },
      { href: "/oral-tasks", label: "Tarefas Orais", icon: Mic },
      { href: "/pronunciation-content", label: "Pronúncia", icon: Volume2 },
      { href: "/listening-content", label: "Compreensão Auditiva", icon: Headphones },
      { href: "/conversation-scenarios", label: "Cenários de Conversa", icon: MessageCircle },
    ],
  },
  {
    label: "App & CMS",
    items: [
      { href: "/banners", label: "Banners", icon: Megaphone },
      { href: "/notifications", label: "Notificações Push", icon: Bell },
      { href: "/feature-flags", label: "Feature Flags", icon: Flag },
      { href: "/live-events", label: "Aulas ao Vivo", icon: Video },
      { href: "/community", label: "Comunidade", icon: Users2 },
    ],
  },
  {
    label: "Monetização",
    items: [
      { href: "/monetization", label: "Planos e Paywall", icon: DollarSign },
      { href: "/paywall-cms", label: "Paywall CMS", icon: CreditCard },
      { href: "/limits", label: "Limites Freemium", icon: SlidersHorizontal },
      { href: "/ads", label: "Anúncios", icon: Megaphone },
    ],
  },
  {
    label: "Professores",
    items: [
      { href: "/teachers", label: "Gestão de Professores", icon: UserCheck },
      { href: "/teacher-login", label: "Portal do Professor ↗", icon: ExternalLink },
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
  const { open, setOpen } = useCommandPalette();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_token_expires");
    setLocation("/login");
  };

  const toggleSection = (label: string) =>
    setCollapsed((c) => ({ ...c, [label]: !c[label] }));

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-56 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h1 className="font-mono text-sm font-bold tracking-tighter uppercase text-primary">CelpePrep</h1>
          <p className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-widest mt-0.5">Painel Admin</p>
        </div>

        <nav className="flex-1 p-2 space-y-3 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <button
                onClick={() => toggleSection(section.label)}
                className="flex items-center justify-between w-full px-2 mb-0.5 group"
              >
                <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest group-hover:text-muted-foreground/70 transition-colors">
                  {section.label}
                </span>
                {collapsed[section.label]
                  ? <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/30" />
                  : <ChevronDown className="h-2.5 w-2.5 text-muted-foreground/30" />
                }
              </button>
              {!collapsed[section.label] && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer text-[11px] font-medium ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                          }`}
                        >
                          <item.icon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-2 border-t space-y-1">
          {/* Quick search hint */}
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-mono text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary transition-colors"
          >
            <span className="flex-1 text-left">Busca rápida</span>
            <kbd className="text-[9px] bg-muted px-1 rounded border border-border">⌘K</kbd>
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground text-[11px] px-2.5 h-7"
            onClick={handleLogout}
          >
            <LogOut className="h-3 w-3 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onSearchClick={() => setOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-6xl mx-auto">{children}</div>
        </main>
      </div>

      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
