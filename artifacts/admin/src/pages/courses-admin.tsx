import { useState, useEffect } from "react";
import { GraduationCap, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronRight } from "lucide-react";
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

type Lesson = { id: string; courseId: string; title: string; content: string; type: string; mediaUrl: string | null; durationMinutes: number; order: number; active: boolean };
type Course = { id: string; title: string; description: string; level: string; category: string; thumbnailUrl: string | null; totalLessons: number; estimatedHours: number; active: boolean; order: number; lessons: Lesson[] };

const BLANK_COURSE: Omit<Course, "id" | "lessons" | "totalLessons"> = { title: "", description: "", level: "B1", category: "", thumbnailUrl: null, estimatedHours: 0, active: false, order: 0 };
const BLANK_LESSON: Omit<Lesson, "id" | "courseId"> = { title: "", content: "", type: "text", mediaUrl: null, durationMinutes: 10, order: 0, active: true };

export default function CoursesAdminPage() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCourse, setEditCourse] = useState<(Partial<Course> & { id?: string }) | null>(null);
  const [editLesson, setEditLesson] = useState<{ courseId: string; lesson: Partial<Lesson> & { id?: string } } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try { setCourses(await adminFetch<Course[]>("/api/admin/courses")); }
    catch { toast({ title: "Erro ao carregar cursos", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveCourse = async () => {
    if (!editCourse?.title) return;
    try {
      if (editCourse.id) await adminSave(`/api/admin/courses/${editCourse.id}`, editCourse, "PUT");
      else await adminSave("/api/admin/courses", editCourse, "POST");
      toast({ title: "Curso salvo" });
      setEditCourse(null);
      load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Excluir curso e todas as aulas?")) return;
    try {
      await adminSave(`/api/admin/courses/${id}`, {}, "DELETE");
      toast({ title: "Curso excluído" });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const saveLesson = async () => {
    if (!editLesson?.lesson?.title) return;
    try {
      const { courseId, lesson } = editLesson;
      if (lesson.id) await adminSave(`/api/admin/courses/${courseId}/lessons/${lesson.id}`, lesson, "PUT");
      else await adminSave(`/api/admin/courses/${courseId}/lessons`, lesson, "POST");
      toast({ title: "Aula salva" });
      setEditLesson(null);
      load();
    } catch { toast({ title: "Erro ao salvar aula", variant: "destructive" }); }
  };

  const deleteLesson = async (courseId: string, lessonId: string) => {
    if (!confirm("Excluir aula?")) return;
    try {
      await adminSave(`/api/admin/courses/${courseId}/lessons/${lessonId}`, {}, "DELETE");
      toast({ title: "Aula excluída" });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Cursos e Aulas</h1>
          <p className="text-sm text-muted-foreground">Gerencie cursos estruturados com aulas em vídeo, texto ou áudio</p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setEditCourse(BLANK_COURSE)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Curso
        </Button>
      </div>

      {editCourse && (
        <Card className="border-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{editCourse.id ? "Editar" : "Novo"} Curso</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Título *</Label>
                <Input value={editCourse.title ?? ""} onChange={e => setEditCourse(c => ({ ...c!, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Input value={editCourse.category ?? ""} placeholder="gramática, vocabulário, oral..." onChange={e => setEditCourse(c => ({ ...c!, category: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea rows={2} value={editCourse.description ?? ""} onChange={e => setEditCourse(c => ({ ...c!, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nível</Label>
                <Select value={editCourse.level ?? "B1"} onValueChange={v => setEditCourse(c => ({ ...c!, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["A0","A1","A2","B1","B2","C1"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Horas est.</Label>
                <Input type="number" step="0.5" value={editCourse.estimatedHours ?? 0} onChange={e => setEditCourse(c => ({ ...c!, estimatedHours: parseFloat(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={editCourse.order ?? 0} onChange={e => setEditCourse(c => ({ ...c!, order: parseInt(e.target.value) }))} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={editCourse.active ?? false} onCheckedChange={v => setEditCourse(c => ({ ...c!, active: v }))} />
                <Label className="text-xs">Ativo</Label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Thumbnail URL</Label>
              <Input value={editCourse.thumbnailUrl ?? ""} placeholder="https://..." onChange={e => setEditCourse(c => ({ ...c!, thumbnailUrl: e.target.value || null }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveCourse}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEditCourse(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <Skeleton className="h-40 w-full" /> : (
        <div className="space-y-3">
          {courses.map(course => (
            <Card key={course.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setExpanded(e => ({ ...e, [course.id]: !e[course.id] }))} className="p-1">
                    {expanded[course.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{course.title}</p>
                      <Badge variant={course.active ? "default" : "secondary"} className="text-[10px]">{course.active ? "Ativo" : "Inativo"}</Badge>
                      <Badge variant="outline" className="text-[10px]">{course.level}</Badge>
                      {course.category && <Badge variant="outline" className="text-[10px]">{course.category}</Badge>}
                      <span className="text-[10px] text-muted-foreground">{course.totalLessons} aulas · {course.estimatedHours}h</span>
                    </div>
                    {course.description && <p className="text-xs text-muted-foreground mt-0.5">{course.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditCourse(course)}><Edit2 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteCourse(course.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>

                {expanded[course.id] && (
                  <div className="mt-4 pl-7 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-muted-foreground uppercase">Aulas</p>
                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditLesson({ courseId: course.id, lesson: BLANK_LESSON })}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar Aula
                      </Button>
                    </div>

                    {editLesson?.courseId === course.id && (
                      <Card className="border-primary/50">
                        <CardContent className="p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Título *</Label>
                              <Input className="h-8" value={editLesson.lesson.title ?? ""} onChange={e => setEditLesson(l => ({ ...l!, lesson: { ...l!.lesson, title: e.target.value } }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Tipo</Label>
                              <Select value={editLesson.lesson.type ?? "text"} onValueChange={v => setEditLesson(l => ({ ...l!, lesson: { ...l!.lesson, type: v } }))}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["text","video","audio","interactive","quiz"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Conteúdo</Label>
                            <Textarea rows={3} value={editLesson.lesson.content ?? ""} onChange={e => setEditLesson(l => ({ ...l!, lesson: { ...l!.lesson, content: e.target.value } }))} />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">URL Mídia</Label>
                              <Input className="h-8" value={editLesson.lesson.mediaUrl ?? ""} onChange={e => setEditLesson(l => ({ ...l!, lesson: { ...l!.lesson, mediaUrl: e.target.value || null } }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Duração (min)</Label>
                              <Input className="h-8" type="number" value={editLesson.lesson.durationMinutes ?? 10} onChange={e => setEditLesson(l => ({ ...l!, lesson: { ...l!.lesson, durationMinutes: parseInt(e.target.value) } }))} />
                            </div>
                            <div className="flex items-end gap-1 pb-1">
                              <Switch checked={editLesson.lesson.active ?? true} onCheckedChange={v => setEditLesson(l => ({ ...l!, lesson: { ...l!.lesson, active: v } }))} />
                              <Label className="text-xs">Ativa</Label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs" onClick={saveLesson}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditLesson(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {course.lessons.map((lesson, i) => (
                      <div key={lesson.id} className="flex items-center gap-2 p-2 rounded border bg-card/50">
                        <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                        <div className="flex-1">
                          <p className="text-xs font-medium">{lesson.title}</p>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-[9px]">{lesson.type}</Badge>
                            {!lesson.active && <Badge variant="secondary" className="text-[9px]">inativa</Badge>}
                            <span className="text-[9px] text-muted-foreground">{lesson.durationMinutes}min</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditLesson({ courseId: course.id, lesson })}><Edit2 className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteLesson(course.id, lesson.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                    {course.lessons.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhuma aula adicionada.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {courses.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhum curso criado ainda.</p>}
        </div>
      )}
    </div>
  );
}
