import { useState, useEffect, useCallback } from "react";
import { Users, Search, RefreshCw, Star, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type UserRow = {
  id: string;
  deviceToken: string;
  displayName: string | null;
  email: string | null;
  level: string;
  isPremium: boolean;
  premiumPlan: string | null;
  aiCredits: number;
  streakDays: number;
  xpTotal: number;
  attemptsCount: number;
  createdAt: string;
};

type UsersResponse = { users: UserRow[]; total: number; page: number; pages: number };

type StatsOverview = { totalUsers: number; premiumUsers: number; freeUsers: number; totalAttempts: number };

export default function UsersPage() {
  const { toast } = useToast();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "premium" | "free">("all");
  const [page, setPage] = useState(1);
  const [creditTarget, setCreditTarget] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (filter !== "all") params.set("premium", String(filter === "premium"));
      const [d, s] = await Promise.all([
        adminFetch<UsersResponse>(`/api/admin/users?${params}`),
        adminFetch<StatsOverview>("/api/admin/stats/overview"),
      ]);
      setData(d);
      setStats(s);
    } catch {
      toast({ title: "Erro ao carregar usuários", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, search, filter, toast]);

  useEffect(() => { load(); }, [load]);

  const togglePremium = async (u: UserRow) => {
    try {
      await adminSave(`/api/admin/users/${u.deviceToken}/toggle-premium`, { isPremium: !u.isPremium }, "PUT");
      toast({ title: u.isPremium ? "Premium removido" : "Premium ativado" });
      load();
    } catch {
      toast({ title: "Erro ao alterar premium", variant: "destructive" });
    }
  };

  const adjustCredits = async (u: UserRow) => {
    const val = parseInt(creditTarget[u.deviceToken] ?? String(u.aiCredits), 10);
    if (isNaN(val)) return;
    try {
      await adminSave(`/api/admin/users/${u.deviceToken}/credits`, { aiCredits: val }, "PUT");
      toast({ title: `Créditos ajustados para ${val}` });
      setCreditTarget(c => { const n = { ...c }; delete n[u.deviceToken]; return n; });
      load();
    } catch {
      toast({ title: "Erro ao ajustar créditos", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie usuários, premium e créditos</p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={load}>
          <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.totalUsers },
            { label: "Premium", value: stats.premiumUsers },
            { label: "Gratuitos", value: stats.freeUsers },
            { label: "Tentativas", value: stats.totalAttempts },
          ].map(s => (
            <Card key={s.label} className="p-3">
              <p className="text-xs text-muted-foreground font-mono uppercase">{s.label}</p>
              <p className="text-2xl font-bold font-mono">{s.value.toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por nome, email ou token..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {(["all", "premium", "free"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => { setFilter(f); setPage(1); }}>
            {f === "all" ? "Todos" : f === "premium" ? "Premium" : "Gratuitos"}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono">
            {data ? `${data.total.toLocaleString()} usuários` : "Carregando..."}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="divide-y">
              {data?.users.map(u => (
                <div key={u.id} className="p-4 flex flex-wrap gap-3 items-center">
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-medium text-sm">{u.displayName ?? <span className="text-muted-foreground italic">Sem nome</span>}</p>
                    <p className="text-xs text-muted-foreground">{u.email ?? u.deviceToken.slice(0, 20) + "..."}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{u.level}</Badge>
                      {u.isPremium && <Badge className="text-[10px] px-1 py-0 bg-yellow-500 text-black">Premium</Badge>}
                      <span className="text-[10px] text-muted-foreground">{u.attemptsCount} tentativas</span>
                      <span className="text-[10px] text-muted-foreground">🔥 {u.streakDays}d</span>
                      <span className="text-[10px] text-muted-foreground">{u.xpTotal} XP</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Créditos:</span>
                      <Input
                        className="w-16 h-7 text-xs"
                        type="number"
                        value={creditTarget[u.deviceToken] ?? String(u.aiCredits)}
                        onChange={e => setCreditTarget(c => ({ ...c, [u.deviceToken]: e.target.value }))}
                      />
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => adjustCredits(u)}>
                        <CreditCard className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant={u.isPremium ? "destructive" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => togglePremium(u)}
                    >
                      <Star className="h-3 w-3 mr-1" />
                      {u.isPremium ? "Remover" : "Premium"}
                    </Button>
                  </div>
                </div>
              ))}
              {data?.users.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">Nenhum usuário encontrado.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-mono">Página {page} de {data.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
