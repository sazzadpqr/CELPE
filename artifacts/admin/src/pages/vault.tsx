import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, KeyRound, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminFetch, adminSave } from "@/lib/adminClient";

type VaultConfig = {
  openaiModel: string;
  paddleEnv: string;
  paddleApiKey: string;
  paddleMonthlyPriceId: string;
  paddleYearlyPriceId: string;
  paddleWebhookSecret: string;
  resendApiKey: string;
  sessionSecret: string;
  admobAndroidAppId: string;
  admobIosAppId: string;
  aboutUrl: string;
};

const DEFAULTS: VaultConfig = {
  openaiModel: "gpt-4o",
  paddleEnv: "sandbox",
  paddleApiKey: "",
  paddleMonthlyPriceId: "",
  paddleYearlyPriceId: "",
  paddleWebhookSecret: "",
  resendApiKey: "",
  sessionSecret: "",
  admobAndroidAppId: "",
  admobIosAppId: "",
  aboutUrl: "",
};

export default function Vault() {
  const { toast } = useToast();
  const [config, setConfig] = useState<VaultConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    adminFetch<VaultConfig>("/api/admin/vault")
      .then((d) => setConfig({ ...DEFAULTS, ...d }))
      .catch(() => toast({ title: "Erro ao carregar vault", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminSave("/api/admin/vault", config);
      toast({ title: "Vault salvo com sucesso" });
    } catch {
      toast({ title: "Erro ao salvar vault", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (field: string) => setVisible((v) => ({ ...v, [field]: !v[field] }));
  const set = (field: keyof VaultConfig, value: string) => setConfig((c) => ({ ...c, [field]: value }));

  const SecretField = ({ field, label, placeholder }: { field: keyof VaultConfig; label: string; placeholder?: string }) => (
    <div className="space-y-2">
      <Label className="text-xs font-mono text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type={visible[field] ? "text" : "password"}
          placeholder={placeholder ?? "••••••••"}
          value={config[field]}
          onChange={(e) => set(field, e.target.value)}
          className="pr-10 font-mono text-xs bg-muted/50 border-muted-foreground/20"
        />
        <button
          type="button"
          onClick={() => toggle(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {visible[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono flex items-center gap-2">
            <Shield className="h-7 w-7 text-yellow-500" /> API Vault
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Chaves secretas e integrações externas. Valores em branco não sobrescrevem a chave existente.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-emerald-500" /> OpenAI / IA
              </CardTitle>
              <CardDescription>Modelo e configuração da IA de avaliação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Modelo OpenAI</Label>
                <Select value={config.openaiModel} onValueChange={(v) => set("openaiModel", v)}>
                  <SelectTrigger className="font-mono text-xs bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                    <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-500" /> Paddle — Pagamentos
              </CardTitle>
              <CardDescription>Integração de assinaturas e webhooks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Ambiente</Label>
                <Select value={config.paddleEnv} onValueChange={(v) => set("paddleEnv", v)}>
                  <SelectTrigger className="font-mono text-xs bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SecretField field="paddleApiKey" label="API Key" placeholder="pdl_live_..." />
              <SecretField field="paddleMonthlyPriceId" label="Price ID — Mensal" placeholder="pri_..." />
              <SecretField field="paddleYearlyPriceId" label="Price ID — Anual" placeholder="pri_..." />
              <SecretField field="paddleWebhookSecret" label="Webhook Secret" placeholder="pdlntfy_..." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-purple-500" /> Resend — E-mail / OTP
              </CardTitle>
              <CardDescription>Envio de e-mails transacionais e OTP.</CardDescription>
            </CardHeader>
            <CardContent>
              <SecretField field="resendApiKey" label="Resend API Key" placeholder="re_..." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-orange-500" /> AdMob — App IDs
              </CardTitle>
              <CardDescription>IDs de aplicativo para Android e iOS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">AdMob App ID — Android</Label>
                <Input
                  placeholder="ca-app-pub-..."
                  value={config.admobAndroidAppId}
                  onChange={(e) => set("admobAndroidAppId", e.target.value)}
                  className="font-mono text-xs bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">AdMob App ID — iOS</Label>
                <Input
                  placeholder="ca-app-pub-..."
                  value={config.admobIosAppId}
                  onChange={(e) => set("admobIosAppId", e.target.value)}
                  className="font-mono text-xs bg-muted/50"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-sky-500" /> App — Sobre / About
              </CardTitle>
              <CardDescription>Link externo exibido na opção "Sobre o app" no perfil do usuário no app.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">URL da página "Sobre o app"</Label>
                <Input
                  placeholder="https://seusite.com/sobre"
                  value={config.aboutUrl}
                  onChange={(e) => set("aboutUrl", e.target.value)}
                  className="font-mono text-xs bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Quando o usuário tocar em "Sobre o app" no perfil, este link será aberto no navegador externo. Se vazio, exibe uma mensagem padrão.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-red-500" /> Sessão Admin
              </CardTitle>
              <CardDescription>Segredo de sessão. Prefira usar a aba Config → Alterar Senha.</CardDescription>
            </CardHeader>
            <CardContent>
              <SecretField field="sessionSecret" label="SESSION_SECRET (referência)" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
