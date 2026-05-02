import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  GraduationCap, Users, BookOpen, Key, Plus, Trash2, Edit2,
  Copy, Check, LogOut, RefreshCw, X, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type TeacherProfile = { id: string; name: string; email: string; bio: string; specialties: string[] };
type InviteCode = { id: string; code: string; type: string; label: string; maxUses: number | null; usesCount: number; expiresAt: string | null; active: boolean };
type StudentConn = { id: string; studentName: string; inviteCode: string; connectedAt: string; status: string; notes: string };
type TeacherClass = { id: string; title: string; description: string; type: string; scheduledAt: string | null; durationMinutes: number; meetingLink: string; notes: string; status: string; studentConnectionIds: string[] };
type Dashboard = { stats: { students: number; upcomingClasses: number; activeCodes: number }; recentStudents: StudentConn[]; upcomingClasses: TeacherClass[] };

const BLANK_CODE = { type: "individual", label: "", maxUses: "", expiresAt: "" };
const BLANK_CLASS = { title: "", description: "", type: "individual", scheduledAt: "", durationMinutes: "60", meetingLink: "", notes: "" };

function teacherFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("teacher_token") ?? "";
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers as Record<string, string> | undefined),
    },
  }).then(async r => {
    if (!r.ok) {
      const e = await r.json().catch(() => ({})) as { error?: string };
      throw new Error(e.error ?? r.statusText);
    }
    return r.json() as Promise<T>;
  });
}

