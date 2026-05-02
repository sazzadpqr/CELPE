import { useState, useEffect } from "react";
import { Map, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type Step = { id: string; pathId: string; title: string; description: string; stepType: string; linkedId: string | null; externalUrl: string; order: number; isOptional: boolean; estimatedMinutes: number };
type Path = { id: string; title: string; description: string; level: string; targetLevel: string; durationWeeks: number; isPremium: boolean; status: string; order: number; thumbnailUrl: string; steps: Step[] };

const BLANK_PATH: Omit<Path, "id" | "steps"> = { title: "", description: "", level: "B1", targetLevel: "B2", durationWeeks: 8, isPremium: false, status: "draft", order: 0, thumbnailUrl: "" };
const BLANK_STEP: Omit<Step, "id" | "pathId"> = { title: "", description: "", stepType: "material", linkedId: null, externalUrl: "", order: 0, isOptional: false, estimatedMinutes: 20 };

export default function LearningPathsPage() {
  const { toast } = useToast();
  const [paths, setPaths] = useState<Path[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPath, setEditPath] = useState<(Partial<Path> & { id?: string }) | null>(null);
  const [editStep, setEditStep] = useState<{ pathId: string; step: Partial<Step> & { id?: string } } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      setPaths(await adminFetch<Path[]>("/api/admin/learning-paths"));
    } catch { toast({ title: "Erro ao carregar trilhas", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const savePath = async () => {
    if (!editPath?.title) return;
    try {
      if (editPath.id) await adminSave(`/api/admin/learning-paths/${editPath.id}`, editPath, "PUT");
      else await adminSave("/api/admin/learning-paths", editPath, "POST");
      toast({ title: "Trilha salva" });
      setEditPath(null);
      load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const deletePath = async (id: string) => {
    if (!confirm("Excluir trilha e todos os seus passos?")) return;
    try {
      await adminSave(`/api/admin/learning-paths/${id}`, {}, "DELETE");
      toast({ title: "Trilha excluída" });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const saveStep = async () => {
    if (!editStep?.step?.title) return;
    try {
      const { pathId, step } = editStep;
      if (step.id) await adminSave(`/api/admin/learning-paths/${pathId}/steps/${step.id}`, step, "PUT");
      else await adminSave(`/api/admin/learning-paths/${pathId}/steps`, step, "POST");
      toast({ title: "Passo salvo" });
      setEditStep(null);
      load();
    } catch { toast({ title: "Erro ao salvar passo", variant: "destructive" }); }
  };

  const deleteStep = async (pathId: string, stepId: string) => {
    if (!confirm("Excluir passo?")) return;
    try {
      await adminSave(`/api/admin/learning-paths/${pathId}/steps/${stepId}`, {}, "DELETE");
      toast({ title: "Passo excluído" });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Map className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Trilhas de Aprendizado</h1>
          <p className="text-sm text-muted-foreground">Crie trilhas estruturadas de estudo do A0 ao C1</p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setEditPath(BLANK_PATH)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Trilha
        </Button>
      </div>

      {editPath && (
        <Card className="border-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{editPath.id ? "Editar" : "Nova"} Trilha</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título *</Label>
              <Input value={editPath.title ?? ""} onChange={e => setEditPath(p => ({ ...p!, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea rows={2} value={editPath.description ?? ""} onChange={e => setEditPath(p => ({ ...p!, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nível inicial</Label>
                <Select value={editPath.level ?? "B1"} onValueChange={v => setEditPath(p => ({ ...p!, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["A0","A1","A2","B1","B2","C1"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nível alvo</Label>
                <Select value={editPath.targetLevel ?? "B2"} onValueChange={v => setEditPath(p => ({ ...p!, targetLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["A1","A2","B1","B2","C1"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Semanas</Label>
                <Input type="number" value={editPath.durationWeeks ?? 8} onChange={e => setEditPath(p => ({ ...p!, durationWeeks: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={editPath.status ?? "draft"} onValueChange={v => setEditPath(p => ({ ...p!, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={editPath.isPremium ?? false} onCheckedChange={v => setEditPath(p => ({ ...p!, isPremium: v }))} />
                <Label className="text-xs">Premium</Label>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Ordem</Label>
                <Input type="number" className="w-20" value={editPath.order ?? 0} onChange={e => setEditPath(p => ({ ...p!, order: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={savePath}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEditPath(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <Skeleton className="h-40 w-full" /> : (
        <div className="space-y-3">
          {paths.map(path => (
            <Card key={path.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setExpanded(e => ({ ...e, [path.id]: !e[path.id] }))} className="p-1">
                    {expanded[path.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{path.title}</p>
                      <Badge variant={path.status === "published" ? "default" : "secondary"} className="text-[10px]">{path.status}</Badge>
                      {path.isPremium && <Badge className="text-[10px] bg-yellow-500 text-black">Premium</Badge>}
                      <Badge variant="outline" className="text-[10px]">{path.level} → {path.targetLevel}</Badge>
                      <span className="text-[10px] text-muted-foreground">{path.durationWeeks}sem · {path.steps.length} passos</span>
                    </div>
                    {path.description && <p className="text-xs text-muted-foreground mt-0.5">{path.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditPath(path)}><Edit2 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deletePath(path.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>

                {expanded[path.id] && (
                  <div className="mt-4 pl-7 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-muted-foreground uppercase">Passos</p>
                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditStep({ pathId: path.id, step: BLANK_STEP })}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar Passo
                      </Button>
                    </div>

                    {editStep?.pathId === path.id && (
                      <Card className="border-primary/50">
                        <CardContent className="p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Título *</Label>
                              <Input className="h-8" value={editStep.step.title ?? ""} onChange={e => setEditStep(s => ({ ...s!, step: { ...s!.step, title: e.target.value } }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Tipo</Label>
                              <Select value={editStep.step.stepType ?? "material"} onValueChange={v => setEditStep(s => ({ ...s!, step: { ...s!.step, stepType: v } }))}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["material","lesson","practice","quiz","external_resource","video"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Ordem</Label>
                              <Input className="h-8" type="number" value={editStep.step.order ?? 0} onChange={e => setEditStep(s => ({ ...s!, step: { ...s!.step, order: parseInt(e.target.value) } }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Minutos est.</Label>
                              <Input className="h-8" type="number" value={editStep.step.estimatedMinutes ?? 20} onChange={e => setEditStep(s => ({ ...s!, step: { ...s!.step, estimatedMinutes: parseInt(e.target.value) } }))} />
                            </div>
                            <div className="flex items-end gap-1 pb-1">
                              <Switch checked={editStep.step.isOptional ?? false} onCheckedChange={v => setEditStep(s => ({ ...s!, step: { ...s!.step, isOptional: v } }))} />
                              <Label className="text-xs">Opcional</Label>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">URL externa</Label>
                            <Input className="h-8" value={editStep.step.externalUrl ?? ""} onChange={e => setEditStep(s => ({ ...s!, step: { ...s!.step, externalUrl: e.target.value } }))} placeholder="https://..." />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs" onClick={saveStep}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditStep(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {path.steps.map((step, i) => (
                      <div key={step.id} className="flex items-center gap-2 p-2 rounded border bg-card/50">
                        <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                        <div className="flex-1">
                          <p className="text-xs font-medium">{step.title}</p>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-[9px]">{step.stepType}</Badge>
                            {step.isOptional && <Badge variant="secondary" className="text-[9px]">opcional</Badge>}
                            <span className="text-[9px] text-muted-foreground">{step.estimatedMinutes}min</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditStep({ pathId: path.id, step })}><Edit2 className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteStep(path.id, step.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                    {path.steps.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhum passo adicionado.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {paths.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma trilha criada.</p>}
        </div>
      )}
    </div>
  );
}
