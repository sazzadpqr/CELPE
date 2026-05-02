import { useState, useEffect } from "react";
import { BookOpen, Plus, Trash2, Edit2, Save, X, Tag } from "lucide-react";
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

type Category = { id: string; title: string; description: string; icon: string; color: string; order: number; active: boolean };
type Material = { id: string; categoryId: string | null; title: string; description: string; content: string; level: string; materialType: string; externalUrl: string; isPremium: boolean; status: string; order: number; estimatedMinutes: number };

const BLANK_CAT: Omit<Category, "id"> = { title: "", description: "", icon: "book", color: "#185FA5", order: 0, active: true };
const BLANK_MAT: Omit<Material, "id"> = { categoryId: null, title: "", description: "", content: "", level: "B1", materialType: "article", externalUrl: "", isPremium: false, status: "draft", order: 0, estimatedMinutes: 10 };

export default function StudyLibraryPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"categories" | "materials">("materials");
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCat, setEditCat] = useState<(Partial<Category> & { id?: string }) | null>(null);
  const [editMat, setEditMat] = useState<(Partial<Material> & { id?: string }) | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [cats, mats] = await Promise.all([
        adminFetch<Category[]>("/api/admin/study-categories"),
        adminFetch<Material[]>("/api/admin/study-materials"),
      ]);
      setCategories(cats);
      setMaterials(mats);
    } catch { toast({ title: "Erro ao carregar", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveCat = async () => {
    if (!editCat?.title) return;
    try {
      if (editCat.id) {
        await adminSave(`/api/admin/study-categories/${editCat.id}`, editCat, "PUT");
      } else {
        await adminSave("/api/admin/study-categories", editCat, "POST");
      }
      toast({ title: "Categoria salva" });
      setEditCat(null);
      load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const deleteCat = async (id: string) => {
    if (!confirm("Excluir categoria?")) return;
    try {
      await adminSave(`/api/admin/study-categories/${id}`, {}, "DELETE");
      toast({ title: "Categoria excluída" });
      load();
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const saveMat = async () => {
    if (!editMat?.title) return;
    try {
      if (editMat.id) {
        await adminSave(`/api/admin/study-materials/${editMat.id}`, editMat, "PUT");
      } else {
        await adminSave("/api/admin/study-materials", editMat, "POST");
      }
      toast({ title: "Material salvo" });
      setEditMat(null);
      load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const deleteMat = async (id: string) => {
    if (!confirm("Excluir material?")) return;
    try {
      await adminSave(`/api/admin/study-materials/${id}`, {}, "DELETE");
      toast({ title: "Material excluído" });
      load();
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const filteredMats = materials.filter(m =>
    (filterCat === "all" || m.categoryId === filterCat) &&
    (filterStatus === "all" || m.status === filterStatus)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Biblioteca de Estudo</h1>
          <p className="text-sm text-muted-foreground">Gerencie categorias e materiais de estudo</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["materials", "categories"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
            {t === "materials" ? "Materiais" : "Categorias"}
          </Button>
        ))}
      </div>

      {tab === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setEditCat(BLANK_CAT)}>
              <Plus className="h-4 w-4 mr-1" /> Nova Categoria
            </Button>
          </div>

          {editCat && (
            <Card className="border-primary">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{editCat.id ? "Editar" : "Nova"} Categoria</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Título *</Label>
                    <Input value={editCat.title ?? ""} onChange={e => setEditCat(c => ({ ...c!, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ícone</Label>
                    <Input value={editCat.icon ?? ""} placeholder="book, headphones, edit..." onChange={e => setEditCat(c => ({ ...c!, icon: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Input value={editCat.description ?? ""} onChange={e => setEditCat(c => ({ ...c!, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Cor</Label>
                    <Input type="color" value={editCat.color ?? "#185FA5"} onChange={e => setEditCat(c => ({ ...c!, color: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ordem</Label>
                    <Input type="number" value={editCat.order ?? 0} onChange={e => setEditCat(c => ({ ...c!, order: parseInt(e.target.value) }))} />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Switch checked={editCat.active ?? true} onCheckedChange={v => setEditCat(c => ({ ...c!, active: v }))} />
                    <Label className="text-xs">Ativo</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveCat}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditCat(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? <Skeleton className="h-40 w-full" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map(cat => (
                <Card key={cat.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-bold" style={{ background: cat.color }}>
                      {cat.icon[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{cat.title}</p>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                      <div className="flex gap-1 mt-1">
                        {cat.active ? <Badge variant="outline" className="text-[10px]">Ativo</Badge> : <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                        <span className="text-[10px] text-muted-foreground">ordem: {cat.order}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditCat(cat)}><Edit2 className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteCat(cat.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "materials" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="ml-auto" onClick={() => setEditMat(BLANK_MAT)}>
              <Plus className="h-4 w-4 mr-1" /> Novo Material
            </Button>
          </div>

          {editMat && (
            <Card className="border-primary">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{editMat.id ? "Editar" : "Novo"} Material</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Título *</Label>
                    <Input value={editMat.title ?? ""} onChange={e => setEditMat(m => ({ ...m!, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Categoria</Label>
                    <Select value={editMat.categoryId ?? "none"} onValueChange={v => setEditMat(m => ({ ...m!, categoryId: v === "none" ? null : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Input value={editMat.description ?? ""} onChange={e => setEditMat(m => ({ ...m!, description: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Conteúdo</Label>
                  <Textarea rows={4} value={editMat.content ?? ""} onChange={e => setEditMat(m => ({ ...m!, content: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nível</Label>
                    <Select value={editMat.level ?? "B1"} onValueChange={v => setEditMat(m => ({ ...m!, level: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["A0","A1","A2","B1","B2","C1"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={editMat.materialType ?? "article"} onValueChange={v => setEditMat(m => ({ ...m!, materialType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["article","video","audio","pdf","exercise","quiz","model_text"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={editMat.status ?? "draft"} onValueChange={v => setEditMat(m => ({ ...m!, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="published">Publicado</SelectItem>
                        <SelectItem value="archived">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">URL Externa</Label>
                    <Input value={editMat.externalUrl ?? ""} onChange={e => setEditMat(m => ({ ...m!, externalUrl: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tempo estimado (min)</Label>
                    <Input type="number" value={editMat.estimatedMinutes ?? 10} onChange={e => setEditMat(m => ({ ...m!, estimatedMinutes: parseInt(e.target.value) }))} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editMat.isPremium ?? false} onCheckedChange={v => setEditMat(m => ({ ...m!, isPremium: v }))} />
                  <Label className="text-xs">Premium</Label>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveMat}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditMat(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? <Skeleton className="h-40 w-full" /> : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-mono">{filteredMats.length} material(is)</p>
              {filteredMats.map(mat => (
                <Card key={mat.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{mat.title}</p>
                        <Badge variant={mat.status === "published" ? "default" : "secondary"} className="text-[10px]">{mat.status}</Badge>
                        {mat.isPremium && <Badge className="text-[10px] bg-yellow-500 text-black">Premium</Badge>}
                        <Badge variant="outline" className="text-[10px]">{mat.level}</Badge>
                        <Badge variant="outline" className="text-[10px]">{mat.materialType}</Badge>
                      </div>
                      {mat.description && <p className="text-xs text-muted-foreground mt-0.5">{mat.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditMat(mat)}><Edit2 className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMat(mat.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredMats.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhum material encontrado. Clique em "Novo Material" para adicionar.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
