import { useAdminLogin } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useAdminLogin();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus password input
    setTimeout(() => inputRef.current?.focus(), 100);
    // Check if already logged in
    if (localStorage.getItem("admin_token")) {
      setLocation("/dashboard");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || login.isPending) return;

    login.mutate(
      { data: { password } },
      {
        onSuccess: (res) => {
          if (res.ok && res.token) {
            localStorage.setItem("admin_token", res.token);
            if (remember) {
              // Store expiry 7 days out
              const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
              localStorage.setItem("admin_token_expires", String(expires));
            }
            setLocation("/dashboard");
          } else {
            toast({
              title: "Credenciais inválidas",
              description: "Verifique a senha e tente novamente.",
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({
            title: "Erro de autenticação",
            description: "Não foi possível conectar ao servidor.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      <div className="relative w-full max-w-sm space-y-6">
        {/* Logo area */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-mono font-bold tracking-tighter uppercase text-foreground">
            CelpePrep Ops
          </h1>
          <p className="text-sm text-muted-foreground">
            Painel administrativo — acesso restrito
          </p>
        </div>

        {/* Login card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Senha de Acesso
              </Label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono pr-10 bg-muted/50 border-border focus:border-primary"
                  autoComplete="current-password"
                  data-testid="input-password"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setRemember(v => !v)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  remember ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {remember && (
                  <svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-mono">Manter sessão por 7 dias</span>
            </label>

            <Button
              type="submit"
              className="w-full font-mono"
              disabled={login.isPending || !password}
              data-testid="button-login"
            >
              {login.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Autenticando...</>
                : "Entrar no painel"}
            </Button>
          </form>

          <div className="pt-1 border-t border-border text-center">
            <p className="text-[11px] text-muted-foreground/40 font-mono">
              Acesso monitorado · CelpePrep Admin v2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
