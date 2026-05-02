import { useState, useEffect } from "react";
import { Headphones, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type Resource = { id: string; title: string; source: string; description: string; url: string; icon: string; color: string; type: string; order: number; active: boolean };
type Tip = { id: string; text: string; order: number; active: boolean };

const BLANK_RESOURCE: Omit<Resource, "id"> = { title: "", source: "", description: "", url: "", icon: "headphones", color: "#185FA5", type: "podcast", order: 0, active: true };
const BLANK_TIP: Omit<Tip, "id"> = { text: "", order: 0, active: true };
const COLOR_OPTIONS = ["#185FA5", "#1D9E75", "#6B21A8", "#D85A30", "#BA7517"];
const ICON_OPTIONS = ["headphones", "radio", "tv", "mic", "music", "volume-2"];
const TYPE_OPTIONS = ["podcast", "video", "radio", "exercise"];

export default function ListeningContentPage() {
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"resources" | "tips">("resources");
  const [editResource, setEditResource] = useState<(Partial<Resource> & { id?: string }) | null>(null);
  const [editTip, setEditTip] = useState<(Partial<Tip> & { id?: string }) | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<{ resources: Resource[]; tips: Tip[] }>("/api/admin/listening");
      setResources(data.resources);
      setTips(data.tips);
    } catch { toast({ title: "Erro ao carregar", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveResource = async () => {
    if (!editResource?.title) return;
    try {
      if (editResource.id) await adminSave(`/api/admin/listening/resources/${editResource.id}`, editResource, "PUT");
      else await adminSave("/api/admin/listening/resources", editResource, "POST");
      toast({ title: "Recurso salvo" });
      setEditResource(null);
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const deleteResource = async (id: string) => {
    if (!confirm("Excluir recurso?")) return;
    try {
      await adminSave(`/api/admin/listening/resources/${id}`, {}, "DELETE");
      toast({ title: "Recurso excluído" });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const saveTip = async () => {
    if (!editTip?.text) return;
    try {
      if (editTip.id) await adminSave(`/api/admin/listening/tips/${editTip.id}`, editTip, "PUT");
      else await adminSave("/api/admin/listening/tips", editTip, "POST");
      toast({ title: "Dica salva" });
      setEditTip(null);
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const deleteTip = async (id: string) => {
    if (!confirm("Excluir dica?")) return;
    try {
      await adminSave(`/api/admin/listening/tips/${id}`, {}, "DELETE");
      toast({ title: "Dica excluída" });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Headphones className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Compreensão Auditiva</h1>
          <p className="text-sm text-muted-foreground">Recursos externos (podcast, rádio, vídeo) e dicas de estudo para escuta</p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => tab === "resources" ? setEditResource(BLANK_RESOURCE) : setEditTip(BLANK_TIP)}>
          <Plus className="h-4 w-4 mr-1" /> {tab === "resources" ? "Novo Recurso" : "Nova Dica"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {(["resources", "tips"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "resources" ? `Recursos (${resources.length})` : `Dicas (${tips.length})`}
          </button>
        ))}
      </div>

      {/* Resource editor */}
      {tab === "resources" && editResource && (
        <Card className="border-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{editResource.id ? "Editar" : "Novo"} Recurso</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Título *</Label>
                <Input value={editResource.title ?? ""} placeholder="Ex: Rádio MEC"
                  onChange={e => setEditResource(p => ({ ...p!, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fonte / Produtora</Label>
                <Input value={editResource.source ?? ""} placeholder="Ex: Rádio MEC"
                  onChange={e => setEditResource(p => ({ ...p!, source: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea rows={2} value={editResource.description ?? ""}
                onChange={e => setEditResource(p => ({ ...p!, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL *</Label>
              <Input value={editResource.url ?? ""} placeholder="https://..."
                onChange={e => setEditResource(p => ({ ...p!, url: e.target.value }))} />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={editResource.type ?? "podcast"} onValueChange={v => setEditResource(p => ({ ...p!, type: v }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ícone</Label>
                <Select value={editResource.icon ?? "headphones"} onValueChange={v => setEditResource(p => ({ ...p!, icon: v }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{ICON_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cor</Label>
                <div className="flex gap-1 pt-1">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} onClick={() => setEditResource(p => ({ ...p!, color: c }))}
                      className={`w-6 h-6 rounded-full border-2 ${editResource.color === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={editResource.active ?? true} onCheckedChange={v => setEditResource(p => ({ ...p!, active: v }))} />
                <Label className="text-xs">Ativo</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveResource} disabled={!editResource.title}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEditResource(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tip editor */}
      {tab === "tips" && editTip && (
        <Card className="border-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{editTip.id ? "Editar" : "Nova"} Dica</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Texto da dica *</Label>
              <Textarea rows={2} value={editTip.text ?? ""} placeholder="Ex: Ouça sem ver a transcrição primeiro..."
                onChange={e => setEditTip(p => ({ ...p!, text: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={editTip.order ?? 0}
                  onChange={e => setEditTip(p => ({ ...p!, order: parseInt(e.target.value) }))} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={editTip.active ?? true} onCheckedChange={v => setEditTip(p => ({ ...p!, active: v }))} />
                <Label className="text-xs">Ativa</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveTip} disabled={!editTip.text}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEditTip(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <Skeleton className="h-40 w-full" /> : (
        <div className="space-y-2">
          {tab === "resources" && (
            <>
              {resources.map((r, i) => (
                <Card key={r.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: r.color + "20" }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{r.title}</p>
                          <Badge variant={r.active ? "default" : "secondary"} className="text-[10px]">{r.active ? "Ativo" : "Inativo"}</Badge>
                          <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                          <Badge variant="outline" className="text-[10px]">{r.icon}</Badge>
                        </div>
                        {r.source && <p className="text-xs text-primary">{r.source}</p>}
                        {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
                        {r.url && <p className="text-[10px] text-muted-foreground truncate">{r.url}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditResource(r)}><Edit2 className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteResource(r.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {resources.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">Nenhum recurso adicionado ainda.</div>}
            </>
          )}
          {tab === "tips" && (
            <>
              {tips.map((t, i) => (
                <Card key={t.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0 mt-1">{i + 1}.</span>
                      <p className="flex-1 text-sm">{t.text}</p>
                      <Badge variant={t.active ? "default" : "secondary"} className="text-[10px] shrink-0">{t.active ? "Ativa" : "Inativa"}</Badge>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTip(t)}><Edit2 className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteTip(t.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {tips.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">Nenhuma dica adicionada ainda.</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
