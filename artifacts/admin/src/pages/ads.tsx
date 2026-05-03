import { useState, useEffect } from "react";
import {
  Save, Megaphone, ToggleLeft, Smartphone, Globe, CheckSquare,
  Zap, Layers, PlayCircle, Gift, Star, LayoutGrid, Video,
} from "lucide-react";
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
  bannerEnabled: boolean;
  appOpenEnabled: boolean;
  interstitialEnabled: boolean;
  rewardedInterstitialEnabled: boolean;
  nativeEnabled: boolean;
  admobAppOpenAndroid: string;
  admobAppOpenIos: string;
  admobInterstitialAndroid: string;
  admobInterstitialIos: string;
  admobRewardedInterstitialAndroid: string;
  admobRewardedInterstitialIos: string;
  admobNativeAndroid: string;
  admobNativeIos: string;
  interstitialFrequencyCapPerDay: number;
  appOpenFrequencyCapHours: number;
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
  bannerEnabled: false,
  appOpenEnabled: false,
  interstitialEnabled: false,
  rewardedInterstitialEnabled: false,
  nativeEnabled: false,
  admobAppOpenAndroid: "",
  admobAppOpenIos: "",
  admobInterstitialAndroid: "",
  admobInterstitialIos: "",
  admobRewardedInterstitialAndroid: "",
  admobRewardedInterstitialIos: "",
  admobNativeAndroid: "",
  admobNativeIos: "",
  interstitialFrequencyCapPerDay: 2,
  appOpenFrequencyCapHours: 4,
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

  const SwitchRow = ({
    field, label, description,
  }: { field: keyof AdsConfig; label: string; description?: string }) => (
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

  const UnitIdPair = ({
    androidField, iosField, label,
  }: { androidField: keyof AdsConfig; iosField: keyof AdsConfig; label: string }) => (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-mono text-muted-foreground">Android</Label>
          <Input
            placeholder="ca-app-pub-..."
            value={String(config[androidField])}
            onChange={(e) => set(androidField, e.target.value as AdsConfig[typeof androidField])}
            className="font-mono text-xs bg-muted/50"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-mono text-muted-foreground">iOS</Label>
          <Input
            placeholder="ca-app-pub-..."
            value={String(config[iosField])}
            onChange={(e) => set(iosField, e.target.value as AdsConfig[typeof iosField])}
            className="font-mono text-xs bg-muted/50"
          />
        </div>
      </div>
    </div>
  );

  const AdFormatCard = ({
    icon: Icon, title, description, enableField, color,
    children,
  }: {
    icon: React.ElementType; title: string; description: string;
    enableField: keyof AdsConfig; color: string; children: React.ReactNode;
  }) => {
    const enabled = !!config[enableField];
    return (
      <div className={`rounded-lg border p-4 space-y-4 transition-colors ${enabled ? `border-${color}-500/40 bg-${color}-500/5` : "border-border bg-muted/20"}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${enabled ? `bg-${color}-500/15` : "bg-muted"}`}>
              <Icon className={`h-4 w-4 ${enabled ? `text-${color}-400` : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => set(enableField, v as AdsConfig[typeof enableField])}
          />
        </div>
        {enabled && <div className="space-y-3 pt-1 border-t border-border/40">{children}</div>}
      </div>
    );
  };

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
        <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
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
              <SwitchRow field="hideAdsForPremium" label="Ocultar Ads para Premium" description="Usuários premium nunca veem anúncios." />
            </CardContent>
          </Card>

          {/* Provider Selection */}
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
              <CardDescription>Ative um ou mais provedores simultaneamente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={`rounded-lg border p-4 transition-colors ${config.webAdsEnabled ? "border-blue-500/40 bg-blue-500/5" : "border-border bg-muted/20"}`}>
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
                  <Switch checked={config.webAdsEnabled} onCheckedChange={(v) => set("webAdsEnabled", v)} />
                </div>
              </div>
              <div className={`rounded-lg border p-4 transition-colors ${config.admobEnabled ? "border-green-500/40 bg-green-500/5" : "border-border bg-muted/20"}`}>
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
                  <Switch checked={config.admobEnabled} onCheckedChange={(v) => set("admobEnabled", v)} />
                </div>
              </div>
              {activeProviderCount === 0 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  Nenhum provedor ativo.
                </p>
              )}
            </CardContent>
          </Card>

          {/* AdMob Format Cards — only shown when AdMob is active */}
          <Card className={!config.admobEnabled ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-400" /> AdMob — Formatos de Anúncio
                {!config.admobEnabled && (
                  <Badge variant="outline" className="ml-auto text-xs font-normal text-muted-foreground">Inativo</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Configure e ative cada formato individualmente. IDs de teste do Google são usados quando o campo está vazio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* App Open */}
              <AdFormatCard
                icon={Zap} title="App Open" enableField="appOpenEnabled" color="yellow"
                description="Exibido ao abrir o app — apenas 1 vez por sessão de N horas."
              >
                <UnitIdPair androidField="admobAppOpenAndroid" iosField="admobAppOpenIos" label="Unit IDs — App Open" />
                <div className="space-y-1">
                  <Label className="text-xs font-mono text-muted-foreground">Frequência (horas entre exibições)</Label>
                  <Input type="number" min={1} max={24} value={config.appOpenFrequencyCapHours}
                    onChange={(e) => set("appOpenFrequencyCapHours", Number(e.target.value))}
                    className="font-mono text-xs bg-muted/50 w-24" />
                </div>
              </AdFormatCard>

              {/* Adaptive Banner */}
              <AdFormatCard
                icon={Layers} title="Banner (Adaptativo + Fixo)" enableField="bannerEnabled" color="blue"
                description="Rodapé de telas — sempre visível, não interrompe o uso."
              >
                <UnitIdPair androidField="admobBannerAndroid" iosField="admobBannerIos" label="Unit IDs — Banner" />
              </AdFormatCard>

              {/* Interstitial */}
              <AdFormatCard
                icon={PlayCircle} title="Interstitial (Tela Cheia)" enableField="interstitialEnabled" color="purple"
                description="Exibido após completar uma sessão de prática — nunca durante o estudo."
              >
                <UnitIdPair androidField="admobInterstitialAndroid" iosField="admobInterstitialIos" label="Unit IDs — Interstitial" />
                <div className="space-y-1">
                  <Label className="text-xs font-mono text-muted-foreground">Máx. por dia</Label>
                  <Input type="number" min={1} max={10} value={config.interstitialFrequencyCapPerDay}
                    onChange={(e) => set("interstitialFrequencyCapPerDay", Number(e.target.value))}
                    className="font-mono text-xs bg-muted/50 w-24" />
                </div>
              </AdFormatCard>

              {/* Rewarded */}
              <AdFormatCard
                icon={Gift} title="Rewarded (Recompensa)" enableField="rewardedAdsEnabled" color="green"
                description="Usuário assiste voluntariamente e ganha créditos de IA. Nunca forçado."
              >
                <UnitIdPair androidField="admobRewardedAndroid" iosField="admobRewardedIos" label="Unit IDs — Rewarded" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-mono text-muted-foreground">Créditos por ad</Label>
                    <Input type="number" min={1} max={10} value={config.rewardedAdCreditAmount}
                      onChange={(e) => set("rewardedAdCreditAmount", Number(e.target.value))}
                      className="font-mono text-xs bg-muted/50" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-mono text-muted-foreground">Máx. por dia</Label>
                    <Input type="number" min={1} max={20} value={config.rewardedAdMaxPerDay}
                      onChange={(e) => set("rewardedAdMaxPerDay", Number(e.target.value))}
                      className="font-mono text-xs bg-muted/50" />
                  </div>
                </div>
              </AdFormatCard>

              {/* Rewarded Interstitial */}
              <AdFormatCard
                icon={Star} title="Rewarded Interstitial" enableField="rewardedInterstitialEnabled" color="orange"
                description="Oferta opcional antes de iniciar prática — usuário pode pular."
              >
                <UnitIdPair androidField="admobRewardedInterstitialAndroid" iosField="admobRewardedInterstitialIos" label="Unit IDs — Rewarded Interstitial" />
              </AdFormatCard>

              {/* Native */}
              <AdFormatCard
                icon={LayoutGrid} title="Native + Native Video" enableField="nativeEnabled" color="teal"
                description="Anúncios que se integram ao design da lista de cursos — a cada 5 itens."
              >
                <UnitIdPair androidField="admobNativeAndroid" iosField="admobNativeIos" label="Unit IDs — Native" />
                <p className="text-xs text-muted-foreground">
                  Native Video é servido automaticamente dentro do mesmo unit ID nativo pelo AdMob.
                </p>
              </AdFormatCard>

            </CardContent>
          </Card>

          {/* AdSense Slots */}
          <Card className={!config.webAdsEnabled ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-400" /> Google AdSense — Slots Web
                {!config.webAdsEnabled && (
                  <Badge variant="outline" className="ml-auto text-xs font-normal text-muted-foreground">Inativo</Badge>
                )}
              </CardTitle>
              <CardDescription>IDs de slot para cada posição na versão web.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">Publisher Client ID</Label>
                <Input placeholder="ca-pub-..." value={config.adsenseClientId}
                  onChange={(e) => set("adsenseClientId", e.target.value)}
                  className="font-mono text-xs bg-muted/50" disabled={!config.webAdsEnabled} />
              </div>
              {(["adsenseHomeSlotId", "adsenseBottomSlotId", "adsensePracticeSlotId", "adsenseProfileSlotId"] as (keyof AdsConfig)[]).map((field) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs font-mono text-muted-foreground">
                    {field === "adsenseHomeSlotId" ? "Slot — Home" :
                     field === "adsenseBottomSlotId" ? "Slot — Inferior global" :
                     field === "adsensePracticeSlotId" ? "Slot — Prática" : "Slot — Perfil"}
                  </Label>
                  <Input placeholder="slot ID..." value={String(config[field])}
                    onChange={(e) => set(field, e.target.value as AdsConfig[typeof field])}
                    className="font-mono text-xs bg-muted/50" disabled={!config.webAdsEnabled} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
