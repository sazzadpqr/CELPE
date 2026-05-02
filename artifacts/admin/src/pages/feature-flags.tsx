import { useState, useEffect } from "react";
import { Flag, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type FeatureFlag = { id: string; flagKey: string; title: string; description: string; enabled: boolean; category: string; updatedAt: string };

const CATEGORY_LABELS: Record<string, string> = {
  learning: "Aprendizado",
  content: "Conteúdo",
  social: "Social",
  features: "Funcionalidades",
  admin: "Administração",
  future: "Futuro",
  general: "Geral",
};

export default function FeatureFlagsPage() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await adminFetch<FeatureFlag[]>("/api/admin/feature-flags");
      setFlags(rows);
    } catch { toast({ title: "Erro ao carregar flags", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (flag: FeatureFlag) => {
    setSaving(flag.id);
    try {
      await adminSave(`/api/admin/feature-flags/${flag.id}`, { enabled: !flag.enabled }, "PUT");
      setFlags(f => f.map(fl => fl.id === flag.id ? { ...fl, enabled: !fl.enabled } : fl));
      toast({ title: `${flag.title}: ${!flag.enabled ? "ativado" : "desativado"}` });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(null); }
  };

  const grouped = flags.reduce((acc, f) => {
    const cat = f.category ?? "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  const categoryOrder = ["learning", "content", "features", "social", "admin", "future", "general"];
  const sortedCategories = categoryOrder.filter(c => grouped[c]?.length);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Flag className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Feature Flags</h1>
          <p className="text-sm text-muted-foreground">Ative ou desative funcionalidades do app</p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={load}>
          <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
        </Button>
      </div>

      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-3">
          <p className="text-xs text-yellow-400">
            <strong>Atenção:</strong> Desativar uma funcionalidade pode ocultar partes do app para os usuários.
            Funcionalidades marcadas como "Futuro" ainda não estão implementadas no frontend — não causarão problemas se ativadas, mas não terão efeito visual.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map(cat => (
            <div key={cat}>
              <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">{CATEGORY_LABELS[cat] ?? cat}</h2>
              <div className="space-y-2">
                {grouped[cat].map(flag => (
                  <Card key={flag.id} className={flag.enabled ? "border-primary/30" : ""}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{flag.title}</p>
                          {flag.enabled
                            ? <Badge className="text-[10px] bg-green-600">Ativo</Badge>
                            : <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                          {flag.category === "future" && <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400">Em breve</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{flag.flagKey}</p>
                      </div>
                      <Switch
                        checked={flag.enabled}
                        disabled={saving === flag.id}
                        onCheckedChange={() => toggle(flag)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
