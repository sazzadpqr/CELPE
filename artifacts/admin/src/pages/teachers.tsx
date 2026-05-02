import { useEffect, useState } from "react";
import { Users, Plus, Trash2, Edit2, Eye, Key, Copy, Check, BookOpen, UserCheck, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type Teacher = {
  id: string;
  name: string;
  email: string;
  bio: string;
  specialties: string[];
  status: string;
  studentCount: number;
  createdAt: string;
};

type InviteCode = {
  id: string;
  code: string;
  type: string;
  label: string;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

type StudentConn = {
  id: string;
  studentName: string;
  inviteCode: string;
  connectedAt: string;
  status: string;
  notes: string;
};

type TeacherClass = {
  id: string;
  title: string;
  type: string;
  scheduledAt: string | null;
  durationMinutes: number;
  meetingLink: string;
  status: string;
  studentConnectionIds: string[];
};

type TeacherDetail = Teacher & {
  students: StudentConn[];
  codes: InviteCode[];
  classes: TeacherClass[];
};

type NewCode = { type: string; label: string; maxUses: string; expiresAt: string };
type NewClass = {
  title: string; description: string; type: string;
  scheduledAt: string; durationMinutes: string; meetingLink: string; notes: string;
};

const BLANK_TEACHER = { name: "", email: "", password: "", bio: "", specialties: "", status: "active" };
const BLANK_CODE: NewCode = { type: "individual", label: "", maxUses: "", expiresAt: "" };
const BLANK_CLASS: NewClass = { title: "", description: "", type: "individual", scheduledAt: "", durationMinutes: "60", meetingLink: "", notes: "" };

export default function TeachersPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"teachers" | "detail">("teachers");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailTeacher, setDetailTeacher] = useState<TeacherDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editTeacher, setEditTeacher] = useState<typeof BLANK_TEACHER & { id?: string }>(BLANK_TEACHER);
  const [savingTeacher, setSavingTeacher] = useState(false);

  const [showCodeForm, setShowCodeForm] = useState(false);
  const [newCode, setNewCode] = useState<NewCode>(BLANK_CODE);
  const [savingCode, setSavingCode] = useState(false);

  const [showClassForm, setShowClassForm] = useState(false);
  const [newClass, setNewClass] = useState<NewClass>(BLANK_CLASS);
  const [editClassId, setEditClassId] = useState<string | null>(null);
  const [savingClass, setSavingClass] = useState(false);

  const [resetPwForm, setResetPwForm] = useState<{ id: string; pw: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<Teacher[]>("/api/admin/teachers");
      setTeachers(data);
    } catch { toast({ title: "Erro ao carregar professores", variant: "destructive" }); }
    setLoading(false);
  };

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await adminFetch<TeacherDetail>(`/api/admin/teachers/${id}`);
      setDetailTeacher(data);
      setTab("detail");
    } catch { toast({ title: "Erro ao carregar detalhes", variant: "destructive" }); }
    setDetailLoading(false);
  };

  useEffect(() => { loadTeachers(); }, []);

  const saveTeacher = async () => {
    if (!editTeacher.name || !editTeacher.email) { toast({ title: "Nome e e-mail são obrigatórios", variant: "destructive" }); return; }
    if (!editTeacher.id && !editTeacher.password) { toast({ title: "Senha é obrigatória", variant: "destructive" }); return; }
    setSavingTeacher(true);
    try {
      const payload = {
        name: editTeacher.name,
        email: editTeacher.email,
        bio: editTeacher.bio,
        specialties: editTeacher.specialties.split(",").map(s => s.trim()).filter(Boolean),
        status: editTeacher.status,
        ...(editTeacher.password ? { password: editTeacher.password } : {}),
      };
      if (editTeacher.id) {
        await adminSave(`/api/admin/teachers/${editTeacher.id}`, payload, "PUT");
      } else {
        await adminSave("/api/admin/teachers", payload, "POST");
      }
      toast({ title: editTeacher.id ? "Professor atualizado" : "Professor criado" });
      setShowTeacherForm(false);
      setEditTeacher(BLANK_TEACHER);
      loadTeachers();
    } catch { toast({ title: "Erro ao salvar professor", variant: "destructive" }); }
    setSavingTeacher(false);
  };

  const deleteTeacher = async (id: string) => {
    if (!confirm("Excluir este professor e todos seus dados?")) return;
    try {
      await adminSave(`/api/admin/teachers/${id}`, {}, "DELETE");
      toast({ title: "Professor excluído" });
      loadTeachers();
      if (detailTeacher?.id === id) { setTab("teachers"); setDetailTeacher(null); }
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const resetPassword = async () => {
    if (!resetPwForm || !resetPwForm.pw) return;
    try {
      await adminSave(`/api/admin/teachers/${resetPwForm.id}/reset-password`, { password: resetPwForm.pw }, "POST");
      toast({ title: "Senha redefinida com sucesso" });
      setResetPwForm(null);
    } catch { toast({ title: "Erro ao redefinir senha", variant: "destructive" }); }
  };

  const generateCode = async () => {
    if (!detailTeacher) return;
    setSavingCode(true);
    try {
      const res = await adminSave<InviteCode>("/api/admin/teacher-codes", {
        teacherId: detailTeacher.id,
        type: newCode.type,
        label: newCode.label,
        maxUses: newCode.maxUses ? Number(newCode.maxUses) : null,
        expiresAt: newCode.expiresAt || null,
      }, "POST");
      toast({ title: `Código gerado: ${res.code}` });
      setShowCodeForm(false);
      setNewCode(BLANK_CODE);
      loadDetail(detailTeacher.id);
    } catch {
      toast({ title: "Erro ao gerar código", variant: "destructive" });
    }
    setSavingCode(false);
  };

  const deleteCode = async (codeId: string) => {
    if (!detailTeacher) return;
    try {
      await adminSave(`/api/admin/teacher-codes/${codeId}`, {}, "DELETE");
      toast({ title: "Código excluído" });
      loadDetail(detailTeacher.id);
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const removeStudent = async (studentId: string) => {
    if (!detailTeacher) return;
    try {
      await adminSave(`/api/admin/teacher-students/${studentId}`, {}, "DELETE");
      toast({ title: "Aluno removido" });
      loadDetail(detailTeacher.id);
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const saveClass = async () => {
    if (!detailTeacher || !newClass.title) { toast({ title: "Título obrigatório", variant: "destructive" }); return; }
    setSavingClass(true);
    try {
      const payload = {
        ...newClass,
        durationMinutes: Number(newClass.durationMinutes) || 60,
        scheduledAt: newClass.scheduledAt || null,
        _adminTeacherId: detailTeacher.id,
      };
      if (editClassId) {
        await adminSave(`/api/teacher/classes/${editClassId}`, payload, "PUT");
      } else {
        await adminSave("/api/teacher/classes", payload, "POST");
      }
      toast({ title: editClassId ? "Aula atualizada" : "Aula criada" });
      setShowClassForm(false);
      setNewClass(BLANK_CLASS);
      setEditClassId(null);
      loadDetail(detailTeacher.id);
    } catch { toast({ title: "Erro ao salvar aula", variant: "destructive" }); }
    setSavingClass(false);
  };

  const deleteClass = async (classId: string) => {
    if (!detailTeacher) return;
    try {
      await adminSave(`/api/teacher/classes/${classId}`, {}, "DELETE");
      toast({ title: "Aula excluída" });
      loadDetail(detailTeacher.id);
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    });
  };

  const statusBadge = (status: string) => (
    <Badge variant={status === "active" ? "default" : "destructive"} className="text-[10px]">
      {status === "active" ? "Ativo" : status === "suspended" ? "Suspenso" : "Inativo"}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Professores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie professores, turmas, alunos conectados e códigos de convite.
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "detail" && (
            <Button variant="outline" size="sm" onClick={() => setTab("teachers")}>
              ← Voltar à lista
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditTeacher(BLANK_TEACHER); setShowTeacherForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo Professor
          </Button>
        </div>
      </div>

      {showTeacherForm && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{editTeacher.id ? "Editar Professor" : "Novo Professor"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Nome *</label>
                <Input value={editTeacher.name} onChange={e => setEditTeacher(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">E-mail *</label>
                <Input value={editTeacher.email} onChange={e => setEditTeacher(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" type="email" className="mt-1 h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">{editTeacher.id ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</label>
                <Input value={editTeacher.password} onChange={e => setEditTeacher(p => ({ ...p, password: e.target.value }))} type="password" placeholder="Senha" className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select value={editTeacher.status} onChange={e => setEditTeacher(p => ({ ...p, status: e.target.value }))} className="w-full mt-1 h-8 text-sm rounded border bg-background px-2">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="suspended">Suspenso</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Bio</label>
              <Textarea value={editTeacher.bio} onChange={e => setEditTeacher(p => ({ ...p, bio: e.target.value }))} placeholder="Breve descrição do professor..." rows={2} className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Especialidades (separadas por vírgula)</label>
              <Input value={editTeacher.specialties} onChange={e => setEditTeacher(p => ({ ...p, specialties: e.target.value }))} placeholder="Gramática, Redação, Conversação" className="mt-1 h-8 text-sm" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={saveTeacher} disabled={savingTeacher}>{savingTeacher ? "Salvando..." : "Salvar"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowTeacherForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {resetPwForm && (
        <Card className="border-yellow-500/40">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-medium">Redefinir senha do professor</p>
            <Input type="password" placeholder="Nova senha" value={resetPwForm.pw} onChange={e => setResetPwForm(p => p ? { ...p, pw: e.target.value } : null)} className="h-8 text-sm" />
            <div className="flex gap-2">
              <Button size="sm" onClick={resetPassword}>Confirmar</Button>
              <Button size="sm" variant="outline" onClick={() => setResetPwForm(null)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "teachers" && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : teachers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                Nenhum professor cadastrado ainda.
              </CardContent>
            </Card>
          ) : (
            teachers.map(t => (
              <Card key={t.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{t.name}</span>
                        {statusBadge(t.status)}
                        <span className="text-xs text-muted-foreground">· {t.studentCount} alunos</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.email}</p>
                      {t.bio && <p className="text-xs text-muted-foreground mt-1 truncate">{t.bio}</p>}
                      {t.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {t.specialties.map(s => (
                            <span key={s} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver detalhes"
                        onClick={() => loadDetail(t.id)} disabled={detailLoading}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar"
                        onClick={() => {
                          setEditTeacher({ id: t.id, name: t.name, email: t.email, password: "", bio: t.bio, specialties: t.specialties.join(", "), status: t.status });
                          setShowTeacherForm(true);
                        }}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Redefinir senha"
                        onClick={() => setResetPwForm({ id: t.id, pw: "" })}>
                        <Key className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Excluir"
                        onClick={() => deleteTeacher(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "detail" && detailTeacher && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-card border rounded-lg">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
              {detailTeacher.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold">{detailTeacher.name}</h2>
                {statusBadge(detailTeacher.status)}
              </div>
              <p className="text-xs text-muted-foreground">{detailTeacher.email}</p>
              {detailTeacher.bio && <p className="text-xs text-muted-foreground mt-0.5">{detailTeacher.bio}</p>}
            </div>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => loadDetail(detailTeacher.id)}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Key className="h-4 w-4" /> Códigos de Convite</CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCodeForm(v => !v)}>
                    <Plus className="h-3 w-3 mr-1" /> Gerar Código
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {showCodeForm && (
                  <div className="border rounded-md p-3 space-y-2 mb-3 bg-muted/30">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Tipo</label>
                        <select value={newCode.type} onChange={e => setNewCode(p => ({ ...p, type: e.target.value }))} className="w-full mt-1 h-8 text-sm rounded border bg-background px-2">
                          <option value="individual">Individual</option>
                          <option value="group">Turma</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Rótulo</label>
                        <Input value={newCode.label} onChange={e => setNewCode(p => ({ ...p, label: e.target.value }))} placeholder="ex: Turma B2 2025" className="mt-1 h-8 text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Máx. usos (vazio = ilimitado)</label>
                        <Input value={newCode.maxUses} onChange={e => setNewCode(p => ({ ...p, maxUses: e.target.value }))} type="number" placeholder="ilimitado" className="mt-1 h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Expira em</label>
                        <Input value={newCode.expiresAt} onChange={e => setNewCode(p => ({ ...p, expiresAt: e.target.value }))} type="datetime-local" className="mt-1 h-8 text-xs" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs" onClick={generateCode} disabled={savingCode}>
                        {savingCode ? "Gerando..." : "Gerar"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCodeForm(false)}>Cancelar</Button>
                    </div>
                  </div>
                )}
                {detailTeacher.codes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Nenhum código gerado ainda.</p>
                ) : (
                  detailTeacher.codes.map(c => (
                    <div key={c.id} className="flex items-center gap-2 p-2 rounded border bg-muted/20 group">
                      <div className="font-mono text-sm font-bold tracking-widest text-primary">{c.code}</div>
                      <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-primary transition-colors">
                        {copiedCode === c.code ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <Badge variant={c.active ? "default" : "secondary"} className="text-[9px]">{c.type}</Badge>
                      {c.label && <span className="text-xs text-muted-foreground truncate flex-1">{c.label}</span>}
                      <span className="text-xs text-muted-foreground ml-auto">{c.usesCount}{c.maxUses ? `/${c.maxUses}` : ""} usos</span>
                      <button onClick={() => deleteCode(c.id)} className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><UserCheck className="h-4 w-4" /> Alunos Conectados ({detailTeacher.students.filter(s => s.status === "active").length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {detailTeacher.students.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Nenhum aluno conectado ainda.</p>
                ) : (
                  detailTeacher.students.map(s => (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded border bg-muted/20 group">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                        {s.studentName?.slice(0, 2).toUpperCase() || "??"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.studentName || "Aluno"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Código: <span className="font-mono">{s.inviteCode}</span> · {new Date(s.connectedAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[9px]">{s.status}</Badge>
                      <button onClick={() => removeStudent(s.id)} className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity ml-1">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Aulas / Turmas ({detailTeacher.classes.length})</CardTitle>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setNewClass(BLANK_CLASS); setEditClassId(null); setShowClassForm(v => !v); }}>
                  <Plus className="h-3 w-3 mr-1" /> Nova Aula
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showClassForm && (
                <div className="border rounded-md p-4 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Título *</label>
                      <Input value={newClass.title} onChange={e => setNewClass(p => ({ ...p, title: e.target.value }))} placeholder="Título da aula" className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Tipo</label>
                      <select value={newClass.type} onChange={e => setNewClass(p => ({ ...p, type: e.target.value }))} className="w-full mt-1 h-8 text-sm rounded border bg-background px-2">
                        <option value="individual">Individual</option>
                        <option value="group">Turma</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Descrição</label>
                    <Textarea value={newClass.description} onChange={e => setNewClass(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1 text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Data/Hora</label>
                      <Input value={newClass.scheduledAt} onChange={e => setNewClass(p => ({ ...p, scheduledAt: e.target.value }))} type="datetime-local" className="mt-1 h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Duração (min)</label>
                      <Input value={newClass.durationMinutes} onChange={e => setNewClass(p => ({ ...p, durationMinutes: e.target.value }))} type="number" className="mt-1 h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Link (Meet/Zoom)</label>
                      <Input value={newClass.meetingLink} onChange={e => setNewClass(p => ({ ...p, meetingLink: e.target.value }))} placeholder="https://..." className="mt-1 h-8 text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Notas</label>
                    <Textarea value={newClass.notes} onChange={e => setNewClass(p => ({ ...p, notes: e.target.value }))} rows={2} className="mt-1 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={saveClass} disabled={savingClass}>{savingClass ? "Salvando..." : editClassId ? "Atualizar" : "Criar"}</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowClassForm(false); setEditClassId(null); }}>Cancelar</Button>
                  </div>
                </div>
              )}
              {detailTeacher.classes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma aula agendada.</p>
              ) : (
                <div className="space-y-2">
                  {detailTeacher.classes.map(cls => (
                    <div key={cls.id} className="flex items-center gap-3 p-3 rounded border bg-muted/20 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{cls.title}</span>
                          <Badge variant="outline" className="text-[9px]">{cls.type}</Badge>
                          <Badge variant={cls.status === "scheduled" ? "default" : cls.status === "completed" ? "secondary" : "destructive"} className="text-[9px]">
                            {cls.status === "scheduled" ? "Agendada" : cls.status === "completed" ? "Concluída" : "Cancelada"}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-3">
                          {cls.scheduledAt && <span>📅 {new Date(cls.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>}
                          <span>⏱ {cls.durationMinutes}min</span>
                          <span>👥 {cls.studentConnectionIds.length > 0 ? `${cls.studentConnectionIds.length} alunos` : cls.type === "group" ? "Todos" : "Individual"}</span>
                          {cls.meetingLink && <a href={cls.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">🔗 Link</a>}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          setNewClass({
                            title: cls.title, description: "", type: cls.type,
                            scheduledAt: cls.scheduledAt ? cls.scheduledAt.slice(0, 16) : "",
                            durationMinutes: String(cls.durationMinutes),
                            meetingLink: cls.meetingLink, notes: "",
                          });
                          setEditClassId(cls.id);
                          setShowClassForm(true);
                        }} className="text-muted-foreground hover:text-primary">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteClass(cls.id)} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
