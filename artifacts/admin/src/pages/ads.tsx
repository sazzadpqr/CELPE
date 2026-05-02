import { useState, useEffect } from "react";
import { Save, Megaphone, ToggleLeft, Smartphone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      await adminSave("/api/admin/ads-config", config);
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
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <ToggleLeft className="h-4 w-4" /> Controles Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchRow field="adsEnabled" label="Anúncios Habilitados" description="Chave mestre — desativar esconde todos os ads globalmente." />
              <SwitchRow field="webAdsEnabled" label="Anúncios Web (AdSense)" description="Exibir anúncios no browser." />
              <SwitchRow field="admobEnabled" label="AdMob (futuro nativo)" description="Scaffold para Android/iOS via Capacitor." />
              <SwitchRow field="rewardedAdsEnabled" label="Anúncios com Recompensa" description="Usuário assiste e ganha créditos de IA." />
              <SwitchRow field="hideAdsForPremium" label="Ocultar Ads para Premium" description="Usuários premium nunca veem anúncios." />
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-mono text-muted-foreground">Provedor de Anúncios</Label>
                <Select value={config.adProvider} onValueChange={(v) => set("adProvider", v)}>
                  <SelectTrigger className="font-mono text-xs bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="adsense">AdSense (web)</SelectItem>
                    <SelectItem value="admob">AdMob (nativo)</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-400" /> Google AdSense — Slots
              </CardTitle>
              <CardDescription>IDs de slot para cada posição na web.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">Publisher Client ID</Label>
                <Input placeholder="ca-pub-..." value={config.adsenseClientId}
                  onChange={(e) => set("adsenseClientId", e.target.value)}
                  className="font-mono text-xs bg-muted/50" />
              </div>
              <SlotField field="adsenseHomeSlotId" label="Slot — Home (rodapé)" />
              <SlotField field="adsenseBottomSlotId" label="Slot — Inferior global" />
              <SlotField field="adsensePracticeSlotId" label="Slot — Antes/depois de Prática" />
              <SlotField field="adsenseProfileSlotId" label="Slot — Perfil" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-400" /> AdMob — IDs de Unidade
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
