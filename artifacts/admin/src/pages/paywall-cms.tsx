import { useState, useEffect } from "react";
import { Save, CreditCard, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type PaywallCms = {
  headline: string;
  subheadline: string;
  monthlyPrice: string;
  monthlyLabel: string;
  yearlyPrice: string;
  yearlyLabel: string;
  yearlyBadge: string;
  ctaMonthly: string;
  ctaYearly: string;
  features: string[];
  footnote: string;
};

const DEFAULTS: PaywallCms = {
  headline: "Desbloqueie o CelpePrep Premium",
  subheadline: "Avaliações ilimitadas, plano adaptativo e muito mais para sua aprovação.",
  monthlyPrice: "R$ 44,99",
  monthlyLabel: "por mês",
  yearlyPrice: "R$ 479,88",
  yearlyLabel: "R$ 39,99/mês — economize 11%",
  yearlyBadge: "Mais Popular",
  ctaMonthly: "Assinar Mensal",
  ctaYearly: "Assinar Anual",
  features: [],
  footnote: "Cancele quando quiser. Sem fidelidade.",
};

export default function PaywallCmsPage() {
  const { toast } = useToast();
  const [cms, setCms] = useState<PaywallCms>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    adminFetch<PaywallCms>("/api/admin/paywall-cms")
      .then((d) => setCms({ ...DEFAULTS, ...d }))
      .catch(() => toast({ title: "Erro ao carregar paywall CMS", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await adminSave("/api/admin/paywall-cms", cms);
      toast({ title: "Paywall CMS salvo" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof PaywallCms>(k: K, v: PaywallCms[K]) =>
    setCms((c) => ({ ...c, [k]: v }));

  const addFeature = () => {
    if (!newFeature.trim()) return;
    set("features", [...cms.features, newFeature.trim()]);
    setNewFeature("");
  };

  const removeFeature = (i: number) =>
    set("features", cms.features.filter((_, idx) => idx !== i));

  const updateFeature = (i: number, val: string) =>
    set("features", cms.features.map((f, idx) => (idx === i ? val : f)));

  const Field = ({ field, label, placeholder, multiline }: {
    field: keyof PaywallCms; label: string; placeholder?: string; multiline?: boolean;
  }) => (
    <div className="space-y-1">
      <Label className="text-xs font-mono text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea rows={2} placeholder={placeholder} value={String(cms[field])}
          onChange={(e) => set(field, e.target.value as PaywallCms[typeof field])}
          className="font-mono text-xs bg-muted/50 border-muted-foreground/20" />
      ) : (
        <Input placeholder={placeholder} value={String(cms[field])}
          onChange={(e) => set(field, e.target.value as PaywallCms[typeof field])}
          className="font-mono text-xs bg-muted/50 border-muted-foreground/20" />
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-yellow-400" /> Paywall CMS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Edite textos, preços e benefícios exibidos na tela de assinatura do app.
          </p>
        </div>
        <Button onClick={save} disabled={saving || loading}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="font-mono text-sm">Cabeçalho</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field field="headline" label="Título principal" placeholder="Desbloqueie o CelpePrep Premium" />
              <Field field="subheadline" label="Subtítulo" placeholder="Avaliações ilimitadas..." multiline />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">Planos e Preços</CardTitle>
              <CardDescription>Textos exibidos nos cartões de assinatura.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs font-mono text-yellow-500 uppercase tracking-wider">Mensal</p>
                <Field field="monthlyPrice" label="Preço" placeholder="R$ 44,99" />
                <Field field="monthlyLabel" label="Label abaixo do preço" placeholder="por mês" />
                <Field field="ctaMonthly" label="Texto do botão" placeholder="Assinar Mensal" />
              </div>
              <div className="space-y-3">
                <p className="text-xs font-mono text-yellow-500 uppercase tracking-wider">Anual</p>
                <Field field="yearlyPrice" label="Preço total" placeholder="R$ 479,88" />
                <Field field="yearlyLabel" label="Label (preço/mês + economia)" placeholder="R$ 39,99/mês" />
                <Field field="yearlyBadge" label="Badge de destaque" placeholder="Mais Popular" />
                <Field field="ctaYearly" label="Texto do botão" placeholder="Assinar Anual" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">Benefícios</CardTitle>
              <CardDescription>Itens exibidos com ícone de check no paywall.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cms.features.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum benefício cadastrado ainda.</p>
              )}
              {cms.features.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input value={f} onChange={(e) => updateFeature(i, e.target.value)}
                    className="font-mono text-xs bg-muted/50 flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => removeFeature(i)}
                    className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Input placeholder="Adicionar benefício..." value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFeature()}
                  className="font-mono text-xs bg-muted/50 flex-1" />
                <Button variant="outline" size="icon" onClick={addFeature}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-mono text-sm">Rodapé / Nota Legal</CardTitle></CardHeader>
            <CardContent>
              <Field field="footnote" label="Texto abaixo dos botões" placeholder="Cancele quando quiser." />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
