import { useState, useEffect } from "react";
import { MessageSquare, RefreshCw, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FeedbackRequest = {
  id: string;
  deviceToken: string;
  studentName: string;
  content: string;
  requestType: string;
  teacherResponse: string;
  status: string;
  createdAt: string;
  respondedAt: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  escrita: "Produção Escrita",
  oral: "Produção Oral",
  geral: "Dúvida Geral",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  reviewed: "bg-green-600/15 text-green-400 border-green-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando",
  reviewed: "Respondido",
  closed: "Encerrado",
};

export default function TeacherFeedbackPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const rows = await adminFetch<FeedbackRequest[]>("/api/admin/feedback-requests");
      setRequests(rows);
      const resp: Record<string, string> = {};
      const stat: Record<string, string> = {};
      rows.forEach((r) => { resp[r.id] = r.teacherResponse; stat[r.id] = r.status; });
      setResponses(resp);
      setStatuses(stat);
    } catch { toast({ title: "Erro ao carregar", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (id: string) => {
    setSaving(id);
    try {
      await adminSave(`/api/admin/feedback-requests/${id}/respond`, {
        teacherResponse: responses[id] ?? "",
        status: statuses[id] ?? "reviewed",
      }, "PUT");
      setRequests((prev) => prev.map((r) => r.id === id
        ? { ...r, teacherResponse: responses[id] ?? "", status: statuses[id] ?? "reviewed" }
        : r
      ));
      toast({ title: "Resposta salva com sucesso" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta solicitação permanentemente?")) return;
    try {
      await adminSave(`/api/admin/feedback-requests/${id}`, {}, "DELETE");
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Solicitação excluída" });
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Feedback de Professores</h1>
          <p className="text-sm text-muted-foreground">Revise e responda às solicitações dos alunos</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {pending > 0 && (
            <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
              {pending} pendente{pending > 1 ? "s" : ""}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {["all", "pending", "reviewed", "closed"].map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
            className="text-xs"
          >
            {s === "all" ? "Todos" : STATUS_LABELS[s] ?? s}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Nenhuma solicitação encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isOpen = expanded === req.id;
            return (
              <Card key={req.id} className={req.status === "pending" ? "border-yellow-500/30" : ""}>
                <CardContent className="p-4">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : req.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{req.studentName || "Estudante"}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {TYPE_LABELS[req.requestType] ?? req.requestType}
                        </Badge>
                        <Badge className={`text-[10px] border ${STATUS_COLORS[req.status] ?? ""}`}>
                          {STATUS_LABELS[req.status] ?? req.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {new Date(req.createdAt).toLocaleString("pt-BR")} • {req.content.slice(0, 80)}…
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(req.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                          Produção do aluno
                        </p>
                        <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                          {req.content}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                          Resposta do professor
                        </p>
                        <Textarea
                          value={responses[req.id] ?? ""}
                          onChange={(e) => setResponses((prev) => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="Escreva o feedback detalhado para o aluno…"
                          className="min-h-[120px] text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <Select
                          value={statuses[req.id] ?? req.status}
                          onValueChange={(v) => setStatuses((prev) => ({ ...prev, [req.id]: v }))}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Aguardando</SelectItem>
                            <SelectItem value="reviewed">Respondido</SelectItem>
                            <SelectItem value="closed">Encerrado</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          className="ml-auto"
                          disabled={saving === req.id}
                          onClick={() => handleSave(req.id)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {saving === req.id ? "Salvando…" : "Salvar resposta"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
