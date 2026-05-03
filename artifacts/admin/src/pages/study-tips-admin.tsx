import { useState, useEffect } from "react";
import { Lightbulb, Plus, Trash2, Edit2, Save, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type Tip = { id: string; text: string; active: boolean; order: number };

const BLANK_TIP: Partial<Tip> = { text: "", active: true, order: 0 };

export default function StudyTipsAdminPage() {
  const { toast } = useToast();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTip, setEditTip] = useState<(Partial<Tip> & { id?: string }) | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<Tip[]>("/api/admin/study-tips");
      setTips(data);
    } catch { toast({ title: "Erro ao carregar", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editTip?.text?.trim()) return;
    try {
      if (editTip.id) {
        await adminSave(`/api/admin/study-tips/${editTip.id}`, editTip, "PUT");
      } else {
        await adminSave("/api/admin/study-tips", { ...editTip, order: tips.length }, "POST");
      }
      toast({ title: "Dica salva" });
      setEditTip(null); load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const del = async (id: string) => {
    if (!confirm("Excluir esta dica?")) return;
    try {
      await adminSave(`/api/admin/study-tips/${id}`, {}, "DELETE");
      toast({ title: "Dica excluída" }); load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const toggleActive = async (tip: Tip) => {
    try {
      await adminSave(`/api/admin/study-tips/${tip.id}`, { ...tip, active: !tip.active }, "PUT");
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const activeTips = tips.filter(t => t.active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-6 w-6 text-amber-400" />
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight">Dicas de Estudo</h1>
            <p className="text-sm text-muted-foreground">
              Pool de dicas exibidas diariamente no app — uma por dia, em rotação automática
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setEditTip({ ...BLANK_TIP })}>
          <Plus className="h-4 w-4 mr-1" /> Nova dica
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold font-mono">{tips.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total de dicas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold font-mono text-green-400">{activeTips.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ativas (em rotação)</p>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
        <strong>Como funciona:</strong> A dica exibida muda a cada dia com base no dia do mês (mod total de dicas ativas). Com {activeTips.length} dicas ativas, o ciclo completo é de {activeTips.length} dias.
      </div>

      {/* Edit form */}
      {editTip && (
        <Card className="border-primary">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-primary">{editTip.id ? "Editar dica" : "Nova dica"}</p>
            <div className="space-y-1">
              <Label className="text-xs">Texto da dica *</Label>
              <Textarea
                rows={3}
                placeholder="Ex: Leia textos autênticos em português todos os dias..."
                value={editTip.text ?? ""}
                onChange={e => setEditTip(p => ({ ...p!, text: e.target.value }))}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">{(editTip.text ?? "").length} / 200 caracteres</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editTip.active ?? true} onCheckedChange={v => setEditTip(p => ({ ...p!, active: v }))} />
              <Label className="text-xs">Ativa na rotação</Label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={!editTip.text?.trim()}>
                <Save className="h-3 w-3 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditTip(null)}>
                <X className="h-3 w-3 mr-1" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips list */}
      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="space-y-2">
          {tips.map((tip, idx) => (
            <Card key={tip.id} className={!tip.active ? "opacity-50" : ""}>
              <CardContent className="p-3 flex items-start gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-1 shrink-0" />
                <Switch checked={tip.active} onCheckedChange={() => toggleActive(tip)} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!tip.active ? "line-through text-muted-foreground" : ""}`}>{tip.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">Dica #{idx + 1}</Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${tip.active ? "border-green-500/30 text-green-400" : "border-muted text-muted-foreground"}`}
                    >
                      {tip.active ? "Em rotação" : "Inativa"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTip(tip)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => del(tip.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {tips.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma dica cadastrada ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}
