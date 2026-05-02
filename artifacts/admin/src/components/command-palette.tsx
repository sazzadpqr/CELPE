import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, MessageSquare, BookOpen, Settings,
  HelpCircle, Archive, Star, Shield, Megaphone, CreditCard,
  FlaskConical, SlidersHorizontal, Users, Library, Flag, Bell,
  Map, GraduationCap, DollarSign, Search, ArrowRight, X,
} from "lucide-react";

const ALL_PAGES = [
  { href: "/dashboard",      label: "Visão Geral",          icon: LayoutDashboard, section: "Geral",        keywords: ["dashboard", "overview", "stats", "métricas"] },
  { href: "/users",          label: "Usuários",              icon: Users,            section: "Geral",        keywords: ["users", "alunos", "premium", "usuários"] },
  { href: "/prompts",        label: "Prompts de Prática",    icon: MessageSquare,    section: "Conteúdo",     keywords: ["prompts", "prática", "tarefas", "escrita"] },
  { href: "/grammar",        label: "Gramática",             icon: BookOpen,         section: "Conteúdo",     keywords: ["grammar", "gramática", "tópicos"] },
  { href: "/quiz",           label: "Quiz",                  icon: HelpCircle,       section: "Conteúdo",     keywords: ["quiz", "questões", "perguntas"] },
  { href: "/exams",          label: "Provas Anteriores",     icon: Archive,          section: "Conteúdo",     keywords: ["exams", "provas", "celpe", "edições"] },
  { href: "/wotd",           label: "Banco de Palavras",     icon: Star,             section: "Conteúdo",     keywords: ["wotd", "palavra do dia", "vocabulário", "banco"] },
  { href: "/diagnostic",     label: "Diagnóstico",           icon: FlaskConical,     section: "Conteúdo",     keywords: ["diagnostic", "diagnóstico", "nível", "assessment"] },
  { href: "/study-library",  label: "Biblioteca de Estudo",  icon: Library,          section: "Conteúdo",     keywords: ["library", "biblioteca", "materiais", "categorias"] },
  { href: "/courses",        label: "Cursos e Aulas",        icon: GraduationCap,    section: "Conteúdo",     keywords: ["courses", "cursos", "aulas", "lições"] },
  { href: "/learning-paths", label: "Trilhas de Aprendizado",icon: Map,              section: "Conteúdo",     keywords: ["paths", "trilhas", "percurso"] },
  { href: "/banners",        label: "Banners",               icon: Megaphone,        section: "App & CMS",    keywords: ["banners", "campanhas", "promoções"] },
  { href: "/notifications",  label: "Notificações Push",     icon: Bell,             section: "App & CMS",    keywords: ["notifications", "notificações", "push", "avisos"] },
  { href: "/feature-flags",  label: "Feature Flags",         icon: Flag,             section: "App & CMS",    keywords: ["flags", "features", "toggles", "experimentos"] },
  { href: "/monetization",   label: "Planos e Paywall",      icon: DollarSign,       section: "Monetização",  keywords: ["monetization", "planos", "paywall", "preços"] },
  { href: "/paywall-cms",    label: "Paywall CMS",           icon: CreditCard,       section: "Monetização",  keywords: ["paywall", "cms", "textos", "upgrade"] },
  { href: "/limits",         label: "Limites Freemium",      icon: SlidersHorizontal,section: "Monetização",  keywords: ["limits", "limites", "freemium", "cotas"] },
  { href: "/ads",            label: "Anúncios",              icon: Megaphone,        section: "Monetização",  keywords: ["ads", "anúncios", "admob", "adsense"] },
  { href: "/config",         label: "Config IA",             icon: Settings,         section: "Sistema",      keywords: ["config", "ia", "ai", "prompts sistema", "openai"] },
  { href: "/vault",          label: "API Vault",             icon: Shield,           section: "Sistema",      keywords: ["vault", "api keys", "chaves", "secrets", "paddle"] },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = query.trim() === ""
    ? ALL_PAGES
    : ALL_PAGES.filter(p => {
        const q = query.toLowerCase();
        return (
          p.label.toLowerCase().includes(q) ||
          p.section.toLowerCase().includes(q) ||
          p.keywords.some(k => k.includes(q))
        );
      });

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const navigate = useCallback((href: string) => {
    setLocation(href);
    onClose();
  }, [setLocation, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) { navigate(results[selected]!.href); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, selected, navigate, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open) return null;

  const grouped = results.reduce<Record<string, typeof results>>((acc, item) => {
    const s = query.trim() ? "Resultados" : item.section;
    if (!acc[s]) acc[s] = [];
    acc[s]!.push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input ref={inputRef} value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar página ou função..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono" />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground font-mono">
              Nenhum resultado para "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([section, items]) => {
              const globalOffset = results.indexOf(items[0]!);
              return (
                <div key={section}>
                  <div className="px-4 py-1.5 text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                    {section}
                  </div>
                  {items.map((item, localIdx) => {
                    const idx = globalOffset + localIdx;
                    const isSelected = selected === idx;
                    return (
                      <button key={item.href} data-idx={idx}
                        onClick={() => navigate(item.href)}
                        onMouseEnter={() => setSelected(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isSelected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}>
                        <item.icon className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                        {isSelected && <ArrowRight className="h-3.5 w-3.5 opacity-60" />}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex gap-4 text-[10px] font-mono text-muted-foreground/50">
          <span><kbd className="bg-muted px-1 rounded">↑↓</kbd> navegar</span>
          <span><kbd className="bg-muted px-1 rounded">↵</kbd> abrir</span>
          <span><kbd className="bg-muted px-1 rounded">ESC</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
