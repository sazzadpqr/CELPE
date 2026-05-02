import { useState, useEffect } from "react";
import { Volume2, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronRight } from "lucide-react";
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

type Word = { id: string; categoryId: string; word: string; ipa: string; tip: string; example: string; order: number };
type Category = { id: string; title: string; icon: string; color: string; order: number; active: boolean; words: Word[] };

const BLANK_CAT: Omit<Category, "id" | "words"> = { title: "", icon: "volume-2", color: "#185FA5", order: 0, active: true };
const BLANK_WORD: Omit<Word, "id" | "categoryId"> = { word: "", ipa: "", tip: "", example: "", order: 0 };
const COLOR_OPTIONS = ["#185FA5", "#1D9E75", "#6B21A8", "#D85A30", "#BA7517"];

export default function PronunciationContentPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCat, setEditCat] = useState<(Partial<Category> & { id?: string }) | null>(null);
  const [editWord, setEditWord] = useState<{ catId: string; word: Partial<Word> & { id?: string } } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try { setCategories(await adminFetch<Category[]>("/api/admin/pronunciation/categories")); }
    catch { toast({ title: "Erro ao carregar", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveCat = async () => {
    if (!editCat?.title) return;
    try {
      if (editCat.id) await adminSave(`/api/admin/pronunciation/categories/${editCat.id}`, editCat, "PUT");
      else await adminSave("/api/admin/pronunciation/categories", editCat, "POST");
      toast({ title: "Categoria salva" });
      setEditCat(null);
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const deleteCat = async (id: string) => {
    if (!confirm("Excluir categoria e todas as palavras?")) return;
    try {
      await adminSave(`/api/admin/pronunciation/categories/${id}`, {}, "DELETE");
      toast({ title: "Categoria excluída" });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const saveWord = async () => {
    if (!editWord?.word?.word) return;
    try {
      if (editWord.word.id) await adminSave(`/api/admin/pronunciation/words/${editWord.word.id}`, editWord.word, "PUT");
      else await adminSave(`/api/admin/pronunciation/categories/${editWord.catId}/words`, editWord.word, "POST");
      toast({ title: "Palavra salva" });
      setEditWord(null);
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const deleteWord = async (wordId: string) => {
    if (!confirm("Excluir palavra?")) return;
    try {
      await adminSave(`/api/admin/pronunciation/words/${wordId}`, {}, "DELETE");
      toast({ title: "Palavra excluída" });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Volume2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Pronúncia</h1>
          <p className="text-sm text-muted-foreground">Categorias fonéticas e palavras com transcrição IPA, dicas e exemplos</p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setEditCat(BLANK_CAT)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Categoria
        </Button>
      </div>

      {editCat && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{editCat.id ? "Editar" : "Nova"} Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Título *</Label>
                <Input value={editCat.title ?? ""} placeholder="Ex: Vogais Nasais"
                  onChange={e => setEditCat(p => ({ ...p!, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ícone (Feather)</Label>
                <Input value={editCat.icon ?? "volume-2"} placeholder="wind, zap, radio..."
                  onChange={e => setEditCat(p => ({ ...p!, icon: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cor</Label>
                <div className="flex gap-1">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} onClick={() => setEditCat(p => ({ ...p!, color: c }))}
                      className={`w-6 h-6 rounded-full border-2 ${editCat.color === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={editCat.order ?? 0}
                  onChange={e => setEditCat(p => ({ ...p!, order: parseInt(e.target.value) }))} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={editCat.active ?? true} onCheckedChange={v => setEditCat(p => ({ ...p!, active: v }))} />
                <Label className="text-xs">Ativa</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveCat} disabled={!editCat.title}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEditCat(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <Skeleton className="h-40 w-full" /> : (
        <div className="space-y-3">
          {categories.map(cat => (
            <Card key={cat.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setExpanded(e => ({ ...e, [cat.id]: !e[cat.id] }))} className="p-1 shrink-0">
                    {expanded[cat.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{cat.title}</p>
                      <Badge variant={cat.active ? "default" : "secondary"} className="text-[10px]">
                        {cat.active ? "Ativa" : "Inativa"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{cat.words.length} palavras · {cat.icon}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditCat(cat)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteCat(cat.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {expanded[cat.id] && (
                  <div className="mt-4 pl-9 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-muted-foreground uppercase">Palavras</p>
                      <Button size="sm" variant="outline" className="h-6 text-xs"
                        onClick={() => setEditWord({ catId: cat.id, word: BLANK_WORD })}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar Palavra
                      </Button>
                    </div>

                    {editWord?.catId === cat.id && (
                      <Card className="border-primary/50">
                        <CardContent className="p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Palavra *</Label>
                              <Input className="h-8" placeholder="Ex: irmã"
                                value={editWord.word.word ?? ""}
                                onChange={e => setEditWord(w => ({ ...w!, word: { ...w!.word, word: e.target.value } }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">IPA</Label>
                              <Input className="h-8" placeholder="/iɾˈmɐ̃/"
                                value={editWord.word.ipa ?? ""}
                                onChange={e => setEditWord(w => ({ ...w!, word: { ...w!.word, ipa: e.target.value } }))} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Dica Fonética</Label>
                            <Input className="h-8" placeholder="Explique como pronunciar..."
                              value={editWord.word.tip ?? ""}
                              onChange={e => setEditWord(w => ({ ...w!, word: { ...w!.word, tip: e.target.value } }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Exemplo (frase)</Label>
                            <Input className="h-8" placeholder="Ex: Minha irmã mora em São Paulo."
                              value={editWord.word.example ?? ""}
                              onChange={e => setEditWord(w => ({ ...w!, word: { ...w!.word, example: e.target.value } }))} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs" onClick={saveWord} disabled={!editWord.word.word}>
                              <Save className="h-3 w-3 mr-1" /> Salvar
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditWord(null)}>
                              <X className="h-3 w-3 mr-1" /> Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {cat.words.map((w, i) => (
                      <div key={w.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card/50">
                        <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{w.word}</span>
                            <span className="text-xs text-muted-foreground font-mono">{w.ipa}</span>
                          </div>
                          {w.tip && <p className="text-[10px] text-muted-foreground truncate">{w.tip}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                            onClick={() => setEditWord({ catId: cat.id, word: w })}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                            onClick={() => deleteWord(w.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {cat.words.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Nenhuma palavra adicionada.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <Volume2 className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhuma categoria criada ainda.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
