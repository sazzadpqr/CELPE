import {
  useGetAdminStats, getGetAdminStatsQueryKey,
  useGetAdminLogs, getGetAdminLogsQueryKey,
  useListAdminSecurityEvents, getListAdminSecurityEventsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from "recharts";
import {
  Activity, AlertCircle, MessageSquare, Clock, ShieldCheck,
  Users, BookOpen, FlaskConical, Star, GraduationCap, Map,
  Flag, Bell, DollarSign, Megaphone, HelpCircle, Library,
  ArrowRight, Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { adminFetch } from "@/lib/adminClient";

// ─── Content Stats ─────────────────────────────────────────────────────────────

type ContentStats = {
  users: number;
  premiumUsers: number;
  prompts: number;
  grammarTopics: number;
  wotdEntries: number;
  diagnosticQuestions: number;
  quizQuestions: number;
  courses: number;
  lessons: number;
  learningPaths: number;
  studyMaterials: number;
  studyCategories: number;
  activeFeatureFlags: number;
  scheduledBanners: number;
  notificationCampaigns: number;
  monetizationPlans: number;
};

const CONTENT_CARDS: {
  key: keyof ContentStats;
  label: string;
  subKey?: keyof ContentStats;
  subLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}[] = [
  { key: "users", label: "Usuários", subKey: "premiumUsers", subLabel: "premium", icon: Users, href: "/users", color: "#3B82F6" },
  { key: "prompts", label: "Prompts", icon: MessageSquare, href: "/prompts", color: "#8B5CF6" },
  { key: "grammarTopics", label: "Tópicos de Gramática", icon: BookOpen, href: "/grammar", color: "#10B981" },
  { key: "diagnosticQuestions", label: "Questões Diagnóstico", icon: FlaskConical, href: "/diagnostic", color: "#F59E0B" },
  { key: "quizQuestions", label: "Questões de Quiz", icon: HelpCircle, href: "/quiz", color: "#EC4899" },
  { key: "wotdEntries", label: "Palavras do Dia", icon: Star, href: "/wotd", color: "#F97316" },
  { key: "courses", label: "Cursos", subKey: "lessons", subLabel: "aulas", icon: GraduationCap, href: "/courses", color: "#06B6D4" },
  { key: "learningPaths", label: "Trilhas", icon: Map, href: "/learning-paths", color: "#84CC16" },
  { key: "studyMaterials", label: "Materiais", subKey: "studyCategories", subLabel: "categorias", icon: Library, href: "/study-library", color: "#A855F7" },
  { key: "activeFeatureFlags", label: "Flags Ativas", icon: Flag, href: "/feature-flags", color: "#EF4444" },
  { key: "notificationCampaigns", label: "Campanhas", icon: Bell, href: "/notifications", color: "#0EA5E9" },
  { key: "monetizationPlans", label: "Planos", icon: DollarSign, href: "/monetization", color: "#22C55E" },
];

const QUICK_ACTIONS = [
  { label: "Nova questão diagnóstico", href: "/diagnostic", icon: FlaskConical, color: "#F59E0B" },
  { label: "Novo prompt de prática", href: "/prompts", icon: MessageSquare, color: "#8B5CF6" },
  { label: "Novo tópico de gramática", href: "/grammar", icon: BookOpen, color: "#10B981" },
  { label: "Nova notificação push", href: "/notifications", icon: Bell, color: "#0EA5E9" },
  { label: "Novo banner no app", href: "/banners", icon: Megaphone, color: "#EC4899" },
  { label: "Gerenciar feature flags", href: "/feature-flags", icon: Flag, color: "#EF4444" },
  { label: "Ver usuários premium", href: "/users", icon: Users, color: "#3B82F6" },
  { label: "Configurar planos", href: "/monetization", icon: DollarSign, color: "#22C55E" },
];

function ContentInventory() {
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    adminFetch<ContentStats>("/api/admin/content-stats")
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">
          Inventário de Conteúdo
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground/40">ao vivo</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
        {CONTENT_CARDS.map(card => (
          <button key={card.key}
            onClick={() => setLocation(card.href)}
            className="bg-card border border-border rounded-xl p-3 text-left hover:border-primary/30 hover:bg-secondary/50 transition-all group">
            <div className="flex items-start justify-between mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: card.color + "20" }}>
                <card.icon className="h-3.5 w-3.5" style={{ color: card.color }} />
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors mt-1" />
            </div>
            {loading ? (
              <Skeleton className="h-6 w-10 mb-1" />
            ) : (
              <div className="text-xl font-bold font-mono leading-none mb-1">
                {stats?.[card.key]?.toLocaleString("pt-BR") ?? 0}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground font-mono leading-tight">{card.label}</div>
            {card.subKey && stats && (
              <div className="text-[9px] text-muted-foreground/50 font-mono mt-0.5">
                {stats[card.subKey]} {card.subLabel}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickActions() {
  const [, setLocation] = useLocation();
  return (
    <div>
      <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Ações Rápidas
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(a => (
          <button key={a.href + a.label}
            onClick={() => setLocation(a.href)}
            className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-3 py-2.5 text-left hover:border-primary/30 hover:bg-secondary/50 transition-all group">
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: a.color + "20" }}>
              <a.icon className="h-3 w-3" style={{ color: a.color }} />
            </div>
            <span className="text-[11px] font-medium text-foreground leading-tight flex-1">{a.label}</span>
            <Plus className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey(), refetchInterval: 15000 }
  });

  const { data: logs, isLoading: logsLoading } = useGetAdminLogs({
    query: { queryKey: getGetAdminLogsQueryKey(), refetchInterval: 15000 }
  });

  const { data: securityEvents, isLoading: securityLoading } = useListAdminSecurityEvents({
    query: { queryKey: getListAdminSecurityEventsQueryKey(), refetchInterval: 30000 }
  });

  const endpointChartData = stats?.requestsByEndpoint
    ? Object.entries(stats.requestsByEndpoint)
        .map(([endpoint, count]) => ({ endpoint: endpoint.replace("/api", ""), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    : [];

  const hourlyData = stats?.hourlyAiCalls ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-mono">Visão Geral</h1>
        <p className="text-muted-foreground text-sm">Métricas do sistema e resumo de conteúdo.</p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Content Inventory */}
      <ContentInventory />

      {/* API Stats Row */}
      <div>
        <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Métricas do Servidor
        </h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Requisições Totais</CardTitle>
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-7 w-20" /> : (
                <div className="text-2xl font-bold font-mono">{stats?.totalRequests.toLocaleString() ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Chamadas IA Hoje</CardTitle>
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-7 w-20" /> : (
                <>
                  <div className="text-2xl font-bold font-mono">{stats?.aiCallsToday.toLocaleString() ?? 0}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                    F:{stats?.aiCallsToday ? (stats.aiCallsToday - (stats.promptCallsToday ?? 0) - (stats.wordOfDayCallsToday ?? 0)) : 0}
                    {" · "}P:{stats?.promptCallsToday ?? 0}
                    {" · "}W:{stats?.wordOfDayCallsToday ?? 0}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Erros Hoje</CardTitle>
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-7 w-20" /> : (
                <div className={`text-2xl font-bold font-mono ${(stats?.errorsToday ?? 0) > 0 ? "text-destructive" : ""}`}>
                  {stats?.errorsToday.toLocaleString() ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Uptime</CardTitle>
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-7 w-20" /> : (
                <div className="text-2xl font-bold font-mono">
                  {stats?.startedAt ? formatDistanceToNow(new Date(stats.startedAt)) : "—"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm">Chamadas IA — Últimas 24h</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          {statsLoading ? <Skeleton className="h-[180px] w-full" /> : (
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradFeedback" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPrompt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} interval={3} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} width={24} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                    itemStyle={{ color: "var(--foreground)" }} labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                  <Area type="monotone" dataKey="feedback" name="Feedback" stroke="hsl(var(--primary))" fill="url(#gradFeedback)" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                  <Area type="monotone" dataKey="prompt" name="Prompts" stroke="hsl(var(--chart-2))" fill="url(#gradPrompt)" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-sm">Tráfego por Endpoint</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {statsLoading ? <Skeleton className="h-[220px] w-full" /> : (
              <div className="h-[220px] w-full">
                {endpointChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={endpointChartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="endpoint" type="category" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} width={110} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }} cursor={{ fill: "var(--accent)" }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-mono">Sem dados ainda</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-sm">Logs Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : (
              <ScrollArea className="h-[220px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Método</TableHead>
                      <TableHead className="text-xs">Path</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-right text-xs">Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs && logs.length > 0 ? logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell><Badge variant="outline" className="font-mono text-[10px]">{log.method}</Badge></TableCell>
                        <TableCell className="font-mono text-[10px] max-w-[90px] truncate" title={log.path}>{log.path}</TableCell>
                        <TableCell><Badge variant={log.isError ? "destructive" : "secondary"} className="font-mono text-[10px]">{log.status}</Badge></TableCell>
                        <TableCell className="text-right text-[10px] text-muted-foreground font-mono">{format(new Date(log.timestamp), "HH:mm:ss")}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center h-20 text-muted-foreground text-xs">Sem logs</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-yellow-900/30">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-yellow-500" /> Atividade de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          {securityLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : (
            <ScrollArea className="h-[160px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Evento</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-right text-xs">Quando</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents && securityEvents.length > 0 ? securityEvents.map((evt) => (
                    <TableRow key={evt.id}>
                      <TableCell><Badge variant="outline" className="font-mono text-[10px] border-yellow-700/40 text-yellow-400">{evt.type.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{evt.description}</TableCell>
                      <TableCell className="text-right text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                        {formatDistanceToNow(new Date(evt.timestamp), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={3} className="text-center h-16 text-muted-foreground text-xs font-mono">Nenhum evento de segurança registrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
