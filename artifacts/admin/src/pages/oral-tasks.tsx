import { useState, useEffect } from "react";
import { Mic, Plus, Trash2, Edit2, Save, X, PlusCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type OralTask = {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  durationSeconds: number;
  icon: string;
  color: string;
  order: number;
  active: boolean;
};

const BLANK: Omit<OralTask, "id"> = {
  title: "",
  description: "",
  instructions: [""],
  durationSeconds: 300,
  icon: "mic",
  color: "#D85A30",
  order: 0,
  active: true,
};

const ICON_OPTIONS = ["mic", "image", "message-circle", "tool", "book-open", "activity", "globe", "edit-3"];
const COLOR_OPTIONS = ["#185FA5", "#1D9E75", "#6B21A8", "#D85A30", "#BA7517"];

export default function OralTasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<OralTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Partial<OralTask> & { id?: string }) | null>(null);

  const load = async () => {
    setLoading(true);
    try { setTasks(await adminFetch<OralTask[]>("/api/admin/oral-tasks")); }
    catch { toast({ title: "Erro ao carregar tarefas", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title) return;
    try {
      if (editing.id) await adminSave(`/api/admin/oral-tasks/${editing.id}`, editing, "PUT");
      else await adminSave("/api/admin/oral-tasks", editing, "POST");
      toast({ title: "Tarefa salva" });
      setEditing(null);
      load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir tarefa?")) return;
    try {
      await adminSave(`/api/admin/oral-tasks/${id}`, {}, "DELETE");
      toast({ title: "Tarefa excluída" });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const updateInstruction = (idx: number, val: string) => {
    const instr = [...(editing?.instructions ?? [])];
    instr[idx] = val;
    setEditing(e => ({ ...e!, instructions: instr }));
  };
  const addInstruction = () => setEditing(e => ({ ...e!, instructions: [...(e?.instructions ?? []), ""] }));
  const removeInstruction = (idx: number) => setEditing(e => ({ ...e!, instructions: (e?.instructions ?? []).filter((_, i) => i !== idx) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mic className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Tarefas Orais</h1>
          <p className="text-sm text-muted-foreground">Gerencie as tarefas do simulador oral com instruções e timers</p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setEditing(BLANK)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
        </Button>
      </div>

      {editing && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{editing.id ? "Editar" : "Nova"} Tarefa Oral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Título *</Label>
                <Input value={editing.title ?? ""} placeholder="Ex: Tarefa Oral 1 — Narrativa"
                  onChange={e => setEditing(p => ({ ...p!, title: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Descrição</Label>
                <Input value={editing.description ?? ""} placeholder="Breve descrição do que o aluno deve fazer..."
                  onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Instruções</Label>
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={addInstruction}>
                  <PlusCircle className="h-3 w-3" /> Adicionar
                </Button>
              </div>
              {(editing.instructions ?? []).map((inst, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}.</span>
                  <Input className="h-8 flex-1 text-xs" value={inst}
                    onChange={e => updateInstruction(i, e.target.value)} />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0"
                    onClick={() => removeInstruction(i)}>
                    <MinusCircle className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Duração (seg)</Label>
                <Input type="number" value={editing.durationSeconds ?? 300}
                  onChange={e => setEditing(p => ({ ...p!, durationSeconds: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ícone (Feather)</Label>
                <Input value={editing.icon ?? "mic"} placeholder="mic"
                  onChange={e => setEditing(p => ({ ...p!, icon: e.target.value }))} />
                <p className="text-[10px] text-muted-foreground">
                  {ICON_OPTIONS.join(", ")}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cor</Label>
                <div className="flex gap-1 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} onClick={() => setEditing(p => ({ ...p!, color: c }))}
                      className={`w-6 h-6 rounded-full border-2 ${editing.color === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={editing.order ?? 0}
                  onChange={e => setEditing(p => ({ ...p!, order: parseInt(e.target.value) }))} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={editing.active ?? true} onCheckedChange={v => setEditing(p => ({ ...p!, active: v }))} />
              <Label className="text-xs">Ativa</Label>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={!editing.title}>
                <Save className="h-3 w-3 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                <X className="h-3 w-3 mr-1" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <Skeleton className="h-40 w-full" /> : (
        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: task.color + "20" }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: task.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{task.title}</p>
                      <Badge variant={task.active ? "default" : "secondary"} className="text-[10px]">
                        {task.active ? "Ativa" : "Inativa"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{task.durationSeconds}s</Badge>
                      <Badge variant="outline" className="text-[10px]">{task.icon}</Badge>
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                    {task.instructions.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{task.instructions.length} instruções</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(task)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(task.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <Mic className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhuma tarefa oral criada.</p>
              <p className="text-xs text-muted-foreground">As tarefas do app virão daqui quando criadas.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
