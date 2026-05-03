import { useState, useEffect } from "react";
import { CalendarDays, Plus, Trash2, Edit2, Save, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type Task = {
  id: string; title: string;
  type: "practice" | "vocab" | "reading" | "listening" | "grammar";
  durationMins: number; dayOfWeek: number; order: number; active: boolean;
};

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TYPE_COLORS: Record<string, string> = {
  practice: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  vocab: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  reading: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  listening: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  grammar: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};
const TYPE_LABELS: Record<string, string> = {
  practice: "Prática", vocab: "Vocabulário", reading: "Leitura", listening: "Escuta", grammar: "Gramática",
};

const BLANK_TASK: Partial<Task> = { title: "", type: "practice", durationMins: 20, dayOfWeek: 1, order: 0, active: true };

export default function StudyPlanAdminPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState<(Partial<Task> & { id?: string }) | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<Task[]>("/api/admin/study-tasks");
      setTasks(data);
    } catch { toast({ title: "Erro ao carregar tarefas", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editTask?.title) return;
    try {
      if (editTask.id) {
        await adminSave(`/api/admin/study-tasks/${editTask.id}`, editTask, "PUT");
      } else {
        await adminSave("/api/admin/study-tasks", editTask, "POST");
      }
      toast({ title: "Tarefa salva" });
      setEditTask(null); load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const del = async (id: string) => {
    if (!confirm("Excluir esta tarefa do plano?")) return;
    try {
      await adminSave(`/api/admin/study-tasks/${id}`, {}, "DELETE");
      toast({ title: "Tarefa excluída" }); load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const reset = async () => {
    if (!confirm("Restaurar o plano padrão? Todas as tarefas atuais serão substituídas.")) return;
    try {
      await adminSave("/api/admin/study-tasks/reset", {}, "POST");
      toast({ title: "Plano restaurado" }); load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const toggleActive = async (task: Task) => {
    try {
      await adminSave(`/api/admin/study-tasks/${task.id}`, { ...task, active: !task.active }, "PUT");
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const days = selectedDay !== null ? [selectedDay] : [1, 2, 3, 4, 5, 6, 0];
  const totalMins = tasks.filter(t => t.active).reduce((s, t) => s + t.durationMins, 0);
  const tasksByDay = (day: number) => tasks.filter(t => t.dayOfWeek === day).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight">Plano de Estudo</h1>
            <p className="text-sm text-muted-foreground">Gerencie as tarefas semanais padrão do app</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3 w-3 mr-1" /> Restaurar padrão
          </Button>
          <Button size="sm" onClick={() => setEditTask({ ...BLANK_TASK })}>
            <Plus className="h-4 w-4 mr-1" /> Nova tarefa
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total de tarefas", value: tasks.length },
          { label: "Tarefas ativas", value: tasks.filter(t => t.active).length },
          { label: "Minutos/semana", value: `${totalMins}m` },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Day filter */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={selectedDay === null ? "default" : "outline"} size="sm" onClick={() => setSelectedDay(null)}>Todos os dias</Button>
        {[1, 2, 3, 4, 5, 6, 0].map(d => (
          <Button key={d} variant={selectedDay === d ? "default" : "outline"} size="sm" onClick={() => setSelectedDay(d)}>
            {DAY_NAMES[d]}
            <span className="ml-1.5 text-xs opacity-60">({tasksByDay(d).length})</span>
          </Button>
        ))}
      </div>

      {/* Edit form */}
      {editTask && (
        <Card className="border-primary">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-primary">{editTask.id ? "Editar tarefa" : "Nova tarefa"}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Título *</Label>
                <Input value={editTask.title ?? ""} onChange={e => setEditTask(p => ({ ...p!, title: e.target.value }))} placeholder="Ex: Praticar Tarefa 3" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={editTask.type ?? "practice"} onValueChange={v => setEditTask(p => ({ ...p!, type: v as Task["type"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dia da semana</Label>
                <Select value={String(editTask.dayOfWeek ?? 1)} onValueChange={v => setEditTask(p => ({ ...p!, dayOfWeek: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,0].map(d => <SelectItem key={d} value={String(d)}>{DAY_NAMES[d]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duração (min)</Label>
                <Input type="number" min={5} max={120} value={editTask.durationMins ?? 20} onChange={e => setEditTask(p => ({ ...p!, durationMins: parseInt(e.target.value) || 20 }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editTask.active ?? true} onCheckedChange={v => setEditTask(p => ({ ...p!, active: v }))} />
              <Label className="text-xs">Ativa</Label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEditTask(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks by day */}
      {loading ? <Skeleton className="h-60 w-full" /> : (
        <div className="space-y-4">
          {days.map(day => {
            const dayTasks = tasksByDay(day);
            return (
              <div key={day}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold font-mono text-muted-foreground uppercase tracking-wider">
                    {DAY_NAMES[day]}
                    <span className="ml-2 text-xs text-muted-foreground/50 normal-case font-normal">
                      {dayTasks.filter(t => t.active).reduce((s, t) => s + t.durationMins, 0)}m · {dayTasks.length} tarefas
                    </span>
                  </h2>
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 text-[10px] text-muted-foreground"
                    onClick={() => setEditTask({ ...BLANK_TASK, dayOfWeek: day })}
                  >
                    <Plus className="h-3 w-3 mr-0.5" /> Adicionar
                  </Button>
                </div>
                {dayTasks.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                    Dia de descanso — sem tarefas
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayTasks.map(task => (
                      <Card key={task.id} className={!task.active ? "opacity-50" : ""}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <Switch checked={task.active} onCheckedChange={() => toggleActive(task)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-medium ${!task.active ? "line-through" : ""}`}>{task.title}</p>
                              <Badge variant="outline" className={`text-[10px] border ${TYPE_COLORS[task.type]}`}>
                                {TYPE_LABELS[task.type]}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{task.durationMins} min</p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTask(task)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => del(task.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
