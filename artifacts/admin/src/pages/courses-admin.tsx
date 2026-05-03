import { useState, useEffect } from "react";
import { GraduationCap, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronRight, Youtube, Video, FileText } from "lucide-react";
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

type Lesson = {
  id: string;
  courseId: string;
  title: string;
  content: string;
  type: string;
  mediaUrl: string | null;
  durationMinutes: number;
  order: number;
  active: boolean;
};

type Course = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  category: string;
  thumbnailUrl: string | null;
  totalLessons: number;
  estimatedHours: number;
  active: boolean;
  isPremium: boolean;
  order: number;
  lessons: Lesson[];
};

const BLANK_COURSE: Omit<Course, "id" | "lessons" | "totalLessons"> = {
  title: "",
  subtitle: "",
  description: "",
  level: "B1",
  category: "",
  thumbnailUrl: null,
  estimatedHours: 0,
  active: false,
  isPremium: false,
  order: 0,
};

const BLANK_LESSON: Omit<Lesson, "id" | "courseId"> = {
  title: "",
  content: "",
  type: "youtube",
  mediaUrl: null,
  durationMinutes: 10,
  order: 0,
  active: true,
};

const LESSON_TYPES = [
  { value: "youtube", label: "YouTube (embed)", icon: Youtube, hint: "https://youtube.com/watch?v=..." },
  { value: "video", label: "Vídeo direto (URL)", icon: Video, hint: "https://exemplo.com/video.mp4" },
  { value: "text", label: "Texto / Artigo", icon: FileText, hint: "" },
  { value: "audio", label: "Áudio", icon: null, hint: "https://exemplo.com/audio.mp3" },
  { value: "interactive", label: "Interativo", icon: null, hint: "" },
  { value: "quiz", label: "Quiz", icon: null, hint: "" },
];

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]{11})/);
  return match?.[1] ?? null;
}

