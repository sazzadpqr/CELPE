import {
  useListAdminExams,
  getListAdminExamsQueryKey,
  useCreateAdminExam,
  useUpdateAdminExam,
  useDeleteAdminExam,
  type ExamEdition,
  type ExamEditionBody,
  type ExamTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit, Trash2, X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EMPTY_TASK: Omit<ExamTask, "id"> = { type: "Tarefa 1", title: "", genre: "", description: "", order: 1 };

function makeEmptyExam(order: number): ExamEditionBody {
  return {
    year: new Date().getFullYear(),
    edition: "",
    title: "",
    description: "",
    tasks: [],
    active: true,
    order,
  };
}

const TASK_COLORS: Record<string, string> = {
  "Tarefa 1": "#185FA5", "Tarefa 2": "#1D9E75",
  "Tarefa 3": "#6B21A8", "Tarefa 4": "#BA7517", "Link Externo": "#D85A30",
};

export default function ExamsAdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: exams, isLoading } = useListAdminExams({ query: { queryKey: getListAdminExamsQueryKey() } });

  const createExam = useCreateAdminExam();
  const updateExam = useUpdateAdminExam();
  const deleteExam = useDeleteAdminExam();

  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<ExamEdition | null>(null);
  const [form, setForm] = useState<ExamEditionBody>(makeEmptyExam(1));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openEditor = (exam?: ExamEdition) => {
    setEditing(exam ?? null);
    setForm(exam
      ? { year: exam.year, edition: exam.edition, title: exam.title, description: exam.description, tasks: exam.tasks.map(t => ({ ...t })), active: exam.active, order: exam.order }
      : makeEmptyExam((exams?.length ?? 0) + 1)
    );
    setDialog(true);
  };

  const addTask = () => {
    const newTask: ExamTask = {
      id: `task-${Date.now()}`,
      ...EMPTY_TASK,
      order: form.tasks.length + 1,
    };
    setForm({ ...form, tasks: [...form.tasks, newTask] });
  };

  const updateTask = (idx: number, patch: Partial<ExamTask>) => {
    const tasks = form.tasks.map((t, i) => i === idx ? { ...t, ...patch } : t);
    setForm({ ...form, tasks });
  };

  const removeTask = (idx: number) => {
    setForm({ ...form, tasks: form.tasks.filter((_, i) => i !== idx) });
  };

  const handleSave = () => {
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListAdminExamsQueryKey() });
      setDialog(false);
      toast({ title: editing ? "Exam updated" : "Exam created" });
    };
    const onError = () => toast({ title: "Save failed", variant: "destructive" });
    if (editing) {
      updateExam.mutate({ id: editing.id, data: form }, { onSuccess, onError });
    } else {
      createExam.mutate({ data: form }, { onSuccess, onError });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteExam.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminExamsQueryKey() });
        setDeleteId(null);
        toast({ title: "Exam deleted" });
      },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  const sorted = exams ? [...exams].sort((a, b) => a.order - b.order) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">Exam Archive</h1>
          <p className="text-muted-foreground text-sm">Manage Celpe-Bras exam editions and their tasks.</p>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="mr-2 h-4 w-4" /> New Edition
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
        ) : sorted.length === 0 ? (
          <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
            No exam editions. Create the first one.
          </div>
        ) : sorted.map((exam) => (
          <div key={exam.id} className="border rounded-lg bg-card overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ backgroundColor: "#185FA520" }}>
                <span className="text-sm font-bold" style={{ color: "#185FA5" }}>
                  {exam.year > 0 ? exam.year : "INEP"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{exam.title}</span>
                  {!exam.active && <Badge variant="outline" className="text-muted-foreground text-xs">Draft</Badge>}
                  <Badge variant="secondary" className="text-xs font-mono">{exam.edition}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{exam.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{exam.tasks.length} task(s)</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditor(exam)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(exam.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(expandedId === exam.id ? null : exam.id)}>
                  {expandedId === exam.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {expandedId === exam.id && (
              <div className="border-t divide-y">
                {[...exam.tasks].sort((a, b) => a.order - b.order).map((task) => (
                  <div key={task.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: (TASK_COLORS[task.type] || "#185FA5") + "22" }}>
                      {task.linkUrl && <ExternalLink className="h-3.5 w-3.5" style={{ color: TASK_COLORS[task.type] || "#185FA5" }} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold" style={{ color: TASK_COLORS[task.type] || "#185FA5" }}>{task.type}</span>
                        <span className="text-sm font-medium">{task.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                      <Badge variant="outline" className="text-xs mt-1">{task.genre}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Editor Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{editing ? "Edit Exam Edition" : "New Exam Edition"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Edition Code</Label>
                  <Input value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} placeholder="e.g. 2024/1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Celpe-Bras Abril 2024" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this edition" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Order</Label>
                  <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 1 })} className="w-24" />
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Tasks</Label>
                  <Button variant="outline" size="sm" onClick={addTask}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
                  </Button>
                </div>
                {form.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">No tasks yet. Click "Add Task" to add one.</p>
                ) : form.tasks.map((task, idx) => (
                  <div key={task.id || idx} className="border rounded-lg p-4 space-y-3 relative">
                    <Button
                      variant="ghost" size="icon"
                      className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTask(idx)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <div className="grid grid-cols-2 gap-3 pr-8">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Input value={task.type} onChange={(e) => updateTask(idx, { type: e.target.value })} placeholder="Tarefa 1" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Genre</Label>
                        <Input value={task.genre} onChange={(e) => updateTask(idx, { genre: e.target.value })} placeholder="e.g. Carta" className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input value={task.title} onChange={(e) => updateTask(idx, { title: e.target.value })} placeholder="Task title" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input value={task.description} onChange={(e) => updateTask(idx, { description: e.target.value })} placeholder="Brief description" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">External Link (optional)</Label>
                      <Input value={task.linkUrl ?? ""} onChange={(e) => updateTask(idx, { linkUrl: e.target.value || undefined })} placeholder="https://..." className="h-8 text-sm" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-3 border-t">
                <Switch id="exam-active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label htmlFor="exam-active">Active (visible in app)</Label>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createExam.isPending || updateExam.isPending}>
              {createExam.isPending || updateExam.isPending ? "Saving..." : "Save Edition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete exam edition?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this exam edition and all its tasks.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteExam.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
