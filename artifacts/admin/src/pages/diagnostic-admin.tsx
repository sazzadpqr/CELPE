import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { adminFetch, adminSave } from "@/lib/adminClient";
import { getAuthHeader } from "@/lib/adminClient";

type Level = "A2" | "B1" | "B2" | "C1";

type DiagnosticQuestion = {
  id: string;
  level: Level;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  active: boolean;
  createdAt: string;
};

const LEVEL_COLORS: Record<Level, string> = {
  A2: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  B1: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  B2: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  C1: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const EMPTY: Omit<DiagnosticQuestion, "id" | "createdAt"> = {
  level: "B1",
  question: "",
  options: ["", "", "", ""],
  correct: 0,
  explanation: "",
  active: true,
};

export default function DiagnosticAdmin() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | Level>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiagnosticQuestion | null>(null);
  const [form, setForm] = useState<Omit<DiagnosticQuestion, "id" | "createdAt">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminFetch<DiagnosticQuestion[]>("/api/admin/diagnostic-questions")
      .then((d) => setQuestions(Array.isArray(d) ? d : []))
      .catch(() => { setQuestions([]); toast({ title: "Erro ao carregar questões", variant: "destructive" }); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (q: DiagnosticQuestion) => {
    setEditing(q);
    setForm({ level: q.level, question: q.question, options: [...q.options], correct: q.correct, explanation: q.explanation, active: q.active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || form.options.some((o) => !o.trim())) {
      toast({ title: "Preencha a pergunta e todas as opções", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await adminSave(`/api/admin/diagnostic-questions/${editing.id}`, form);
      } else {
        await adminSave("/api/admin/diagnostic-questions", form, "POST");
      }
      toast({ title: editing ? "Questão atualizada" : "Questão criada" });
      setDialogOpen(false);
      load();
    } catch {
      toast({ title: "Erro ao salvar questão", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/diagnostic-questions/${id}`, { method: "DELETE", headers: getAuthHeader() });
      toast({ title: "Questão removida" });
      setDeleteId(null);
      load();
    } catch {
      toast({ title: "Erro ao remover questão", variant: "destructive" });
    }
  };

  const handleToggleActive = async (q: DiagnosticQuestion) => {
    try {
      await adminSave(`/api/admin/diagnostic-questions/${q.id}`, { ...q, active: !q.active });
      load();
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const setOption = (i: number, v: string) =>
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => idx === i ? v : o) }));

  const filtered = questions.filter((q) => {
    if (levelFilter !== "all" && q.level !== levelFilter) return false;
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const levelCounts = { all: questions.length, A2: 0, B1: 0, B2: 0, C1: 0 } as Record<string, number>;
  questions.forEach((q) => levelCounts[q.level] = (levelCounts[q.level] ?? 0) + 1);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-blue-400" /> Diagnóstico
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {questions.length} questões · {questions.filter((q) => q.active).length} ativas
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nova Questão</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Buscar questão..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-muted/50" />
        <div className="flex gap-2">
          {(["all", "A2", "B1", "B2", "C1"] as const).map((lvl) => (
            <button key={lvl} onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-colors ${
                levelFilter === lvl ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"}`}>
              {lvl === "all" ? "Todos" : lvl} ({levelCounts[lvl] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground font-mono">
            {questions.length === 0 ? "Nenhuma questão cadastrada ainda." : "Nenhuma questão encontrada."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q, idx) => (
            <Card key={q.id} className={`border ${!q.active ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-6 shrink-0 pt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${LEVEL_COLORS[q.level]}`}>{q.level}</span>
                      {!q.active && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}
                    </div>
                    <p className="text-sm font-medium text-foreground mb-2">{q.question}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {q.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          {i === q.correct
                            ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                            : <XCircle className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                          }
                          <span className={`text-xs ${i === q.correct ? "text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                            {["A", "B", "C", "D"][i]}. {opt}
                          </span>
                        </div>
                      ))}
                    </div>
                    {q.explanation && <p className="text-xs text-muted-foreground mt-2 italic">{q.explanation}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={q.active} onCheckedChange={() => handleToggleActive(q)} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(q.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{editing ? "Editar Questão" : "Nova Questão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Nível</Label>
              <Select value={form.level} onValueChange={(v) => setForm((f) => ({ ...f, level: v as Level }))}>
                <SelectTrigger className="font-mono text-xs bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A2">A2 — Básico</SelectItem>
                  <SelectItem value="B1">B1 — Intermediário</SelectItem>
                  <SelectItem value="B2">B2 — Intermediário Superior</SelectItem>
                  <SelectItem value="C1">C1 — Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Pergunta (use ___ para lacuna)</Label>
              <Textarea rows={3} value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                className="font-mono text-xs bg-muted/50" placeholder="O estudante ___ muito esforçado." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Opções (selecione a correta)</Label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <button type="button" onClick={() => setForm((f) => ({ ...f, correct: i }))}
                    className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      form.correct === i ? "border-emerald-500 bg-emerald-500/20" : "border-border"}`}>
                    {form.correct === i && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                  </button>
                  <span className="text-xs font-mono text-muted-foreground w-5">{["A", "B", "C", "D"][i]}.</span>
                  <Input value={opt} onChange={(e) => setOption(i, e.target.value)}
                    className="font-mono text-xs bg-muted/50 flex-1" placeholder={`Opção ${["A", "B", "C", "D"][i]}`} />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Explicação</Label>
              <Textarea rows={2} value={form.explanation} onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                className="font-mono text-xs bg-muted/50" placeholder="Por que essa é a resposta correta..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              <Label className="text-xs font-mono text-muted-foreground">Questão ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar questão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-mono">Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Essa ação não pode ser desfeita. A questão será removida permanentemente.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
