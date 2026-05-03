import { useState, useEffect } from "react";
import { Layers, Plus, Trash2, Edit2, Save, X, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type Topic = { id: string; name: string; active: boolean; order: number; createdAt: string };

const BLANK: Partial<Topic> = { name: "", active: true, order: 0 };

export default function StudyTopicsAdminPage() {
  const { toast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTopic, setEditTopic] = useState<(Partial<Topic> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<Topic[]>("/api/admin/study-topics");
      setTopics(data);
    } catch {
      toast({ title: "Erro ao carregar tópicos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editTopic?.name?.trim()) return;
    setSaving(true);
    try {
      if (editTopic.id) {
        await adminSave(`/api/admin/study-topics/${editTopic.id}`, editTopic, "PUT");
        toast({ title: "Tópico atualizado" });
      } else {
        await adminSave("/api/admin/study-topics", { ...editTopic, order: topics.length }, "POST");
        toast({ title: "Tópico criado" });
      }
      setEditTopic(null);
      load();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Excluir este tópico?")) return;
    try {
      await adminSave(`/api/admin/study-topics/${id}`, {}, "DELETE");
      toast({ title: "Tópico excluído" });
      load();
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const toggleActive = async (topic: Topic) => {
    try {
      await adminSave(`/api/admin/study-topics/${topic.id}`, { ...topic, active: !topic.active }, "PUT");
      load();
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const activeCount = topics.filter((t) => t.active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight">Tópicos Celpe-Bras</h1>
            <p className="text-sm text-muted-foreground">
              Temas recorrentes exibidos na Biblioteca do app — {activeCount} ativos de {topics.length}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setEditTopic({ ...BLANK })}>
          <Plus className="h-4 w-4 mr-1" /> Novo tópico
        </Button>
      </div>

      {editTopic && (
        <Card className="border-primary/40">
          <CardContent className="pt-4 space-y-4">
            <h2 className="font-semibold font-mono text-sm">
              {editTopic.id ? "Editar tópico" : "Novo tópico"}
            </h2>
            <div className="space-y-2">
              <Label>Nome do tópico</Label>
              <Input
                placeholder="Ex: Meio Ambiente e Sustentabilidade"
                value={editTopic.name || ""}
                onChange={(e) => setEditTopic({ ...editTopic, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && save()}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editTopic.active ?? true}
                onCheckedChange={(v) => setEditTopic({ ...editTopic, active: v })}
              />
              <Label>Ativo no app</Label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={save} disabled={saving || !editTopic.name?.trim()}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditTopic(null)}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum tópico cadastrado</p>
          <Button size="sm" className="mt-4" onClick={() => setEditTopic({ ...BLANK })}>
            <Plus className="h-4 w-4 mr-1" /> Criar primeiro tópico
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map((topic) => (
            <Card
              key={topic.id}
              className={`transition-opacity ${!topic.active ? "opacity-50" : ""}`}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={topic.active}
                    onCheckedChange={() => toggleActive(topic)}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate block">{topic.name}</span>
                    {!topic.active && (
                      <span className="text-xs text-muted-foreground">Oculto no app</span>
                    )}
                  </div>
                  {topic.active && (
                    <Badge variant="secondary" className="text-xs shrink-0">Ativo</Badge>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditTopic({ ...topic })}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => del(topic.id)}
                    >
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
