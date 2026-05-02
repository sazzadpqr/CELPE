import { useState, useEffect } from "react";
import { Save, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type LimitsConfig = {
  freeAiEvaluationsPerMonth: number;
  freeAiGeneratedPracticesPerDay: number;
  freeRetakesPerPractice: number;
  freeVocabularyAiEnrichmentsPerDay: number;
  freePronunciationEvaluationsPerDay: number;
  freeConversationMinutesPerDay: number;
  freeListeningExercisesPerDay: number;
  freeGrammarLessonsPerDay: number;
  freeWritingCoachUsesPerDay: number;
  rewardedAdCreditAmount: number;
  rewardedAdMaxPerDay: number;
  practiceTimerSeconds: number;
};

const DEFAULTS: LimitsConfig = {
  freeAiEvaluationsPerMonth: 5,
  freeAiGeneratedPracticesPerDay: 2,
  freeRetakesPerPractice: 2,
  freeVocabularyAiEnrichmentsPerDay: 10,
  freePronunciationEvaluationsPerDay: 3,
  freeConversationMinutesPerDay: 5,
  freeListeningExercisesPerDay: 3,
  freeGrammarLessonsPerDay: 3,
  freeWritingCoachUsesPerDay: 3,
  rewardedAdCreditAmount: 1,
  rewardedAdMaxPerDay: 3,
  practiceTimerSeconds: 1500,
};

function getApiUrl(path: string) {
  return (import.meta.env.BASE_URL ?? "/admin").replace(/\/$/, "") + path;
}
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}` };
}

export default function LimitsPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<LimitsConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(getApiUrl("/api/admin/limits"), { headers: getAuthHeader() })
      .then((r) => r.json())
      .then((d: LimitsConfig) => setConfig({ ...DEFAULTS, ...d }))
      .catch(() => toast({ title: "Erro ao carregar limites", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(getApiUrl("/api/admin/limits"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(config),
      });
      if (!r.ok) throw new Error();
      toast({ title: "Limites salvos com sucesso" });
    } catch {
      toast({ title: "Erro ao salvar limites", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof LimitsConfig>(k: K, v: number) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const NumField = ({ field, label, description, suffix }: {
    field: keyof LimitsConfig; label: string; description?: string; suffix?: string;
  }) => (
    <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
      <div>
        <Label className="text-xs font-mono text-muted-foreground">{label}</Label>
        {description && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          value={config[field]}
          onChange={(e) => set(field, Number(e.target.value))}
          className="w-20 font-mono text-xs bg-muted/50 text-right"
        />
        {suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono flex items-center gap-2">
            <SlidersHorizontal className="h-7 w-7 text-purple-400" /> Limites Freemium
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controle o que usuários gratuitos podem usar por dia/mês.
          </p>
        </div>
        <Button onClick={save} disabled={saving || loading}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">IA e Práticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 divide-y divide-border">
              <NumField field="freeAiEvaluationsPerMonth" label="Avaliações de IA por mês" suffix="/mês" />
              <div className="pt-4">
                <NumField field="freeAiGeneratedPracticesPerDay" label="Práticas geradas por IA por dia" suffix="/dia" />
              </div>
              <div className="pt-4">
                <NumField field="freeRetakesPerPractice" label="Retentativas por prática" suffix="tentativas" />
              </div>
              <div className="pt-4">
                <NumField field="freeWritingCoachUsesPerDay" label="Usos do Writing Coach por dia" suffix="/dia" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">Vocabulário e Gramática</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 divide-y divide-border">
              <NumField field="freeVocabularyAiEnrichmentsPerDay" label="Enriquecimentos de vocabulário por IA" suffix="/dia" />
              <div className="pt-4">
                <NumField field="freeGrammarLessonsPerDay" label="Exercícios de gramática por dia" suffix="/dia" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">Pronúncia, Escuta e Conversação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 divide-y divide-border">
              <NumField field="freePronunciationEvaluationsPerDay" label="Avaliações de pronúncia por dia" suffix="/dia" />
              <div className="pt-4">
                <NumField field="freeListeningExercisesPerDay" label="Exercícios de escuta por dia" suffix="/dia" />
              </div>
              <div className="pt-4">
                <NumField field="freeConversationMinutesPerDay" label="Minutos de conversação por dia" suffix="min/dia" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">Ads com Recompensa</CardTitle>
              <CardDescription>Créditos ganhos ao assistir anúncios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 divide-y divide-border">
              <NumField field="rewardedAdCreditAmount" label="Créditos por anúncio assistido" suffix="créditos" />
              <div className="pt-4">
                <NumField field="rewardedAdMaxPerDay" label="Máx. anúncios por dia" suffix="/dia" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">Timer de Prática</CardTitle>
            </CardHeader>
            <CardContent>
              <NumField
                field="practiceTimerSeconds"
                label="Duração da prática"
                description="1500 = 25 minutos (padrão Celpe-Bras)"
                suffix="segundos"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
