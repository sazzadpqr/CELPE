import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, CheckCircle2, XCircle, FlaskConical,
  Sparkles, BarChart3, Loader2, RefreshCw, TrendingUp, TrendingDown,
  AlertTriangle, Lightbulb, Target, Zap, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminFetch, adminSave, getAuthHeader } from "@/lib/adminClient";

type Level = "A2" | "B1" | "B2" | "C1";
type Category = "verbos" | "concordancia" | "subjuntivo" | "pronomes" | "conectivos" | "preposicoes" | "gramatica";

const LEVELS: Level[] = ["A2", "B1", "B2", "C1"];
const CATEGORIES: { value: Category; label: string }[] = [
  { value: "verbos", label: "Verbos & Tempos" },
  { value: "concordancia", label: "Concordância" },
  { value: "subjuntivo", label: "Subjuntivo" },
  { value: "pronomes", label: "Pronomes" },
  { value: "conectivos", label: "Conectivos" },
  { value: "preposicoes", label: "Preposições" },
  { value: "gramatica", label: "Gramática Geral" },
];

const LEVEL_COLORS: Record<Level, string> = {
  A2: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  B1: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  B2: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  C1: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const LEVEL_HEX: Record<Level, string> = {
  A2: "#F59E0B", B1: "#3B82F6", B2: "#8B5CF6", C1: "#10B981",
};

type DiagnosticQuestion = {
  id: string; level: Level; category: string;
  question: string; options: string[]; correct: number;
  explanation: string; grammarRule?: string;
  timesAnswered: number; timesCorrect: number;
  active: boolean; createdAt: string;
  accuracy?: number | null;
};

const EMPTY_FORM = {
  level: "B1" as Level, category: "gramatica" as Category,
  question: "", options: ["", "", "", ""], correct: 0,
  explanation: "", grammarRule: "", active: true,
};

// ─── QUESTIONS TAB ─────────────────────────────────────────────────────────────

function QuestionsTab() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | Level>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiagnosticQuestion | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminFetch<DiagnosticQuestion[]>("/api/admin/diagnostic-questions")
      .then(d => setQuestions(Array.isArray(d) ? d : []))
      .catch(() => toast({ title: "Erro ao carregar questões", variant: "destructive" }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (q: DiagnosticQuestion) => {
    setEditing(q);
    setForm({ level: q.level, category: q.category as Category, question: q.question,
      options: [...q.options], correct: q.correct, explanation: q.explanation,
      grammarRule: q.grammarRule ?? "", active: q.active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || form.options.some(o => !o.trim())) {
      toast({ title: "Preencha a pergunta e todas as opções", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      if (editing) await adminSave(`/api/admin/diagnostic-questions/${editing.id}`, form);
      else await adminSave("/api/admin/diagnostic-questions", form, "POST");
      toast({ title: editing ? "Questão atualizada" : "Questão criada" });
      setDialogOpen(false); load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/diagnostic-questions/${id}`, { method: "DELETE", headers: getAuthHeader() });
      toast({ title: "Questão removida" }); setDeleteId(null); load();
    } catch { toast({ title: "Erro ao remover", variant: "destructive" }); }
  };

  const filtered = questions.filter(q => {
    if (levelFilter !== "all" && q.level !== levelFilter) return false;
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const levelCounts: Record<string, number> = { all: questions.length, A2: 0, B1: 0, B2: 0, C1: 0 };
  questions.forEach(q => { levelCounts[q.level] = (levelCounts[q.level] ?? 0) + 1; });

  return (
    <>
      <div className="flex gap-3 flex-wrap items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <Input placeholder="Buscar questão..." value={search}
            onChange={e => setSearch(e.target.value)} className="max-w-xs bg-muted/50" />
          <div className="flex gap-1.5">
            {(["all", "A2", "B1", "B2", "C1"] as const).map(lvl => (
              <button key={lvl} onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-colors ${
                  levelFilter === lvl ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"}`}>
                {lvl === "all" ? "Todos" : lvl} <span className="opacity-60">({levelCounts[lvl] ?? 0})</span>
              </button>
            ))}
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nova Questão</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground font-mono">
          {questions.length === 0 ? "Nenhuma questão cadastrada ainda." : "Nenhuma questão encontrada."}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((q, idx) => {
            const hasStats = q.timesAnswered > 0;
            const acc = hasStats ? Math.round((q.timesCorrect / q.timesAnswered) * 100) : null;
            return (
              <Card key={q.id} className={`border transition-opacity ${!q.active ? "opacity-50" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 pt-0.5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${LEVEL_COLORS[q.level]}`}>{q.level}</span>
                        <span className="text-[10px] text-muted-foreground border border-border rounded px-2 py-0.5 font-mono">
                          {CATEGORIES.find(c => c.value === q.category)?.label ?? q.category}
                        </span>
                        {!q.active && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}
                        {acc !== null && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            acc >= 70 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : acc >= 40 ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                            {acc}% acerto ({q.timesAnswered}×)
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mb-2">{q.question}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {q.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            {i === q.correct
                              ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              : <XCircle className="h-3 w-3 text-muted-foreground/30 shrink-0" />}
                            <span className={`text-xs ${i === q.correct ? "text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                              {["A","B","C","D"][i]}. {opt}
                            </span>
                          </div>
                        ))}
                      </div>
                      {q.explanation && <p className="text-xs text-muted-foreground mt-2 italic">{q.explanation}</p>}
                      {q.grammarRule && <p className="text-xs text-blue-400/70 mt-1 font-mono">↳ {q.grammarRule}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={q.active} onCheckedChange={async () => {
                        await adminSave(`/api/admin/diagnostic-questions/${q.id}`, { ...q, active: !q.active }); load();
                      }} />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(q.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{editing ? "Editar Questão" : "Nova Questão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">Nível</Label>
                <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v as Level }))}>
                  <SelectTrigger className="font-mono text-xs bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A2">A2 — Básico</SelectItem>
                    <SelectItem value="B1">B1 — Intermediário</SelectItem>
                    <SelectItem value="B2">B2 — Interm. Avançado</SelectItem>
                    <SelectItem value="C1">C1 — Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as Category }))}>
                  <SelectTrigger className="font-mono text-xs bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Pergunta (use ___ para lacuna)</Label>
              <Textarea rows={3} value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                className="font-mono text-xs bg-muted/50" placeholder="O estudante ___ muito esforçado." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Opções (clique no círculo para marcar a correta)</Label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <button type="button" onClick={() => setForm(f => ({ ...f, correct: i }))}
                    className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      form.correct === i ? "border-emerald-500 bg-emerald-500/20" : "border-border"}`}>
                    {form.correct === i && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                  </button>
                  <span className="text-xs font-mono text-muted-foreground w-5">{["A","B","C","D"][i]}.</span>
                  <Input value={opt} onChange={e => setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? e.target.value : o) }))}
                    className="font-mono text-xs bg-muted/50 flex-1" placeholder={`Opção ${["A","B","C","D"][i]}`} />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Explicação</Label>
              <Textarea rows={2} value={form.explanation}
                onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                className="font-mono text-xs bg-muted/50" placeholder="Por que essa é a resposta correta..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Regra gramatical (opcional)</Label>
              <Input value={form.grammarRule}
                onChange={e => setForm(f => ({ ...f, grammarRule: e.target.value }))}
                className="font-mono text-xs bg-muted/50" placeholder="ex: Subjuntivo presente após verbos de volição" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label className="text-xs font-mono text-muted-foreground">Questão ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? "Salvar alterações" : "Criar questão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-mono">Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Essa ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── AI GENERATOR TAB ─────────────────────────────────────────────────────────

function AIGeneratorTab() {
  const { toast } = useToast();
  const [genForm, setGenForm] = useState({
    level: "B1" as Level, category: "subjuntivo" as Category, topic: "", style: "",
  });
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<DiagnosticQuestion | null>(null);
  const [saving, setSaving] = useState(false);

  const [bulkForm, setBulkForm] = useState({ level: "B1" as Level, category: "subjuntivo" as Category, count: 5 });
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkQuestions, setBulkQuestions] = useState<DiagnosticQuestion[]>([]);
  const [selectedBulk, setSelectedBulk] = useState<Set<number>>(new Set());
  const [savingBulk, setSavingBulk] = useState(false);

  const generate = async () => {
    setGenerating(true); setPreview(null);
    try {
      const res = await fetch("/api/admin/diagnostic/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(genForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setPreview(data);
    } catch { toast({ title: "Erro ao gerar questão", variant: "destructive" }); }
    finally { setGenerating(false); }
  };

  const savePreview = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await adminSave("/api/admin/diagnostic-questions", {
        level: preview.level, category: preview.category ?? genForm.category,
        question: preview.question, options: preview.options, correct: preview.correct,
        explanation: preview.explanation, grammarRule: preview.grammarRule, active: true,
      }, "POST");
      toast({ title: "Questão salva no banco!" });
      setPreview(null);
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const generateBulk = async () => {
    setBulkGenerating(true); setBulkQuestions([]); setBulkProgress(null); setSelectedBulk(new Set());
    try {
      const res = await fetch("/api/admin/diagnostic/generate-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(bulkForm),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "progress") setBulkProgress({ current: ev.current, total: ev.total });
            if (ev.type === "question") setBulkQuestions(prev => [...prev, ev.question]);
          } catch {}
        }
      }
    } catch { toast({ title: "Erro na geração em lote", variant: "destructive" }); }
    finally { setBulkGenerating(false); setBulkProgress(null); }
  };

  const saveSelected = async () => {
    if (selectedBulk.size === 0) return;
    setSavingBulk(true);
    let saved = 0;
    for (const i of selectedBulk) {
      const q = bulkQuestions[i];
      if (!q) continue;
      try {
        await adminSave("/api/admin/diagnostic-questions", {
          level: q.level ?? bulkForm.level, category: q.category ?? bulkForm.category,
          question: q.question, options: q.options, correct: q.correct,
          explanation: q.explanation, grammarRule: q.grammarRule, active: true,
        }, "POST");
        saved++;
      } catch {}
    }
    toast({ title: `${saved} questão(ões) salva(s) no banco!` });
    setSelectedBulk(new Set());
    setSavingBulk(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Single Generator */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Gerador de Questão Individual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Nível</Label>
              <Select value={genForm.level} onValueChange={v => setGenForm(f => ({ ...f, level: v as Level }))}>
                <SelectTrigger className="text-xs font-mono bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Categoria</Label>
              <Select value={genForm.category} onValueChange={v => setGenForm(f => ({ ...f, category: v as Category }))}>
                <SelectTrigger className="text-xs font-mono bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-mono text-muted-foreground">Tópico específico (opcional)</Label>
            <Input value={genForm.topic} onChange={e => setGenForm(f => ({ ...f, topic: e.target.value }))}
              className="text-xs font-mono bg-muted/50" placeholder="ex: correlação verbal, imperfeito do subjuntivo..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-mono text-muted-foreground">Estilo (opcional)</Label>
            <Input value={genForm.style} onChange={e => setGenForm(f => ({ ...f, style: e.target.value }))}
              className="text-xs font-mono bg-muted/50" placeholder="ex: completar lacuna, identificar erro, escolher conectivo..." />
          </div>
          <Button onClick={generate} disabled={generating} className="w-full">
            {generating
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando com IA...</>
              : <><Sparkles className="h-4 w-4 mr-2" />Gerar questão</>}
          </Button>

          {/* Preview */}
          {preview && (
            <div className="border border-primary/30 rounded-xl p-4 space-y-3 bg-background">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${LEVEL_COLORS[preview.level as Level]}`}>
                  {preview.level}
                </span>
                <span className="text-[10px] border border-border rounded px-2 py-0.5 font-mono text-muted-foreground">
                  {CATEGORIES.find(c => c.value === preview.category)?.label ?? preview.category}
                </span>
                <span className="text-[10px] text-primary/60 font-mono">← gerada pela IA</span>
              </div>
              <p className="text-sm font-medium">{preview.question}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {preview.options?.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {i === preview.correct
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
                    <span className={`text-xs ${i === preview.correct ? "text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                      {["A","B","C","D"][i]}. {opt}
                    </span>
                  </div>
                ))}
              </div>
              {preview.explanation && (
                <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{preview.explanation}</p>
              )}
              {preview.grammarRule && (
                <p className="text-xs text-blue-400/70 font-mono">↳ Regra: {preview.grammarRule}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={savePreview} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  Salvar no banco
                </Button>
                <Button size="sm" variant="outline" onClick={generate} disabled={generating}>
                  <RefreshCw className="h-3 w-3 mr-1" />Regerar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>Descartar</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Generator */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" /> Geração em Lote
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Nível</Label>
              <Select value={bulkForm.level} onValueChange={v => setBulkForm(f => ({ ...f, level: v as Level }))}>
                <SelectTrigger className="text-xs font-mono bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Categoria</Label>
              <Select value={bulkForm.category} onValueChange={v => setBulkForm(f => ({ ...f, category: v as Category }))}>
                <SelectTrigger className="text-xs font-mono bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono text-muted-foreground">Quantidade</Label>
              <Select value={String(bulkForm.count)} onValueChange={v => setBulkForm(f => ({ ...f, count: Number(v) }))}>
                <SelectTrigger className="text-xs font-mono bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3,5,7,10].map(n => <SelectItem key={n} value={String(n)}>{n} questões</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generateBulk} disabled={bulkGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700">
            {bulkGenerating
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {bulkProgress ? `Gerando ${bulkProgress.current}/${bulkProgress.total}...` : "Iniciando..."}
                </>
              : <><Zap className="h-4 w-4 mr-2" />Gerar {bulkForm.count} questões</>}
          </Button>

          {/* Progress bar */}
          {bulkGenerating && bulkProgress && (
            <div className="space-y-1">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Bulk Results */}
          {bulkQuestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-muted-foreground">
                  {bulkQuestions.length} questão(ões) gerada(s) · {selectedBulk.size} selecionada(s)
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-xs h-7"
                    onClick={() => setSelectedBulk(new Set(bulkQuestions.map((_, i) => i)))}>
                    Selecionar todas
                  </Button>
                  <Button size="sm" onClick={saveSelected} disabled={savingBulk || selectedBulk.size === 0}
                    className="h-7 text-xs">
                    {savingBulk ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                    Salvar selecionadas
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {bulkQuestions.map((q, i) => (
                  <div key={i} onClick={() => setSelectedBulk(prev => {
                    const n = new Set(prev);
                    if (n.has(i)) n.delete(i); else n.add(i); return n;
                  })}
                    className={`cursor-pointer border rounded-lg p-3 transition-colors ${
                      selectedBulk.has(i) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-4 h-4 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                        selectedBulk.has(i) ? "border-primary bg-primary" : "border-border"}`}>
                        {selectedBulk.has(i) && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground mb-1">{q.question}</p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          <span>{["A","B","C","D"][q.correct]}. {q.options?.[q.correct]}</span>
                          {q.grammarRule && <span className="text-blue-400/60">· {q.grammarRule}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── ANALYTICS TAB ────────────────────────────────────────────────────────────

type AnalyticsData = {
  questions: DiagnosticQuestion[];
  totalResults: number;
  levelDistribution: Record<string, number>;
  avgTimeSecs: number;
  categoryAccuracy: { category: string; accuracy: number; total: number }[];
};

type InsightsData = {
  headline: string;
  weakAreas: string[];
  strongAreas: string[];
  recommendations: { title: string; description: string; priority: string }[];
  contentGaps: string;
};

function AnalyticsTab() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const data = await adminFetch<AnalyticsData>("/api/admin/diagnostic/analytics");
      setAnalytics(data);
    } catch { toast({ title: "Erro ao carregar analytics", variant: "destructive" }); }
    finally { setLoadingAnalytics(false); }
  };

  const loadInsights = async () => {
    setLoadingInsights(true);
    try {
      const data = await adminFetch<InsightsData>("/api/admin/diagnostic/insights");
      setInsights(data);
    } catch { toast({ title: "Erro ao gerar insights", variant: "destructive" }); }
    finally { setLoadingInsights(false); }
  };

  useEffect(() => { loadAnalytics(); }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60); const s = secs % 60;
    return `${m}m${s.toString().padStart(2,"0")}s`;
  };

  if (loadingAnalytics) return (
    <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
  );
  if (!analytics) return null;

  const totalAnswered = analytics.questions.reduce((a, q) => a + q.timesAnswered, 0);
  const hardestQs = [...analytics.questions].filter(q => q.timesAnswered > 0)
    .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100)).slice(0, 5);
  const easiestQs = [...analytics.questions].filter(q => q.timesAnswered > 0)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0)).slice(0, 5);

  const LEVEL_TOTAL = Object.values(analytics.levelDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Diagnósticos Realizados", value: analytics.totalResults, icon: Target, color: "text-blue-400" },
          { label: "Respostas Totais", value: totalAnswered.toLocaleString("pt-BR"), icon: BarChart3, color: "text-emerald-400" },
          { label: "Tempo Médio", value: formatTime(analytics.avgTimeSecs), icon: Zap, color: "text-amber-400" },
          { label: "Questões no Banco", value: analytics.questions.length, icon: FlaskConical, color: "text-purple-400" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex flex-col gap-2">
              <k.icon className={`h-4 w-4 ${k.color}`} />
              <p className="text-2xl font-bold font-mono">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Level Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono">Distribuição por Nível</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {LEVEL_TOTAL === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
            ) : LEVELS.map(lvl => {
              const count = analytics.levelDistribution[lvl] ?? 0;
              const pct = LEVEL_TOTAL > 0 ? Math.round((count / LEVEL_TOTAL) * 100) : 0;
              return (
                <div key={lvl} className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border w-10 text-center ${LEVEL_COLORS[lvl]}`}>{lvl}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: LEVEL_HEX[lvl] }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right font-mono">{count} ({pct}%)</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Category Accuracy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono">Acerto por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.categoryAccuracy.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
            ) : analytics.categoryAccuracy.map(c => {
              const color = c.accuracy >= 70 ? "#10B981" : c.accuracy >= 50 ? "#3B82F6" : "#EF4444";
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 shrink-0 truncate font-mono">
                    {CATEGORIES.find(cat => cat.value === c.category)?.label ?? c.category}
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${c.accuracy}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs font-mono w-10 text-right" style={{ color }}>{c.accuracy}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Hardest / Easiest */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" /> Mais Difíceis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hardestQs.length === 0 ? <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
              : hardestQs.map((q, i) => (
              <div key={q.id} className="flex items-start gap-2 text-xs border-b border-border pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground font-mono w-4 shrink-0">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-foreground">{q.question}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className={`text-[10px] font-mono ${LEVEL_COLORS[q.level as Level]?.split(" ")[1] ?? "text-muted-foreground"}`}>{q.level}</span>
                    <span className="text-[10px] text-red-400 font-mono">{q.accuracy}% acerto</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Mais Fáceis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {easiestQs.length === 0 ? <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
              : easiestQs.map((q, i) => (
              <div key={q.id} className="flex items-start gap-2 text-xs border-b border-border pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground font-mono w-4 shrink-0">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-foreground">{q.question}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className={`text-[10px] font-mono ${LEVEL_COLORS[q.level as Level]?.split(" ")[1] ?? "text-muted-foreground"}`}>{q.level}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">{q.accuracy}% acerto</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Insights da IA
            </CardTitle>
            <Button size="sm" variant="outline" onClick={loadInsights} disabled={loadingInsights}>
              {loadingInsights
                ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Analisando...</>
                : <><Brain className="h-3 w-3 mr-1.5" />{insights ? "Reanalisar" : "Gerar insights"}</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!insights && !loadingInsights && (
            <div className="text-center py-8 space-y-2">
              <Brain className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Clique em "Gerar insights" para que a IA analise o desempenho dos alunos e identifique padrões.</p>
            </div>
          )}
          {loadingInsights && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          )}
          {insights && !loadingInsights && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-semibold text-foreground">{insights.headline}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.weakAreas?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-mono text-red-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Áreas fracas
                    </p>
                    {insights.weakAreas.map((a, i) => (
                      <p key={i} className="text-xs text-muted-foreground">· {a}</p>
                    ))}
                  </div>
                )}
                {insights.strongAreas?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Pontos fortes
                    </p>
                    {insights.strongAreas.map((a, i) => (
                      <p key={i} className="text-xs text-muted-foreground">· {a}</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-mono text-muted-foreground">Recomendações</p>
                {insights.recommendations?.map((r, i) => (
                  <div key={i} className={`flex gap-3 p-3 rounded-lg border ${
                    r.priority === "high" ? "border-red-500/30 bg-red-500/5"
                      : r.priority === "medium" ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-muted/30"}`}>
                    <Lightbulb className={`h-4 w-4 mt-0.5 shrink-0 ${
                      r.priority === "high" ? "text-red-400"
                        : r.priority === "medium" ? "text-amber-400" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {insights.contentGaps && (
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <p className="text-xs font-mono text-amber-400 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Lacunas no banco de questões
                  </p>
                  <p className="text-xs text-muted-foreground">{insights.contentGaps}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DiagnosticAdmin() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-mono flex items-center gap-2">
          <FlaskConical className="h-7 w-7 text-blue-400" /> Diagnóstico
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Banco de questões, gerador por IA e analytics de desempenho
        </p>
      </div>

      <Tabs defaultValue="questions">
        <TabsList className="font-mono text-xs">
          <TabsTrigger value="questions" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" /> Questões
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Gerador IA
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4 mt-4">
          <QuestionsTab />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AIGeneratorTab />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
