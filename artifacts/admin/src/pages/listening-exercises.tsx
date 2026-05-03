import { useState, useEffect } from "react";
import { Headphones, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp } from "lucide-react";
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

type Question = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type Exercise = {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  audioSource: string;
  level: string;
  durationLabel: string;
  questions: Question[];
  transcript: string;
  active: boolean;
  createdAt: string;
};

const BLANK_EXERCISE: Omit<Exercise, "id" | "createdAt"> = {
  title: "",
  description: "",
  audioUrl: "",
  audioSource: "",
  level: "B1",
  durationLabel: "",
  questions: [],
  transcript: "",
  active: true,
};

const BLANK_QUESTION: Question = {
  id: "",
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
};

const LEVEL_COLORS: Record<string, string> = {
  A2: "bg-green-500/20 text-green-400",
  B1: "bg-blue-500/20 text-blue-400",
  B2: "bg-purple-500/20 text-purple-400",
  C1: "bg-yellow-500/20 text-yellow-400",
};

function newQuestion(): Question {
  return { ...BLANK_QUESTION, id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2), options: ["", "", "", ""] };
}

export default function ListeningExercisesPage() {
  const { toast } = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Partial<Exercise> & { id?: string }) | null>(null);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<Exercise[]>("/api/admin/listening-exercises");
      setExercises(data);
    } catch {
      toast({ title: "Erro ao carregar exercícios", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startNew = () => {
    setEditing({ ...BLANK_EXERCISE, questions: [newQuestion()] });
    setExpandedQ(0);
  };

  const startEdit = (ex: Exercise) => {
    setEditing({ ...ex });
    setExpandedQ(null);
  };

  const cancel = () => { setEditing(null); setExpandedQ(null); };

  const save = async () => {
    if (!editing?.title?.trim()) { toast({ title: "Título obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editing.id) {
        await adminSave(`/api/admin/listening-exercises/${editing.id}`, editing, "PUT");
      } else {
        await adminSave("/api/admin/listening-exercises", editing, "POST");
      }
      toast({ title: "Exercício salvo com sucesso" });
      setEditing(null);
      setExpandedQ(null);
      await load();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Excluir este exercício?")) return;
    try {
      await adminSave(`/api/admin/listening-exercises/${id}`, {}, "DELETE");
      toast({ title: "Exercício removido" });
      await load();
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const setField = <K extends keyof Exercise>(k: K, v: Exercise[K]) =>
    setEditing((prev) => prev ? { ...prev, [k]: v } : prev);

  const setQuestion = (qi: number, upd: Partial<Question>) =>
    setEditing((prev) => {
      if (!prev) return prev;
      const qs = [...(prev.questions || [])];
      qs[qi] = { ...qs[qi]!, ...upd };
      return { ...prev, questions: qs };
    });

  const setOption = (qi: number, oi: number, val: string) =>
    setEditing((prev) => {
      if (!prev) return prev;
      const qs = [...(prev.questions || [])];
      const opts = [...(qs[qi]?.options || ["", "", "", ""])];
      opts[oi] = val;
      qs[qi] = { ...qs[qi]!, options: opts };
      return { ...prev, questions: qs };
    });

  const addQuestion = () => {
    setEditing((prev) => {
      if (!prev) return prev;
      const qs = [...(prev.questions || []), newQuestion()];
      return { ...prev, questions: qs };
    });
    setExpandedQ((editing?.questions?.length ?? 0));
  };

  const removeQuestion = (qi: number) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const qs = [...(prev.questions || [])];
      qs.splice(qi, 1);
      return { ...prev, questions: qs };
    });
    setExpandedQ(null);
  };

  if (editing) {
    const qs = editing.questions || [];
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Headphones className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{editing.id ? "Editar Exercício" : "Novo Exercício"}</h1>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Informações do Exercício</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Título *</Label>
                <Input value={editing.title || ""} onChange={(e) => setField("title", e.target.value)} placeholder="Ex: Entrevista sobre Meio Ambiente" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Descrição</Label>
                <Textarea value={editing.description || ""} onChange={(e) => setField("description", e.target.value)} rows={2} placeholder="Instruções para o estudante" />
              </div>
              <div className="space-y-1">
                <Label>URL do Áudio</Label>
                <Input value={editing.audioUrl || ""} onChange={(e) => setField("audioUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <Label>Fonte do Áudio</Label>
                <Input value={editing.audioSource || ""} onChange={(e) => setField("audioSource", e.target.value)} placeholder="Ex: Rádio MEC, CBN" />
              </div>
              <div className="space-y-1">
                <Label>Nível</Label>
                <Select value={editing.level || "B1"} onValueChange={(v) => setField("level", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A2", "B1", "B2", "C1"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Duração Estimada</Label>
                <Input value={editing.durationLabel || ""} onChange={(e) => setField("durationLabel", e.target.value)} placeholder="Ex: ~8 min" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editing.active !== false} onCheckedChange={(v) => setField("active", v)} />
              <Label>Ativo (visível no app)</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Questões ({qs.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Questão
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {qs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma questão. Clique em "Adicionar Questão".</p>
            )}
            {qs.map((q, qi) => (
              <div key={q.id || qi} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 text-left bg-muted/30 hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedQ(expandedQ === qi ? null : qi)}
                >
                  <span className="text-sm font-medium">
                    {qi + 1}. {q.text || <span className="text-muted-foreground italic">Sem texto</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); removeQuestion(qi); }}>
                      <X className="h-3 w-3" />
                    </Button>
                    {expandedQ === qi ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {expandedQ === qi && (
                  <div className="p-4 space-y-4">
                    <div className="space-y-1">
                      <Label>Texto da Questão</Label>
                      <Textarea value={q.text} onChange={(e) => setQuestion(qi, { text: e.target.value })} rows={2} placeholder="Qual é o tema principal do áudio?" />
                    </div>
                    <div className="space-y-2">
                      <Label>Alternativas (marque a correta)</Label>
                      {(q.options || ["", "", "", ""]).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuestion(qi, { correctIndex: oi })}
                            className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${q.correctIndex === oi ? "border-green-500 bg-green-500 text-white" : "border-border"}`}
                          >
                            {q.correctIndex === oi ? "✓" : String.fromCharCode(65 + oi)}
                          </button>
                          <Input value={opt} onChange={(e) => setOption(qi, oi, e.target.value)} placeholder={`Alternativa ${String.fromCharCode(65 + oi)}`} />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <Label>Explicação da Resposta</Label>
                      <Textarea value={q.explanation} onChange={(e) => setQuestion(qi, { explanation: e.target.value })} rows={2} placeholder="Explique por que a resposta correta é essa..." />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Transcrição</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={editing.transcript || ""}
              onChange={(e) => setField("transcript", e.target.value)}
              rows={6}
              placeholder="Cole aqui a transcrição do áudio. Será exibida ao estudante após responder as questões..."
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={cancel} disabled={saving}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar Exercício"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Exercícios de Compreensão Auditiva</h1>
            <p className="text-sm text-muted-foreground">Áudios com questões de múltipla escolha e transcrição, no estilo Celpe-Bras.</p>
          </div>
        </div>
        <Button onClick={startNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Exercício
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : exercises.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Headphones className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum exercício cadastrado ainda.</p>
            <Button className="mt-4" onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Criar Primeiro Exercício</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exercises.map((ex) => (
            <Card key={ex.id} className={`${!ex.active ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{ex.title}</span>
                      <Badge className={LEVEL_COLORS[ex.level] ?? ""}>{ex.level}</Badge>
                      {ex.durationLabel && <span className="text-xs text-muted-foreground">{ex.durationLabel}</span>}
                      {!ex.active && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                    </div>
                    {ex.description && <p className="text-sm text-muted-foreground">{ex.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      {ex.audioSource && <span>🔊 {ex.audioSource}</span>}
                      <span>{ex.questions.length} questão{ex.questions.length !== 1 ? "ões" : ""}</span>
                      {ex.transcript && <span>📄 Com transcrição</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => startEdit(ex)}>
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => del(ex.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
