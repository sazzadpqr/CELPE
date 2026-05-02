import { useState, useEffect } from "react";
import { Megaphone, Plus, Trash2, Edit2, Save, X } from "lucide-react";
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

type Banner = {
  id: string; title: string; body: string; type: string;
  ctaLabel: string; ctaUrl: string; audience: string;
  active: boolean; startsAt: string | null; endsAt: string | null; order: number;
};

const BLANK: Omit<Banner, "id"> = {
  title: "", body: "", type: "info", ctaLabel: "", ctaUrl: "",
  audience: "all", active: false, startsAt: null, endsAt: null, order: 0,
};

const TYPE_COLORS: Record<string, string> = {
  info: "bg-blue-500", warning: "bg-yellow-500", success: "bg-green-500",
  promo: "bg-purple-500", update: "bg-cyan-500",
};

export default function BannersPage() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<(Partial<Banner> & { id?: string }) | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setBanners(await adminFetch<Banner[]>("/api/admin/banners"));
    } catch { toast({ title: "Erro ao carregar banners", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit?.title) return;
    try {
      if (edit.id) await adminSave(`/api/admin/banners/${edit.id}`, edit, "PUT");
      else await adminSave("/api/admin/banners", edit, "POST");
      toast({ title: "Banner salvo" });
      setEdit(null);
      load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const del = async (id: string) => {
    if (!confirm("Excluir banner?")) return;
    try {
      await adminSave(`/api/admin/banners/${id}`, {}, "DELETE");
      toast({ title: "Banner excluído" });
      load();
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const quickToggle = async (b: Banner) => {
    try {
      await adminSave(`/api/admin/banners/${b.id}`, { ...b, active: !b.active }, "PUT");
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Banners do App</h1>
          <p className="text-sm text-muted-foreground">Banners de aviso, promoção e atualização para usuários</p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setEdit(BLANK)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Banner
        </Button>
      </div>

      {edit && (
        <Card className="border-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{edit.id ? "Editar" : "Novo"} Banner</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Título *</Label>
                <Input value={edit.title ?? ""} onChange={e => setEdit(b => ({ ...b!, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={edit.type ?? "info"} onValueChange={v => setEdit(b => ({ ...b!, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["info","warning","success","promo","update"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mensagem</Label>
              <Textarea rows={2} value={edit.body ?? ""} onChange={e => setEdit(b => ({ ...b!, body: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Texto do botão (CTA)</Label>
                <Input value={edit.ctaLabel ?? ""} placeholder="Saiba mais" onChange={e => setEdit(b => ({ ...b!, ctaLabel: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">URL do botão</Label>
                <Input value={edit.ctaUrl ?? ""} placeholder="https://..." onChange={e => setEdit(b => ({ ...b!, ctaUrl: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Público-alvo</Label>
                <Select value={edit.audience ?? "all"} onValueChange={v => setEdit(b => ({ ...b!, audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="free">Gratuitos</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Início</Label>
                <Input type="datetime-local" value={edit.startsAt?.slice(0, 16) ?? ""} onChange={e => setEdit(b => ({ ...b!, startsAt: e.target.value || null }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fim</Label>
                <Input type="datetime-local" value={edit.endsAt?.slice(0, 16) ?? ""} onChange={e => setEdit(b => ({ ...b!, endsAt: e.target.value || null }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={edit.order ?? 0} onChange={e => setEdit(b => ({ ...b!, order: parseInt(e.target.value) }))} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={edit.active ?? false} onCheckedChange={v => setEdit(b => ({ ...b!, active: v }))} />
                <Label className="text-xs">Ativo</Label>
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
          {banners.map(b => (
            <Card key={b.id} className={b.active ? "border-primary/30" : ""}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${TYPE_COLORS[b.type] ?? "bg-gray-500"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{b.title}</p>
                    <Badge variant={b.active ? "default" : "secondary"} className="text-[10px]">{b.active ? "Ativo" : "Inativo"}</Badge>
                    <Badge variant="outline" className="text-[10px]">{b.type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{b.audience}</Badge>
                  </div>
                  {b.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.body}</p>}
                  {(b.startsAt || b.endsAt) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {b.startsAt ? `De: ${new Date(b.startsAt).toLocaleString("pt-BR")}` : ""}
                      {b.endsAt ? ` | Até: ${new Date(b.endsAt).toLocaleString("pt-BR")}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={b.active} onCheckedChange={() => quickToggle(b)} />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEdit(b)}><Edit2 className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => del(b.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {banners.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhum banner criado. Clique em "Novo Banner" para adicionar.</p>}
        </div>
      )}
    </div>
  );
}