export default function CoursesAdminPage() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCourse, setEditCourse] = useState<(Partial<Course> & { id?: string }) | null>(null);
  const [editLesson, setEditLesson] = useState<{ courseId: string; lesson: Partial<Lesson> & { id?: string } } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      setCourses(await adminFetch<Course[]>("/api/admin/courses"));
    } catch {
      toast({ title: "Erro ao carregar cursos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Excluir este curso e todas as suas aulas?")) return;
    try {
      await adminSave(`/api/admin/courses/${id}`, {}, "DELETE");
      toast({ title: "Curso excluído" });
      load();
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
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
    } catch {
      toast({ title: "Erro ao salvar aula", variant: "destructive" });
    }
  };

  const deleteLesson = async (courseId: string, lessonId: string) => {
    if (!confirm("Excluir esta aula?")) return;
    try {
      await adminSave(`/api/admin/courses/${courseId}/lessons/${lessonId}`, {}, "DELETE");
      toast({ title: "Aula excluída" });
      load();
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const lessonTypeInfo = (type: string) => LESSON_TYPES.find((t) => t.value === type);
  const isVideoType = (type: string) => type === "youtube" || type === "video";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GraduationCap className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Cursos e Aulas</h1>
          <p className="text-sm text-muted-foreground">
            Crie cursos com vídeos do YouTube, vídeos diretos ou conteúdo em texto
          </p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setEditCourse(BLANK_COURSE)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Curso
        </Button>
      </div>

      {/* Course Editor */}
      {editCourse && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{editCourse.id ? "Editar" : "Novo"} Curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Título *</Label>
                <Input
                  value={editCourse.title ?? ""}
                  placeholder="Ex: Gramática Avançada para Celpe-Bras"
                  onChange={(e) => setEditCourse((c) => ({ ...c!, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subtítulo</Label>
                <Input
                  value={editCourse.subtitle ?? ""}
                  placeholder="Ex: Do B1 ao C1 em 8 semanas"
                  onChange={(e) => setEditCourse((c) => ({ ...c!, subtitle: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                rows={2}
                placeholder="Descreva o conteúdo do curso, público-alvo e objetivos..."
                value={editCourse.description ?? ""}
                onChange={(e) => setEditCourse((c) => ({ ...c!, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nível</Label>
                <Select
                  value={editCourse.level ?? "B1"}
                  onValueChange={(v) => setEditCourse((c) => ({ ...c!, level: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A0", "A1", "A2", "B1", "B2", "C1"].map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Input
                  value={editCourse.category ?? ""}
                  placeholder="gramática, oral..."
                  onChange={(e) => setEditCourse((c) => ({ ...c!, category: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Horas est.</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editCourse.estimatedHours ?? 0}
                  onChange={(e) => setEditCourse((c) => ({ ...c!, estimatedHours: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch
                  checked={editCourse.active ?? false}
                  onCheckedChange={(v) => setEditCourse((c) => ({ ...c!, active: v }))}
                />
                <Label className="text-xs">Ativo</Label>
              </div>
            </div>
            <div className="flex gap-6 items-center py-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editCourse.isPremium ?? false}
                  onCheckedChange={(v) => setEditCourse((c) => ({ ...c!, isPremium: v }))}
                />
                <Label className="text-xs">Exclusivo Premium</Label>
              </div>
              <p className="text-xs text-muted-foreground">Usuários gratuitos verão este curso bloqueado e serão direcionados ao paywall.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Thumbnail URL (opcional)</Label>
              <Input
                value={editCourse.thumbnailUrl ?? ""}
                placeholder="https://..."
                onChange={(e) => setEditCourse((c) => ({ ...c!, thumbnailUrl: e.target.value || null }))}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveCourse} disabled={!editCourse.title}>
                <Save className="h-3 w-3 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditCourse(null)}>
                <X className="h-3 w-3 mr-1" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course List */}
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-4">
                {/* Course row */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setExpanded((e) => ({ ...e, [course.id]: !e[course.id] }))}
                    className="p-1 mt-0.5 shrink-0"
                  >
                    {expanded[course.id]
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{course.title}</p>
                      <Badge variant={course.active ? "default" : "secondary"} className="text-[10px]">
                        {course.active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{course.level}</Badge>
                      {course.isPremium && (
                        <Badge className="text-[10px] bg-violet-600 hover:bg-violet-700">⭐ Premium</Badge>
                      )}
                      {course.category && (
                        <Badge variant="outline" className="text-[10px]">{course.category}</Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {course.totalLessons} aulas · {course.estimatedHours}h
                      </span>
                    </div>
                    {course.subtitle && (
                      <p className="text-xs text-primary mt-0.5">{course.subtitle}</p>
                    )}
                    {course.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{course.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditCourse(course)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => deleteCourse(course.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Expanded lessons */}
                {expanded[course.id] && (
                  <div className="mt-4 pl-8 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-muted-foreground uppercase">Aulas</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs"
                        onClick={() => setEditLesson({ courseId: course.id, lesson: BLANK_LESSON })}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar Aula
                      </Button>
                    </div>

                    {/* Lesson editor */}
                    {editLesson?.courseId === course.id && (
                      <Card className="border-primary/50">
                        <CardContent className="p-3 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Título da Aula *</Label>
                              <Input
                                className="h-8"
                                placeholder="Ex: Introdução ao subjuntivo"
                                value={editLesson.lesson.title ?? ""}
                                onChange={(e) =>
                                  setEditLesson((l) => ({ ...l!, lesson: { ...l!.lesson, title: e.target.value } }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Tipo de Aula</Label>
                              <Select
                                value={editLesson.lesson.type ?? "youtube"}
                                onValueChange={(v) =>
                                  setEditLesson((l) => ({ ...l!, lesson: { ...l!.lesson, type: v, mediaUrl: null } }))
                                }
                              >
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {LESSON_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Media URL for video/youtube/audio */}
                          {isVideoType(editLesson.lesson.type ?? "youtube") && (
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {editLesson.lesson.type === "youtube" ? "URL do YouTube" : "URL do Vídeo"}
                              </Label>
                              <Input
                                className="h-8"
                                placeholder={lessonTypeInfo(editLesson.lesson.type ?? "youtube")?.hint ?? "https://..."}
                                value={editLesson.lesson.mediaUrl ?? ""}
                                onChange={(e) =>
                                  setEditLesson((l) => ({
                                    ...l!,
                                    lesson: { ...l!.lesson, mediaUrl: e.target.value || null },
                                  }))
                                }
                              />
                              {editLesson.lesson.type === "youtube" &&
                                editLesson.lesson.mediaUrl &&
                                extractYouTubeId(editLesson.lesson.mediaUrl) && (
                                  <div className="mt-1 rounded overflow-hidden border border-border aspect-video max-w-xs">
                                    <iframe
                                      src={`https://www.youtube.com/embed/${extractYouTubeId(editLesson.lesson.mediaUrl!)}?rel=0`}
                                      className="w-full h-full"
                                      allowFullScreen
                                    />
                                  </div>
                                )}
                            </div>
                          )}

                          {editLesson.lesson.type === "audio" && (
                            <div className="space-y-1">
                              <Label className="text-xs">URL do Áudio</Label>
                              <Input
                                className="h-8"
                                placeholder={lessonTypeInfo("audio")?.hint ?? "https://..."}
                                value={editLesson.lesson.mediaUrl ?? ""}
                                onChange={(e) =>
                                  setEditLesson((l) => ({
                                    ...l!,
                                    lesson: { ...l!.lesson, mediaUrl: e.target.value || null },
                                  }))
                                }
                              />
                            </div>
                          )}

                          <div className="space-y-1">
                            <Label className="text-xs">
                              Conteúdo / Descrição
                              {editLesson.lesson.type === "text" && " *"}
                            </Label>
                            <Textarea
                              rows={3}
                              placeholder={
                                editLesson.lesson.type === "text"
                                  ? "Conteúdo completo da aula em texto..."
                                  : "Descrição ou notas sobre a aula (opcional)"
                              }
                              value={editLesson.lesson.content ?? ""}
                              onChange={(e) =>
                                setEditLesson((l) => ({ ...l!, lesson: { ...l!.lesson, content: e.target.value } }))
                              }
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Duração (min)</Label>
                              <Input
                                className="h-8"
                                type="number"
                                value={editLesson.lesson.durationMinutes ?? 10}
                                onChange={(e) =>
                                  setEditLesson((l) => ({
                                    ...l!,
                                    lesson: { ...l!.lesson, durationMinutes: parseInt(e.target.value) },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Ordem</Label>
                              <Input
                                className="h-8"
                                type="number"
                                value={editLesson.lesson.order ?? 0}
                                onChange={(e) =>
                                  setEditLesson((l) => ({
                                    ...l!,
                                    lesson: { ...l!.lesson, order: parseInt(e.target.value) },
                                  }))
                                }
                              />
                            </div>
                            <div className="flex items-end gap-1 pb-1">
                              <Switch
                                checked={editLesson.lesson.active ?? true}
                                onCheckedChange={(v) =>
                                  setEditLesson((l) => ({ ...l!, lesson: { ...l!.lesson, active: v } }))
                                }
                              />
                              <Label className="text-xs">Ativa</Label>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={saveLesson}
                              disabled={!editLesson.lesson.title}
                            >
                              <Save className="h-3 w-3 mr-1" /> Salvar Aula
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setEditLesson(null)}
                            >
                              <X className="h-3 w-3 mr-1" /> Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Lesson list */}
                    {course.lessons.map((lesson, i) => {
                      const typeInfo = lessonTypeInfo(lesson.type);
                      const ytId = lesson.type === "youtube" && lesson.mediaUrl
                        ? extractYouTubeId(lesson.mediaUrl)
                        : null;
                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-2 p-2 rounded-lg border bg-card/50"
                        >
                          <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                          {ytId && (
                            <img
                              src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
                              alt=""
                              className="w-12 h-9 object-cover rounded shrink-0"
                            />
                          )}
                          {lesson.type === "video" && (
                            <div className="w-12 h-9 rounded bg-muted flex items-center justify-center shrink-0">
                              <Video className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{lesson.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[9px] px-1">{typeInfo?.label ?? lesson.type}</Badge>
                              {!lesson.active && (
                                <Badge variant="secondary" className="text-[9px] px-1">inativa</Badge>
                              )}
                              <span className="text-[9px] text-muted-foreground">{lesson.durationMinutes}min</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditLesson({ courseId: course.id, lesson })}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={() => deleteLesson(course.id, lesson.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {course.lessons.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        Nenhuma aula adicionada ainda. Clique em "Adicionar Aula" para começar.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {courses.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum curso criado ainda.</p>
              <p className="text-xs text-muted-foreground">Clique em "Novo Curso" para começar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
