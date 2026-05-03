import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Calendar, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type LiveEvent = {
  id: string; title: string; description: string; host: string;
  scheduledAt: string; durationMinutes: number; meetingUrl: string;
  topic: string; maxParticipants: number; isPremiumOnly: boolean; active: boolean;
};

const EMPTY: Omit<LiveEvent, "id"> = {
  title: "", description: "", host: "", scheduledAt: "",
  durationMinutes: 60, meetingUrl: "", topic: "geral",
  maxParticipants: 0, isPremiumOnly: false, active: true,
};

const TOPICS = ["geral", "gramatica", "vocabulario", "escrita", "pronuncia", "exame"];
const TOPIC_LABELS: Record<string, string> = {
  geral: "Geral", gramatica: "Gramática", vocabulario: "Vocabulário",
  escrita: "Escrita", pronuncia: "Pronúncia", exame: "Exame",
};

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

export default function LiveEventsPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<LiveEvent | null>(null);
  const [form, setForm] = useState<Omit<LiveEvent, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await adminFetch<LiveEvent[]>("/api/admin/live-events");
      setEvents(rows);
    } catch { toast({ title: "Erro ao carregar eventos", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openEditor = (ev?: LiveEvent) => {
    setEditing(ev ?? null);
    if (ev) {
      const localDt = new Date(ev.scheduledAt);
      const offset = localDt.getTimezoneOffset() * 60000;
      const localIso = new Date(localDt.getTime() - offset).toISOString().slice(0, 16);
      setForm({ ...ev, scheduledAt: localIso });
    } else {
      setForm(EMPTY);
    }
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.scheduledAt) {
      toast({ title: "Título e data são obrigatórios", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, scheduledAt: new Date(form.scheduledAt).toISOString() };
      if (editing) {
        await adminSave(`/api/admin/live-events/${editing.id}`, payload, "PUT");
        toast({ title: "Evento atualizado" });
      } else {
        await adminSave("/api/admin/live-events", payload, "POST");
        toast({ title: "Evento criado" });
      }
      setDialog(false);
      load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminSave(`/api/admin/live-events/${deleteId}`, {}, "DELETE");
      toast({ title: "Evento excluído" });
      setDeleteId(null);
      load();
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const isUpcoming = (iso: string) => new Date(iso).getTime() > Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Aulas ao Vivo</h1>
          <p className="text-muted-foreground text-sm">Gerencie eventos e aulas ao vivo para os alunos.</p>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="mr-2 h-4 w-4" /> Novo Evento
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : events.length === 0 ? (
        <div className="border border-dashed rounded-xl p-16 text-center text-muted-foreground">
          <Video className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>Nenhuma aula cadastrada. Crie a primeira aula ao vivo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const upcoming = isUpcoming(ev.scheduledAt);
            return (
              <Card key={ev.id} className={!ev.active ? "opacity-50" : ""}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{ev.title}</span>
                      {upcoming
                        ? <Badge className="text-[10px] bg-green-600">Próxima</Badge>
                        : <Badge variant="secondary" className="text-[10px]">Passada</Badge>}
                      {ev.isPremiumOnly && <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400">Premium</Badge>}
                      {!ev.active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{ev.host} · {TOPIC_LABELS[ev.topic] ?? ev.topic} · {ev.durationMinutes} min</p>
                    <p className="text-xs text-muted-foreground">{formatDate(ev.scheduledAt)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditor(ev)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(ev.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título da aula" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição da aula" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Apresentador</Label>
                <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="Nome do professor" />
              </div>
              <div className="space-y-2">
                <Label>Tópico</Label>
                <Select value={form.topic} onValueChange={(v) => setForm({ ...form, topic: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TOPICS.map((t) => <SelectItem key={t} value={t}>{TOPIC_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data e Hora</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 60 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Link da Reunião</Label>
              <Input value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} placeholder="https://meet.google.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Máx. Participantes (0 = ilimitado)</Label>
              <Input type="number" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch checked={form.isPremiumOnly} onCheckedChange={(v) => setForm({ ...form, isPremiumOnly: v })} />
                <Label>Somente Premium</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label>Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
