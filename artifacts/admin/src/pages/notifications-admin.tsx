import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Edit2, Save, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type Campaign = {
  id: string; title: string; body: string; type: string; targetType: string;
  targetLevel: string | null; deepLink: string; externalUrl: string;
  sendInApp: boolean; sendPush: boolean; status: string;
  scheduledAt: string | null; sentAt: string | null;
  targetedCount: number; inAppCreatedCount: number; createdAt: string;
};

const BLANK: Omit<Campaign, "id" | "status" | "sentAt" | "targetedCount" | "inAppCreatedCount" | "createdAt"> = {
  title: "", body: "", type: "general", targetType: "all", targetLevel: null,
  deepLink: "", externalUrl: "", sendInApp: true, sendPush: false, scheduledAt: null,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500", scheduled: "bg-yellow-500", sending: "bg-blue-500",
  sent: "bg-green-500", failed: "bg-red-500", cancelled: "bg-gray-400",
};

export default function NotificationsAdminPage() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<(Partial<Campaign> & { id?: string }) | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setCampaigns(await adminFetch<Campaign[]>("/api/admin/notification-campaigns"));
    } catch { toast({ title: "Erro ao carregar campanhas", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit?.title || !edit?.body) { toast({ title: "Título e mensagem são obrigatórios", variant: "destructive" }); return; }
    try {
      if (edit.id) await adminSave(`/api/admin/notification-campaigns/${edit.id}`, edit, "PUT");
      else await adminSave("/api/admin/notification-campaigns", edit, "POST");
      toast({ title: "Campanha salva" });
      setEdit(null);
      load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const del = async (id: string) => {
    if (!confirm("Excluir campanha?")) return;
    try {
      await adminSave(`/api/admin/notification-campaigns/${id}`, {}, "DELETE");
      toast({ title: "Campanha excluída" });
      load();
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const sendNow = async (c: Campaign) => {
    if (!confirm(`Enviar "${c.title}" para usuários ${c.targetType === "all" ? "de todos os perfis" : c.targetType}?`)) return;
    setSending(c.id);
    try {
      const result = await adminSave<{ targeted: number; inAppCreated: number }>(`/api/admin/notification-campaigns/${c.id}/send`, {}, "POST");
      toast({ title: `Enviado! ${result.inAppCreated}/${result.targeted} notificações in-app criadas.` });
      load();
    } catch { toast({ title: "Erro ao enviar", variant: "destructive" }); }
    finally { setSending(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Notificações Push</h1>
          <p className="text-sm text-muted-foreground">Crie e envie notificações in-app e push para usuários</p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setEdit(BLANK)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Campanha
        </Button>
      </div>

      {edit && (
        <Card className="border-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{edit.id ? "Editar" : "Nova"} Campanha</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Título *</Label>
                <Input value={edit.title ?? ""} onChange={e => setEdit(c => ({ ...c!, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={edit.type ?? "general"} onValueChange={v => setEdit(c => ({ ...c!, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["general","study_reminder","update","premium","warning","exam","vocab","course","practice"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mensagem *</Label>
              <Textarea rows={3} value={edit.body ?? ""} onChange={e => setEdit(c => ({ ...c!, body: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Público-alvo</Label>
                <Select value={edit.targetType ?? "all"} onValueChange={v => setEdit(c => ({ ...c!, targetType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    <SelectItem value="premium">Usuários premium</SelectItem>
                    <SelectItem value="free">Usuários gratuitos</SelectItem>
                    <SelectItem value="level">Por nível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {edit.targetType === "level" && (
                <div className="space-y-1">
                  <Label className="text-xs">Nível</Label>
                  <Select value={edit.targetLevel ?? "B1"} onValueChange={v => setEdit(c => ({ ...c!, targetLevel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["A2","B1","B2","C1"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Deep Link (rota interna)</Label>
                <Input value={edit.deepLink ?? ""} placeholder="/practice" onChange={e => setEdit(c => ({ ...c!, deepLink: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Agendar envio (opcional)</Label>
                <Input type="datetime-local" value={edit.scheduledAt?.slice(0, 16) ?? ""} onChange={e => setEdit(c => ({ ...c!, scheduledAt: e.target.value || null }))} />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={edit.sendInApp ?? true} onCheckedChange={v => setEdit(c => ({ ...c!, sendInApp: v }))} />
                <Label className="text-xs">In-App</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={edit.sendPush ?? false} onCheckedChange={v => setEdit(c => ({ ...c!, sendPush: v }))} />
                <Label className="text-xs">Push (requer VAPID)</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEdit(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <Skeleton className="h-40 w-full" /> : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-500"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{c.title}</p>
                    <Badge variant={c.status === "sent" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.targetType}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.body}</p>
                  {c.sentAt && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Enviado: {new Date(c.sentAt).toLocaleString("pt-BR")} — {c.inAppCreatedCount}/{c.targetedCount} in-app
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  {c.status === "draft" && (
                    <Button size="sm" variant="default" className="h-7 text-xs" disabled={sending === c.id} onClick={() => sendNow(c)}>
                      <Send className="h-3 w-3 mr-1" /> Enviar
                    </Button>
                  )}
                  {c.status !== "sent" && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEdit(c)}><Edit2 className="h-3 w-3" /></Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => del(c.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {campaigns.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma campanha criada ainda.</p>}
        </div>
      )}
    </div>
  );
}
