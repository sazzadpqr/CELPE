import { useLocation } from "wouter";
import { Search, Circle } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":      "Visão Geral",
  "/users":          "Usuários",
  "/prompts":        "Prompts de Prática",
  "/grammar":        "Gramática",
  "/quiz":           "Quiz",
  "/exams":          "Provas Anteriores",
  "/wotd":           "Banco de Palavras",
  "/diagnostic":     "Diagnóstico",
  "/study-library":  "Biblioteca de Estudo",
  "/courses":        "Cursos e Aulas",
  "/learning-paths": "Trilhas de Aprendizado",
  "/banners":        "Banners",
  "/notifications":  "Notificações Push",
  "/feature-flags":  "Feature Flags",
  "/monetization":   "Planos e Paywall",
  "/paywall-cms":    "Paywall CMS",
  "/limits":         "Limites Freemium",
  "/ads":            "Anúncios",
  "/config":         "Config IA",
  "/vault":          "API Vault",
};

const SECTION_TITLES: Record<string, string> = {
  "/dashboard": "Geral",
  "/users":     "Geral",
  "/prompts":   "Conteúdo",
  "/grammar":   "Conteúdo",
  "/quiz":      "Conteúdo",
  "/exams":     "Conteúdo",
  "/wotd":      "Conteúdo",
  "/diagnostic":"Conteúdo",
  "/study-library": "Conteúdo",
  "/courses":   "Conteúdo",
  "/learning-paths": "Conteúdo",
  "/banners":   "App & CMS",
  "/notifications": "App & CMS",
  "/feature-flags": "App & CMS",
  "/monetization": "Monetização",
  "/paywall-cms":  "Monetização",
  "/limits":       "Monetização",
  "/ads":          "Monetização",
  "/config":    "Sistema",
  "/vault":     "Sistema",
};

interface TopBarProps {
  onSearchClick: () => void;
}

export function TopBar({ onSearchClick }: TopBarProps) {
  const [location] = useLocation();
  const title = PAGE_TITLES[location] ?? "Admin";
  const section = SECTION_TITLES[location];
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

  return (
    <div className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-6 gap-4 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground flex-1 min-w-0">
        {section && (
          <>
            <span className="text-muted-foreground/50">{section}</span>
            <span className="text-muted-foreground/30">/</span>
          </>
        )}
        <span className="text-foreground font-semibold truncate">{title}</span>
      </div>

      {/* Search trigger */}
      <button
        onClick={onSearchClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted hover:border-primary/30 transition-colors text-xs font-mono text-muted-foreground group"
      >
        <Search className="h-3.5 w-3.5 group-hover:text-foreground transition-colors" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 bg-background border border-border rounded px-1 text-[10px]">
          {isMac ? "⌘" : "Ctrl"}K
        </kbd>
      </button>

      {/* Session status */}
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/50">
        <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
        <span className="hidden sm:inline">Online</span>
      </div>
    </div>
  );
}
