import {
  useListAdminQuizCategories,
  getListAdminQuizCategoriesQueryKey,
  useCreateAdminQuizCategory,
  useUpdateAdminQuizCategory,
  useDeleteAdminQuizCategory,
  useListAdminQuizQuestions,
  getListAdminQuizQuestionsQueryKey,
  useCreateAdminQuizQuestion,
  useUpdateAdminQuizQuestion,
  useDeleteAdminQuizQuestion,
  useGetAdminQuizLesson,
  getGetAdminQuizLessonQueryKey,
  useUpsertAdminQuizLesson,
  type QuizCategory,
  type QuizCategoryBody,
  type QuizQuestion,
  type QuizQuestionBody,
  type QuizLessonBody,
  type LessonExample,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, ChevronRight, CheckCircle2, BookOpen, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EMPTY_CAT: QuizCategoryBody = { title: "", description: "", color: "#185FA5", icon: "book", active: true };
const EMPTY_Q: QuizQuestionBody = { categoryId: "", question: "", options: ["", "", "", ""], correct: 0, explanation: "", order: 1 };
const EMPTY_LESSON: QuizLessonBody = {
  rule: "",
  examples: [{ sentence: "", highlight: "", note: "" }],
  mistake: { wrong: "", right: "", reason: "" },
  tip: "",
};

export default function QuizPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories, isLoading: catsLoading } = useListAdminQuizCategories({
    query: { queryKey: getListAdminQuizCategoriesQueryKey() }
  });

  const [selectedCat, setSelectedCat] = useState<QuizCategory | null>(null);

  const { data: questions, isLoading: qsLoading } = useListAdminQuizQuestions(
    { categoryId: selectedCat?.id },
    { query: { queryKey: getListAdminQuizQuestionsQueryKey({ categoryId: selectedCat?.id }), enabled: !!selectedCat } }
  );

  const createCat = useCreateAdminQuizCategory();
  const updateCat = useUpdateAdminQuizCategory();
  const deleteCat = useDeleteAdminQuizCategory();
  const createQ = useCreateAdminQuizQuestion();
  const updateQ = useUpdateAdminQuizQuestion();
  const deleteQ = useDeleteAdminQuizQuestion();
  const upsertLesson = useUpsertAdminQuizLesson();

  const { data: lessonData, isLoading: lessonLoading } = useGetAdminQuizLesson(
    selectedCat?.id ?? "",
    { query: { queryKey: getGetAdminQuizLessonQueryKey(selectedCat?.id ?? ""), enabled: !!selectedCat } }
  );

  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<QuizCategory | null>(null);
  const [catForm, setCatForm] = useState<QuizCategoryBody>(EMPTY_CAT);

  const [qDialog, setQDialog] = useState(false);
  const [editingQ, setEditingQ] = useState<QuizQuestion | null>(null);
  const [qForm, setQForm] = useState<QuizQuestionBody>(EMPTY_Q);

  const [lessonDialog, setLessonDialog] = useState(false);
  const [lessonForm, setLessonForm] = useState<QuizLessonBody>(EMPTY_LESSON);
  const [activeTab, setActiveTab] = useState("questions");

  const [deleteTarget, setDeleteTarget] = useState<{ type: "cat" | "q"; id: string } | null>(null);

  useEffect(() => {
    setActiveTab("questions");
  }, [selectedCat?.id]);

  const openLessonEditor = () => {
    setLessonForm(lessonData
      ? { rule: lessonData.rule, examples: lessonData.examples.length ? lessonData.examples : [{ sentence: "", highlight: "", note: "" }], mistake: lessonData.mistake, tip: lessonData.tip }
      : EMPTY_LESSON
    );
    setLessonDialog(true);
  };

  const saveLesson = () => {
    if (!selectedCat) return;
    upsertLesson.mutate({ id: selectedCat.id, data: lessonForm }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminQuizLessonQueryKey(selectedCat.id) });
        setLessonDialog(false);
        toast({ title: "Lesson saved" });
      },
      onError: () => toast({ title: "Save failed", variant: "destructive" }),
    });
  };

  const updateExample = (idx: number, field: keyof LessonExample, value: string) => {
    const examples = [...lessonForm.examples];
    examples[idx] = { ...examples[idx]!, [field]: value };
    setLessonForm({ ...lessonForm, examples });
  };

  const addExample = () => setLessonForm({ ...lessonForm, examples: [...lessonForm.examples, { sentence: "", highlight: "", note: "" }] });
  const removeExample = (idx: number) => setLessonForm({ ...lessonForm, examples: lessonForm.examples.filter((_, i) => i !== idx) });

  const openCatEditor = (cat?: QuizCategory) => {
    setEditingCat(cat ?? null);
    setCatForm(cat ? { title: cat.title, description: cat.description, color: cat.color, icon: cat.icon, active: cat.active } : EMPTY_CAT);
    setCatDialog(true);
  };

  const saveCat = () => {
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListAdminQuizCategoriesQueryKey() });
      setCatDialog(false);
      toast({ title: editingCat ? "Category updated" : "Category created" });
    };
    const onError = () => toast({ title: "Save failed", variant: "destructive" });
    if (editingCat) {
      updateCat.mutate({ id: editingCat.id, data: catForm }, { onSuccess, onError });
    } else {
      createCat.mutate({ data: catForm }, { onSuccess, onError });
    }
  };

  const openQEditor = (q?: QuizQuestion) => {
    setEditingQ(q ?? null);
    setQForm(q
      ? { categoryId: q.categoryId, question: q.question, options: [...q.options], correct: q.correct, explanation: q.explanation, order: q.order }
      : { ...EMPTY_Q, categoryId: selectedCat?.id ?? "", order: (questions?.length ?? 0) + 1 }
    );
    setQDialog(true);
  };

  const saveQ = () => {
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListAdminQuizQuestionsQueryKey({ categoryId: selectedCat?.id }) });
      setQDialog(false);
      toast({ title: editingQ ? "Question updated" : "Question added" });
    };
    const onError = () => toast({ title: "Save failed", variant: "destructive" });
    if (editingQ) {
      updateQ.mutate({ id: editingQ.id, data: qForm }, { onSuccess, onError });
    } else {
      createQ.mutate({ data: qForm }, { onSuccess, onError });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "cat") {
      deleteCat.mutate({ id: deleteTarget.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminQuizCategoriesQueryKey() });
          if (selectedCat?.id === deleteTarget.id) setSelectedCat(null);
          setDeleteTarget(null);
          toast({ title: "Category deleted" });
        },
        onError: () => toast({ title: "Delete failed", variant: "destructive" }),
      });
    } else {
      deleteQ.mutate({ id: deleteTarget.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminQuizQuestionsQueryKey({ categoryId: selectedCat?.id }) });
          setDeleteTarget(null);
          toast({ title: "Question deleted" });
        },
        onError: () => toast({ title: "Delete failed", variant: "destructive" }),
      });
    }
  };

  const sortedQ = questions ? [...questions].sort((a, b) => a.order - b.order) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">Quiz Bank</h1>
          <p className="text-muted-foreground text-sm">Manage grammar quiz categories and questions.</p>
        </div>
        <Button onClick={() => openCatEditor()}>
          <Plus className="mr-2 h-4 w-4" /> New Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Categories Panel */}
        <div className="md:col-span-1 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Categories</h2>
          {catsLoading ? (
            [1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : categories?.length === 0 ? (
            <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm">
              No categories yet. Create one to get started.
            </div>
          ) : (
            categories?.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCat(cat)}
                className={`border rounded-lg p-3 cursor-pointer transition-all flex items-center gap-3 group ${
                  selectedCat?.id === cat.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 bg-card"
                }`}
              >
                <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + "22" }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{cat.title}</span>
                    {!cat.active && <Badge variant="outline" className="text-xs text-muted-foreground">Draft</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openCatEditor(cat); }}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "cat", id: cat.id }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 transition-colors ${selectedCat?.id === cat.id ? "text-primary" : "text-muted-foreground"}`} />
              </div>
            ))
          )}
        </div>

        {/* Right Panel with Tabs */}
        <div className="md:col-span-2">
          {!selectedCat ? (
            <div className="flex items-center justify-center h-64 border border-dashed rounded-lg text-muted-foreground text-sm">
              Select a category to manage its questions and lesson
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-3">
                <TabsList>
                  <TabsTrigger value="questions">Questions</TabsTrigger>
                  <TabsTrigger value="lesson">
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                    Lesson Content
                    {lessonData && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
                  </TabsTrigger>
                </TabsList>
                {activeTab === "questions" && (
                  <Button size="sm" onClick={() => openQEditor()}>
                    <Plus className="h-4 w-4 mr-1" /> Add Question
                  </Button>
                )}
                {activeTab === "lesson" && (
                  <Button size="sm" onClick={openLessonEditor} disabled={lessonLoading}>
                    <Edit className="h-4 w-4 mr-1" />
                    {lessonData ? "Edit Lesson" : "Create Lesson"}
                  </Button>
                )}
              </div>

              <TabsContent value="questions" className="space-y-3 mt-0">
                {qsLoading ? (
                  [1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
                ) : sortedQ.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-10 text-center text-muted-foreground text-sm">
                    No questions yet in this category.
                  </div>
                ) : (
                  sortedQ.map((q, idx) => (
                    <div key={q.id} className="border rounded-lg p-4 bg-card group">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-mono text-muted-foreground mt-1 shrink-0">#{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium mb-3">{q.question}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((opt, i) => (
                              <div key={i} className={`flex items-center gap-2 text-xs rounded-md px-3 py-1.5 ${
                                i === q.correct
                                  ? "bg-green-500/15 text-green-600 border border-green-500/30"
                                  : "bg-muted/50 text-muted-foreground"
                              }`}>
                                {i === q.correct && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                                <span>{opt || <em className="opacity-50">empty</em>}</span>
                              </div>
                            ))}
                          </div>
                          {q.explanation && (
                            <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">{q.explanation}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openQEditor(q)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "q", id: q.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="lesson" className="mt-0">
                {lessonLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                  </div>
                ) : !lessonData ? (
                  <div className="border border-dashed rounded-lg p-10 text-center space-y-2">
                    <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">No lesson content yet for <strong>{selectedCat.title}</strong>.</p>
                    <p className="text-xs text-muted-foreground">Create a lesson to show students the grammar rule before the quiz.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-4 bg-card">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Main Rule</p>
                      <p className="text-sm">{lessonData.rule}</p>
                    </div>
                    <div className="border rounded-lg p-4 bg-card">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Examples ({lessonData.examples.length})</p>
                      <div className="space-y-2">
                        {lessonData.examples.map((ex, i) => (
                          <div key={i} className="flex gap-2 text-sm">
                            <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                            <div>
                              <span>{ex.sentence.replace(ex.highlight, "")}</span>
                              <strong className="text-primary">{ex.highlight}</strong>
                              {ex.note && <span className="text-xs text-muted-foreground ml-2 italic">— {ex.note}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border rounded-lg p-4 bg-card">
                        <p className="text-xs font-semibold uppercase tracking-wider text-destructive/70 mb-2">Common Mistake</p>
                        <p className="text-xs text-destructive line-through">{lessonData.mistake.wrong}</p>
                        <p className="text-xs text-green-600 mt-1">✓ {lessonData.mistake.right}</p>
                        {lessonData.mistake.reason && <p className="text-xs text-muted-foreground mt-1 italic">{lessonData.mistake.reason}</p>}
                      </div>
                      <div className="border rounded-lg p-4 bg-card">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-2">Memory Tip</p>
                        <p className="text-xs">{lessonData.tip}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">Last updated: {new Date(lessonData.updatedAt).toLocaleString()}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Category Editor Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={catForm.title} onChange={(e) => setCatForm({ ...catForm, title: e.target.value })} placeholder="e.g. Subjuntivo" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} placeholder="Short description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} className="h-9 w-16 rounded border cursor-pointer bg-transparent" />
                  <Input value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} className="font-mono text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Icon (Feather name)</Label>
                <Input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} placeholder="e.g. book" />
              </div>
            </div>
            <div className="flex items-center gap-3 border-t pt-4">
              <Switch id="cat-active" checked={catForm.active} onCheckedChange={(v) => setCatForm({ ...catForm, active: v })} />
              <Label htmlFor="cat-active">Active (visible in app)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Cancel</Button>
            <Button onClick={saveCat} disabled={createCat.isPending || updateCat.isPending}>
              {createCat.isPending || updateCat.isPending ? "Saving..." : "Save Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Editor Dialog */}
      <Dialog open={qDialog} onOpenChange={setQDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{editingQ ? "Edit Question" : "New Question"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea
                  className="min-h-[80px]"
                  value={qForm.question}
                  onChange={(e) => setQForm({ ...qForm, question: e.target.value })}
                  placeholder="e.g. Escolha a forma correta: 'Espero que ele ___ amanhã.'"
                />
              </div>

              <div className="space-y-3">
                <Label>Answer Options <span className="text-muted-foreground text-xs">(select the correct one)</span></Label>
                {qForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQForm({ ...qForm, correct: i })}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        qForm.correct === i
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-muted-foreground/30 hover:border-green-400"
                      }`}
                    >
                      {qForm.correct === i && <CheckCircle2 className="h-4 w-4" />}
                    </button>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const opts = [...qForm.options];
                        opts[i] = e.target.value;
                        setQForm({ ...qForm, options: opts });
                      }}
                      placeholder={`Option ${i + 1}`}
                      className={qForm.correct === i ? "border-green-500/50 focus-visible:ring-green-500" : ""}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Click the circle next to an option to mark it as correct.</p>
              </div>

              <div className="space-y-2">
                <Label>Explanation</Label>
                <Textarea
                  className="min-h-[80px]"
                  value={qForm.explanation}
                  onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })}
                  placeholder="Explain why the correct answer is correct..."
                />
              </div>

              <div className="space-y-2">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={qForm.order}
                  onChange={(e) => setQForm({ ...qForm, order: parseInt(e.target.value) || 1 })}
                  className="w-24"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setQDialog(false)}>Cancel</Button>
            <Button onClick={saveQ} disabled={createQ.isPending || updateQ.isPending}>
              {createQ.isPending || updateQ.isPending ? "Saving..." : "Save Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Editor Dialog */}
      <Dialog open={lessonDialog} onOpenChange={setLessonDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>
              {lessonData ? "Edit Lesson" : "Create Lesson"} — {selectedCat?.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Main Grammar Rule</Label>
                <Textarea
                  className="min-h-[100px]"
                  value={lessonForm.rule}
                  onChange={(e) => setLessonForm({ ...lessonForm, rule: e.target.value })}
                  placeholder="Explain the grammar rule in clear, concise Portuguese..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Examples <span className="text-muted-foreground text-xs font-normal">(sentence, word to highlight, explanation note)</span></Label>
                  <Button type="button" variant="outline" size="sm" onClick={addExample}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Example
                  </Button>
                </div>
                {lessonForm.examples.map((ex, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Example {i + 1}</span>
                      {lessonForm.examples.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeExample(i)}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <Input value={ex.sentence} onChange={(e) => updateExample(i, "sentence", e.target.value)} placeholder="Full sentence, e.g. Espero que ele venha amanhã." />
                    <Input value={ex.highlight} onChange={(e) => updateExample(i, "highlight", e.target.value)} placeholder="Word/phrase to highlight, e.g. venha" />
                    <Input value={ex.note} onChange={(e) => updateExample(i, "note", e.target.value)} placeholder="Short note, e.g. Presente do subjuntivo após 'esperar que'" />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Common Mistake</Label>
                <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                  <Input value={lessonForm.mistake.wrong} onChange={(e) => setLessonForm({ ...lessonForm, mistake: { ...lessonForm.mistake, wrong: e.target.value } })} placeholder="❌ Wrong: e.g. Espero que ele vem amanhã." />
                  <Input value={lessonForm.mistake.right} onChange={(e) => setLessonForm({ ...lessonForm, mistake: { ...lessonForm.mistake, right: e.target.value } })} placeholder="✓ Correct: e.g. Espero que ele venha amanhã." />
                  <Input value={lessonForm.mistake.reason} onChange={(e) => setLessonForm({ ...lessonForm, mistake: { ...lessonForm.mistake, reason: e.target.value } })} placeholder="Why: e.g. Após verbos de desejo + 'que', sempre subjuntivo." />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Memory Tip</Label>
                <Input
                  value={lessonForm.tip}
                  onChange={(e) => setLessonForm({ ...lessonForm, tip: e.target.value })}
                  placeholder="💡 Quick tip to remember the rule..."
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setLessonDialog(false)}>Cancel</Button>
            <Button onClick={saveLesson} disabled={upsertLesson.isPending}>
              {upsertLesson.isPending ? "Saving..." : "Save Lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "cat"
                ? "This will delete the category and ALL its questions. This action cannot be undone."
                : "This will permanently delete this question."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {(deleteCat.isPending || deleteQ.isPending) ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
