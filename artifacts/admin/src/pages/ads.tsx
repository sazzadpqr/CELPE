import { useState, useEffect } from "react";
import { Save, Megaphone, ToggleLeft, Smartphone, Globe, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type AdsConfig = {
  adsEnabled: boolean;
  webAdsEnabled: boolean;
  admobEnabled: boolean;
  rewardedAdsEnabled: boolean;
  hideAdsForPremium: boolean;
  adProvider: string;
  adsenseClientId: string;
  adsenseHomeSlotId: string;
  adsenseBottomSlotId: string;
  adsensePracticeSlotId: string;
  adsenseProfileSlotId: string;
  admobBannerAndroid: string;
  admobBannerIos: string;
  admobRewardedAndroid: string;
  admobRewardedIos: string;
  rewardedAdCreditAmount: number;
  rewardedAdMaxPerDay: number;
};

const DEFAULTS: AdsConfig = {
  adsEnabled: false,
  webAdsEnabled: false,
  admobEnabled: false,
  rewardedAdsEnabled: false,
  hideAdsForPremium: true,
  adProvider: "none",
  adsenseClientId: "",
  adsenseHomeSlotId: "",
  adsenseBottomSlotId: "",
  adsensePracticeSlotId: "",
  adsenseProfileSlotId: "",
  admobBannerAndroid: "",
  admobBannerIos: "",
  admobRewardedAndroid: "",
  admobRewardedIos: "",
  rewardedAdCreditAmount: 1,
  rewardedAdMaxPerDay: 3,
};

function deriveAdProvider(webEnabled: boolean, admobEnabled: boolean): string {
  if (webEnabled && admobEnabled) return "both";
  if (webEnabled) return "adsense";
  if (admobEnabled) return "admob";
  return "none";
}

export default function AdsPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AdsConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch<AdsConfig>("/api/admin/ads-config")
      .then((d) => setConfig({ ...DEFAULTS, ...d }))
      .catch(() => toast({ title: "Erro ao carregar configuração de anúncios", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const derived = deriveAdProvider(config.webAdsEnabled, config.admobEnabled);
      await adminSave("/api/admin/ads-config", { ...config, adProvider: derived });
      setConfig((c) => ({ ...c, adProvider: derived }));
      toast({ title: "Configuração de anúncios salva" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof AdsConfig>(k: K, v: AdsConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const SwitchRow = ({ field, label, description }: { field: keyof AdsConfig; label: string; description?: string }) => (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch
        checked={!!config[field]}
        onCheckedChange={(v) => set(field, v as AdsConfig[typeof field])}
      />
    </div>
  );

  const SlotField = ({ field, label }: { field: keyof AdsConfig; label: string }) => (
    <div className="space-y-1">
      <Label className="text-xs font-mono text-muted-foreground">{label}</Label>
      <Input
        placeholder="slot ID..."
        value={String(config[field])}
        onChange={(e) => set(field, e.target.value as AdsConfig[typeof field])}
        className="font-mono text-xs bg-muted/50"
      />
    </div>
  );

  const activeProviderCount = (config.webAdsEnabled ? 1 : 0) + (config.admobEnabled ? 1 : 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-orange-400" /> Controle de Anúncios
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Anúncios desabilitados por padrão. Nenhum ad aparece até você ativar aqui.
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
          {/* General Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <ToggleLeft className="h-4 w-4" /> Controles Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchRow field="adsEnabled" label="Anúncios Habilitados" description="Chave mestre — desativar esconde todos os ads globalmente." />
              <SwitchRow field="rewardedAdsEnabled" label="Anúncios com Recompensa" description="Usuário assiste e ganha créditos de IA." />
              <SwitchRow field="hideAdsForPremium" label="Ocultar Ads para Premium" description="Usuários premium nunca veem anúncios." />
            </CardContent>
          </Card>

          {/* Provider Selection — multi-active */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-orange-400" /> Provedores de Anúncios
                {activeProviderCount > 0 && (
                  <Badge variant="secondary" className="ml-auto font-mono text-xs">
                    {activeProviderCount} ativo{activeProviderCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Ative um ou mais provedores simultaneamente. Cada provedor opera de forma independente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* AdSense provider card */}
              <div
                className={`rounded-lg border p-4 transition-colors ${
                  config.webAdsEnabled
                    ? "border-blue-500/40 bg-blue-500/5"
                    : "border-border bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${config.webAdsEnabled ? "bg-blue-500/15" : "bg-muted"}`}>
                      <Globe className={`h-4 w-4 ${config.webAdsEnabled ? "text-blue-400" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Google AdSense</p>
                      <p className="text-xs text-muted-foreground">Anúncios web — exibidos no browser</p>
                    </div>
                  </div>
                  <Switch
                    checked={config.webAdsEnabled}
                    onCheckedChange={(v) => set("webAdsEnabled", v)}
                  />
                </div>
              </div>

              {/* AdMob provider card */}
              <div
                className={`rounded-lg border p-4 transition-colors ${
                  config.admobEnabled
                    ? "border-green-500/40 bg-green-500/5"
                    : "border-border bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${config.admobEnabled ? "bg-green-500/15" : "bg-muted"}`}>
                      <Smartphone className={`h-4 w-4 ${config.admobEnabled ? "text-green-400" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Google AdMob</p>
                      <p className="text-xs text-muted-foreground">Anúncios nativos — Android e iOS</p>
                    </div>
                  </div>
                  <Switch
                    checked={config.admobEnabled}
                    onCheckedChange={(v) => set("admobEnabled", v)}
                  />
                </div>
              </div>

              {activeProviderCount === 0 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  Nenhum provedor ativo. Ative ao menos um para exibir anúncios.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Rewarded Ads */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">Anúncios com Recompensa</CardTitle>
              <CardDescription>Créditos de IA concedidos por ad assistido.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">Créditos por Ad</Label>
                <Input type="number" min={1} max={10} value={config.rewardedAdCreditAmount}
                  onChange={(e) => set("rewardedAdCreditAmount", Number(e.target.value))}
                  className="font-mono text-xs bg-muted/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">Máx. por Dia</Label>
                <Input type="number" min={1} max={20} value={config.rewardedAdMaxPerDay}
                  onChange={(e) => set("rewardedAdMaxPerDay", Number(e.target.value))}
                  className="font-mono text-xs bg-muted/50" />
              </div>
            </CardContent>
          </Card>

          {/* AdSense Slots — shown only when AdSense is active */}
          <Card className={!config.webAdsEnabled ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-400" /> Google AdSense — Slots
                {!config.webAdsEnabled && (
                  <Badge variant="outline" className="ml-auto text-xs font-normal text-muted-foreground">
                    Inativo
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>IDs de slot para cada posição na web.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">Publisher Client ID</Label>
                <Input placeholder="ca-pub-..." value={config.adsenseClientId}
                  onChange={(e) => set("adsenseClientId", e.target.value)}
                  className="font-mono text-xs bg-muted/50" disabled={!config.webAdsEnabled} />
              </div>
              <SlotField field="adsenseHomeSlotId" label="Slot — Home (rodapé)" />
              <SlotField field="adsenseBottomSlotId" label="Slot — Inferior global" />
              <SlotField field="adsensePracticeSlotId" label="Slot — Antes/depois de Prática" />
              <SlotField field="adsenseProfileSlotId" label="Slot — Perfil" />
            </CardContent>
          </Card>

          {/* AdMob IDs — shown only when AdMob is active */}
          <Card className={!config.admobEnabled ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-400" /> AdMob — IDs de Unidade
                {!config.admobEnabled && (
                  <Badge variant="outline" className="ml-auto text-xs font-normal text-muted-foreground">
                    Inativo
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>IDs de anúncio para Android e iOS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SlotField field="admobBannerAndroid" label="Banner Android" />
              <SlotField field="admobBannerIos" label="Banner iOS" />
              <SlotField field="admobRewardedAndroid" label="Rewarded Android" />
              <SlotField field="admobRewardedIos" label="Rewarded iOS" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
