import { useState, useEffect } from "react";
import { Bell, Download, RefreshCw, Mail, Smartphone, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/adminClient";

type InterestRecord = {
  deviceToken: string;
  email: string;
  planKey: string;
  registeredAt: string;
};

export default function InterestListAdminPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<InterestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<InterestRecord[]>("/api/admin/interest-list");
      setRecords(data);
    } catch { toast({ title: "Erro ao carregar", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r =>
    r.email.toLowerCase().includes(search.toLowerCase()) ||
    r.deviceToken.toLowerCase().includes(search.toLowerCase()) ||
    r.planKey.toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    const header = "Email,Plano,Device Token,Data\n";
    const rows = filtered.map(r =>
      `${r.email},${r.planKey},${r.deviceToken},${new Date(r.registeredAt).toLocaleString("pt-BR")}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "interesse-premium.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const withEmail = records.filter(r => r.email).length;
  const planBreakdown = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.planKey] = (acc[r.planKey] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight">Interesse em Premium</h1>
            <p className="text-sm text-muted-foreground">
              Usuários que solicitaram ser avisados quando os pagamentos forem ativados
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-3 w-3 mr-1" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold font-mono text-primary">{records.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Interessados total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold font-mono text-green-400">{withEmail}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Com e-mail fornecido</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(planBreakdown).map(([plan, count]) => (
                <div key={plan} className="text-center">
                  <p className="text-xl font-bold font-mono">{count}</p>
                  <p className="text-[10px] text-muted-foreground">{plan}</p>
                </div>
              ))}
              {Object.keys(planBreakdown).length === 0 && (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por plano</p>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      {records.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs text-primary">
          <strong>Próximo passo:</strong> Configure o <code className="bg-primary/20 px-1 rounded">PADDLE_API_KEY</code> na aba <strong>API Vault</strong> para ativar os pagamentos. Quando ativo, esses usuários poderão assinar normalmente.
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar por e-mail, token ou plano..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {search && (
          <Button variant="outline" size="sm" onClick={() => setSearch("")}>Limpar</Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {records.length === 0
              ? "Nenhum usuário registrou interesse ainda."
              : "Nenhum resultado para essa busca."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-sm">{r.email ? r.email[0]?.toUpperCase() : "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{r.email}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Sem e-mail</span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      <Package className="h-2.5 w-2.5 mr-1" />{r.planKey}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Smartphone className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{r.deviceToken}</span>
                    <span className="text-[10px] text-muted-foreground">
                      · {new Date(r.registeredAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                {r.email && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 text-[10px] text-muted-foreground"
                    onClick={() => { navigator.clipboard.writeText(r.email); toast({ title: "E-mail copiado" }); }}
                  >
                    Copiar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {filtered.length < records.length && (
            <p className="text-xs text-center text-muted-foreground">{filtered.length} de {records.length} registros</p>
          )}
        </div>
      )}
    </div>
  );
}
