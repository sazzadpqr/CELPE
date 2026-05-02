import { useState } from "react";
import { useLocation } from "wouter";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TeacherLoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { token?: string; error?: string; teacher?: { name: string } };
      if (!res.ok) {
        setError(data.error ?? "Credenciais inválidas");
      } else {
        localStorage.setItem("teacher_token", data.token!);
        localStorage.setItem("teacher_name", data.teacher?.name ?? "");
        setLocation("/teacher-portal");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-lg">Portal do Professor</CardTitle>
          <CardDescription className="text-xs">CelpePrep — acesso exclusivo para professores</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">E-mail</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seu@email.com" className="mt-1" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Senha</label>
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Senha" className="mt-1" required />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-center text-xs text-muted-foreground pt-1">
              Não tem acesso? Solicite ao administrador.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
