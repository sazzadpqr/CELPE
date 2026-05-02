import { useState, useEffect } from "react";
import { MessageCircle, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type Scenario = {
  id: string;
  label: string;
  icon: string;
  color: string;
  systemPrompt: string;
  order: number;
  active: boolean;
};

const BLANK: Omit<Scenario, "id"> = {
  label: "",
  icon: "message-circle",
  color: "#185FA5",
  systemPrompt: "",
  order: 0,
  active: true,
};

const COLOR_OPTIONS = ["#185FA5", "#1D9E75", "#6B21A8", "#D85A30", "#BA7517"];
const ICON_OPTIONS = ["message-circle", "briefcase", "map-pin", "activity", "coffee", "message-square", "globe", "book-open", "mic"];

export default function ConversationScenariosPage() {
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Partial<Scenario> & { id?: string }) | null>(null);

  const load = async () => {
    setLoading(true);
    try { setScenarios(await adminFetch<Scenario[]>("/api/admin/conversation/scenarios")); }
    catch { toast({ title: "Erro ao carregar", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.label) return;
    try {
      if (editing.id) await adminSave(`/api/admin/conversation/scenarios/${editing.id}`, editing, "PUT");
      else await adminSave("/api/admin/conversation/scenarios", editing, "POST");
      toast({ title: "Cenário salvo" });
      setEditing(null);
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir cenário?")) return;
    try {
      await adminSave(`/api/admin/conversation/scenarios/${id}`, {}, "DELETE");
      toast({ title: "Cenário excluído" });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Cenários de Conversação</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os cenários de conversa com IA — cada um define um papel, tom e instruções para o modelo
          </p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setEditing(BLANK)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Cenário
        </Button>
      </div>

      {editing && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{editing.id ? "Editar" : "Novo"} Cenário de Conversação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome do Cenário *</Label>
                <Input value={editing.label ?? ""} placeholder="Ex: Entrevista de Emprego"
                  onChange={e => setEditing(p => ({ ...p!, label: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ícone (Feather)</Label>
                <Input value={editing.icon ?? "message-circle"} list="icon-options"
                  placeholder="message-circle, briefcase..."
                  onChange={e => setEditing(p => ({ ...p!, icon: e.target.value }))} />
                <datalist id="icon-options">
                  {ICON_OPTIONS.map(i => <option key={i} value={i} />)}
                </datalist>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                System Prompt (instrução para a IA) *
              </Label>
              <Textarea
                rows={5}
                value={editing.systemPrompt ?? ""}
                placeholder="Você é um [papel] brasileiro. Converse com o estudante em português sobre [contexto]. Corrija erros [gentilmente/sutilmente] e forneça [feedback/incentivo]..."
                onChange={e => setEditing(p => ({ ...p!, systemPrompt: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">
                Este texto define o comportamento da IA. Seja específico: mencione o papel, o tom (formal/informal), como corrigir erros e o objetivo pedagógico.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cor</Label>
                <div className="flex gap-1 pt-1">
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
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={editing.active ?? true} onCheckedChange={v => setEditing(p => ({ ...p!, active: v }))} />
                <Label className="text-xs">Ativo</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={!editing.label || !editing.systemPrompt}>
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
          {scenarios.map((s, i) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: s.color + "20" }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-sm">{s.label}</p>
                      <Badge variant={s.active ? "default" : "secondary"} className="text-[10px]">
                        {s.active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{s.icon}</Badge>
                      <span className="text-[10px] text-muted-foreground">ordem {s.order}</span>
                    </div>
                    {s.systemPrompt && (
                      <p className="text-xs text-muted-foreground line-clamp-2 font-mono bg-muted/50 rounded px-2 py-1">
                        {s.systemPrompt.slice(0, 150)}{s.systemPrompt.length > 150 ? "..." : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(s)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {scenarios.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum cenário criado ainda.</p>
              <p className="text-xs text-muted-foreground">
                Quando vazio, o app usa os 5 cenários padrão embutidos no código.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
