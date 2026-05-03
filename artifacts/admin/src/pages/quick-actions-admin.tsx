import { useState, useEffect } from "react";
import { Zap, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type QuickAction = {
  id: string; label: string; icon: string; color: string;
  route: string; desc: string; order: number; active: boolean;
};

export default function QuickActionsAdminPage() {
  const { toast } = useToast();
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<QuickAction>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<QuickAction[]>("/api/admin/quick-actions");
      setActions(data);
    } catch { toast({ title: "Erro ao carregar", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveAll = async () => {
    setSaving(true);
    try {
      await adminSave("/api/admin/quick-actions", actions);
      toast({ title: "Ações salvas" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const saveOne = async (action: QuickAction) => {
    try {
      await adminSave(`/api/admin/quick-actions/${action.id}`, action, "PUT");
      toast({ title: "Ação atualizada" });
      setEditingId(null); load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const toggle = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = actions.findIndex(a => a.id === id);
    if (idx < 0) return;
    const next = [...actions];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    next.forEach((a, i) => { a.order = i; });
    setActions(next);
  };

  const activeCount = actions.filter(a => a.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight">Ações Rápidas</h1>
            <p className="text-sm text-muted-foreground">
              Grid de atalhos de estudo exibido na tela do Plano — configure visibilidade e ordem
            </p>
          </div>
        </div>
        <Button size="sm" onClick={saveAll} disabled={saving}>
          <Save className="h-3 w-3 mr-1" /> {saving ? "Salvando..." : "Salvar ordem e visibilidade"}
        </Button>
      </div>

      {/* Info */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs text-primary">
        <strong>Dica:</strong> Use os botões ↑ ↓ para reordenar e o toggle para mostrar/ocultar cada ação. Clique em "Editar" para mudar o label e descrição. Clique em "Salvar ordem" para persistir.
        <span className="ml-2 text-muted-foreground">{activeCount}/{actions.length} ativas</span>
      </div>

      {/* Actions */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="space-y-2">
          {actions.map((action, idx) => (
            <Card key={action.id} className={!action.active ? "opacity-50" : ""}>
              <CardContent className="p-3">
                {editingId === action.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input value={draft.label ?? ""} onChange={e => setDraft(p => ({ ...p, label: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descrição curta</Label>
                        <Input value={draft.desc ?? ""} onChange={e => setDraft(p => ({ ...p, desc: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Cor (hex)</Label>
                        <div className="flex gap-2">
                          <input type="color" value={draft.color ?? "#000"} onChange={e => setDraft(p => ({ ...p, color: e.target.value }))} className="w-10 h-9 rounded border border-input cursor-pointer" />
                          <Input value={draft.color ?? ""} onChange={e => setDraft(p => ({ ...p, color: e.target.value }))} className="font-mono text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ícone (Feather)</Label>
                        <Input value={draft.icon ?? ""} onChange={e => setDraft(p => ({ ...p, icon: e.target.value }))} placeholder="ex: edit-3" className="font-mono text-xs" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveOne({ ...action, ...draft })}>
                        <Save className="h-3 w-3 mr-1" /> Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => move(action.id, -1)} disabled={idx === 0} className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 text-xs leading-none">▲</button>
                      <button onClick={() => move(action.id, 1)} disabled={idx === actions.length - 1} className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 text-xs leading-none">▼</button>
                    </div>
                    <Switch checked={action.active} onCheckedChange={() => toggle(action.id)} />
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold"
                      style={{ backgroundColor: action.color + "25", color: action.color }}
                    >
                      {action.order + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: action.color }}>{action.label}</p>
                        <Badge variant="outline" className="text-[10px] font-mono">{action.route}</Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">{action.icon}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {action.active
                        ? <Eye className="h-3.5 w-3.5 text-green-400" />
                        : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingId(action.id); setDraft(action); }}>Editar</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