export default function TeacherPortalPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"dashboard" | "students" | "codes" | "classes">("dashboard");
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [students, setStudents] = useState<StudentConn[]>([]);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCodeForm, setShowCodeForm] = useState(false);
  const [newCode, setNewCode] = useState(BLANK_CODE);
  const [savingCode, setSavingCode] = useState(false);

  const [showClassForm, setShowClassForm] = useState(false);
  const [editClass, setEditClass] = useState<typeof BLANK_CLASS & { id?: string }>(BLANK_CLASS);
  const [savingClass, setSavingClass] = useState(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const logout = () => {
    localStorage.removeItem("teacher_token");
    localStorage.removeItem("teacher_name");
    setLocation("/teacher-login");
  };

  const checkAuth = useCallback(async () => {
    try {
      const p = await teacherFetch<TeacherProfile>("/api/teacher/me");
      setProfile(p);
    } catch {
      logout();
    }
    setLoading(false);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const d = await teacherFetch<Dashboard>("/api/teacher/dashboard");
      setDashboard(d);
    } catch { /* */ }
  }, []);

  const loadStudents = useCallback(async () => {
    try { setStudents(await teacherFetch<StudentConn[]>("/api/teacher/students")); } catch { /* */ }
  }, []);

  const loadCodes = useCallback(async () => {
    try { setCodes(await teacherFetch<InviteCode[]>("/api/teacher/codes")); } catch { /* */ }
  }, []);

  const loadClasses = useCallback(async () => {
    try { setClasses(await teacherFetch<TeacherClass[]>("/api/teacher/classes")); } catch { /* */ }
  }, []);

  useEffect(() => { checkAuth().then(() => { loadDashboard(); loadStudents(); loadCodes(); loadClasses(); }); }, []);

  const generateCode = async () => {
    setSavingCode(true);
    try {
      const c = await teacherFetch<InviteCode>("/api/teacher/codes", {
        method: "POST",
        body: JSON.stringify({ ...newCode, maxUses: newCode.maxUses ? Number(newCode.maxUses) : null, expiresAt: newCode.expiresAt || null }),
      });
      toast({ title: `Código gerado: ${c.code}` });
      setShowCodeForm(false);
      setNewCode(BLANK_CODE);
      loadCodes();
      loadDashboard();
    } catch { toast({ title: "Erro ao gerar código", variant: "destructive" }); }
    setSavingCode(false);
  };

  const deleteCode = async (id: string) => {
    try {
      await teacherFetch("/api/teacher/codes/" + id, { method: "DELETE" });
      loadCodes(); loadDashboard();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const removeStudent = async (id: string) => {
    try {
      await teacherFetch("/api/teacher/students/" + id, { method: "DELETE" });
      loadStudents(); loadDashboard();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const saveClass = async () => {
    if (!editClass.title) { toast({ title: "Título obrigatório", variant: "destructive" }); return; }
    setSavingClass(true);
    try {
      const payload = { ...editClass, durationMinutes: Number(editClass.durationMinutes) || 60, scheduledAt: editClass.scheduledAt || null };
      if (editClass.id) {
        await teacherFetch("/api/teacher/classes/" + editClass.id, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await teacherFetch("/api/teacher/classes", { method: "POST", body: JSON.stringify(payload) });
      }
      toast({ title: editClass.id ? "Aula atualizada" : "Aula criada" });
      setShowClassForm(false);
      setEditClass(BLANK_CLASS);
      loadClasses(); loadDashboard();
    } catch { toast({ title: "Erro ao salvar aula", variant: "destructive" }); }
    setSavingClass(false);
  };

  const updateClassStatus = async (id: string, status: string) => {
    try {
      await teacherFetch("/api/teacher/classes/" + id, { method: "PUT", body: JSON.stringify({ status }) });
      loadClasses();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => { setCopiedCode(code); setTimeout(() => setCopiedCode(null), 1500); });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const TABS = [
    { key: "dashboard", label: "Início", icon: GraduationCap },
    { key: "students", label: `Alunos (${students.filter(s => s.status === "active").length})`, icon: Users },
    { key: "codes", label: `Códigos (${codes.filter(c => c.active).length})`, icon: Key },
    { key: "classes", label: `Aulas (${classes.length})`, icon: BookOpen },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold text-sm">Portal do Professor</p>
            <p className="text-xs text-muted-foreground">{profile?.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
          <LogOut className="h-4 w-4 mr-1" /> Sair
        </Button>
      </div>

      <div className="flex border-b bg-card">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {tab === "dashboard" && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Alunos ativos", value: dashboard?.stats.students ?? 0, icon: Users, color: "text-blue-500" },
                { label: "Aulas agendadas", value: dashboard?.stats.upcomingClasses ?? 0, icon: Calendar, color: "text-green-500" },
                { label: "Códigos ativos", value: dashboard?.stats.activeCodes ?? 0, icon: Key, color: "text-purple-500" },
              ].map(stat => (
                <Card key={stat.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {dashboard?.upcomingClasses && dashboard.upcomingClasses.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Próximas Aulas</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.upcomingClasses.map(cls => (
                    <div key={cls.id} className="flex items-center gap-3 p-2 rounded border bg-muted/20">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{cls.title}</p>
                        {cls.scheduledAt && <p className="text-xs text-muted-foreground">{new Date(cls.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {cls.durationMinutes}min</p>}
                      </div>
                      {cls.meetingLink && <a href={cls.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Entrar</a>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {dashboard?.recentStudents && dashboard.recentStudents.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Alunos Recentes</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.recentStudents.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold">{s.studentName?.slice(0, 2).toUpperCase() || "??"}</div>
                      <p className="text-sm">{s.studentName}</p>
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(s.connectedAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {tab === "codes" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Códigos de Convite</h2>
              <Button size="sm" onClick={() => setShowCodeForm(v => !v)}>
                <Plus className="h-4 w-4 mr-1" /> Gerar Código
              </Button>
            </div>
            {showCodeForm && (
              <Card className="border-primary/40">
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Tipo</label>
                      <select value={newCode.type} onChange={e => setNewCode(p => ({ ...p, type: e.target.value }))} className="w-full mt-1 h-8 text-sm rounded border bg-background px-2">
                        <option value="individual">Individual</option>
                        <option value="group">Turma</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Rótulo (opcional)</label>
                      <Input value={newCode.label} onChange={e => setNewCode(p => ({ ...p, label: e.target.value }))} placeholder="ex: Turma B2" className="mt-1 h-8 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Máx. usos (vazio = ilimitado)</label>
                      <Input value={newCode.maxUses} onChange={e => setNewCode(p => ({ ...p, maxUses: e.target.value }))} type="number" className="mt-1 h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Expira em</label>
                      <Input value={newCode.expiresAt} onChange={e => setNewCode(p => ({ ...p, expiresAt: e.target.value }))} type="datetime-local" className="mt-1 h-8 text-xs" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={generateCode} disabled={savingCode}>{savingCode ? "Gerando..." : "Gerar"}</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowCodeForm(false)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="space-y-2">
              {codes.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="font-mono text-xl font-black tracking-widest text-primary">{c.code}</div>
                    <button onClick={() => copyCode(c.code)}>{copiedCode === c.code ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}</button>
                    <Badge variant="outline" className="text-xs">{c.type === "group" ? "Turma" : "Individual"}</Badge>
                    {c.label && <span className="text-sm text-muted-foreground">{c.label}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">{c.usesCount}{c.maxUses ? `/${c.maxUses}` : ""} usos</span>
                    {c.expiresAt && <span className="text-xs text-muted-foreground">exp. {new Date(c.expiresAt).toLocaleDateString("pt-BR")}</span>}
                    <button onClick={() => deleteCode(c.id)} className="text-destructive hover:text-destructive/80"><X className="h-4 w-4" /></button>
                  </CardContent>
                </Card>
              ))}
              {codes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum código gerado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "students" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Alunos Conectados ({students.filter(s => s.status === "active").length})</h2>
              <Button size="sm" variant="outline" onClick={loadStudents}><RefreshCw className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {students.map(s => (
                <Card key={s.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center font-bold text-sm">{s.studentName?.slice(0, 2).toUpperCase() || "??"}</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{s.studentName || "Aluno"}</p>
                      <p className="text-xs text-muted-foreground">Código: <span className="font-mono">{s.inviteCode}</span> · {new Date(s.connectedAt).toLocaleDateString("pt-BR")}</p>
                      {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                    </div>
                    <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-xs">{s.status === "active" ? "Ativo" : "Removido"}</Badge>
                    <button onClick={() => { if (confirm("Remover este aluno?")) removeStudent(s.id); }} className="text-destructive hover:text-destructive/80"><X className="h-4 w-4" /></button>
                  </CardContent>
                </Card>
              ))}
              {students.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluno conectado ainda. Compartilhe um código de convite!</p>}
            </div>
          </div>
        )}

        {tab === "classes" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Aulas ({classes.length})</h2>
              <Button size="sm" onClick={() => { setEditClass(BLANK_CLASS); setShowClassForm(v => !v); }}>
                <Plus className="h-4 w-4 mr-1" /> Nova Aula
              </Button>
            </div>
            {showClassForm && (
              <Card className="border-primary/40">
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Título *</label>
                      <Input value={editClass.title} onChange={e => setEditClass(p => ({ ...p, title: e.target.value }))} className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Tipo</label>
                      <select value={editClass.type} onChange={e => setEditClass(p => ({ ...p, type: e.target.value }))} className="w-full mt-1 h-8 text-sm rounded border bg-background px-2">
                        <option value="individual">Individual</option>
                        <option value="group">Turma</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Descrição</label>
                    <Textarea value={editClass.description} onChange={e => setEditClass(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1 text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Data/Hora</label>
                      <Input value={editClass.scheduledAt} onChange={e => setEditClass(p => ({ ...p, scheduledAt: e.target.value }))} type="datetime-local" className="mt-1 h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Duração (min)</label>
                      <Input value={editClass.durationMinutes} onChange={e => setEditClass(p => ({ ...p, durationMinutes: e.target.value }))} type="number" className="mt-1 h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Link da aula</label>
                      <Input value={editClass.meetingLink} onChange={e => setEditClass(p => ({ ...p, meetingLink: e.target.value }))} placeholder="https://meet.google.com/..." className="mt-1 h-8 text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Notas</label>
                    <Textarea value={editClass.notes} onChange={e => setEditClass(p => ({ ...p, notes: e.target.value }))} rows={2} className="mt-1 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveClass} disabled={savingClass}>{savingClass ? "Salvando..." : editClass.id ? "Atualizar" : "Criar"}</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowClassForm(false); setEditClass(BLANK_CLASS); }}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="space-y-2">
              {classes.map(cls => (
                <Card key={cls.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{cls.title}</span>
                          <Badge variant="outline" className="text-xs">{cls.type === "group" ? "Turma" : "Individual"}</Badge>
                          <Badge variant={cls.status === "scheduled" ? "default" : cls.status === "completed" ? "secondary" : "destructive"} className="text-xs">
                            {cls.status === "scheduled" ? "Agendada" : cls.status === "completed" ? "Concluída" : "Cancelada"}
                          </Badge>
                        </div>
                        {cls.description && <p className="text-xs text-muted-foreground mt-0.5">{cls.description}</p>}
                        <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                          {cls.scheduledAt && <span>📅 {new Date(cls.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>}
                          <span>⏱ {cls.durationMinutes}min</span>
                          {cls.meetingLink && <a href={cls.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">🔗 Entrar na aula</a>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {cls.status === "scheduled" && (
                          <button onClick={() => updateClassStatus(cls.id, "completed")} title="Marcar concluída" className="text-green-600 hover:text-green-500 text-xs px-1.5 py-0.5 rounded border border-green-600/30 hover:bg-green-600/10 transition-colors">✓</button>
                        )}
                        <button onClick={() => { setEditClass({ title: cls.title, description: cls.description, type: cls.type, scheduledAt: cls.scheduledAt ? cls.scheduledAt.slice(0, 16) : "", durationMinutes: String(cls.durationMinutes), meetingLink: cls.meetingLink, notes: cls.notes, id: cls.id }); setShowClassForm(true); }} className="text-muted-foreground hover:text-primary">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={async () => { await teacherFetch("/api/teacher/classes/" + cls.id, { method: "DELETE" }); loadClasses(); }} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {classes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma aula criada ainda.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
