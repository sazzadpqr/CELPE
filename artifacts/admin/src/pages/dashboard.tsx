import { useGetAdminStats, getGetAdminStatsQueryKey, useGetAdminLogs, getGetAdminLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from "recharts";
import { Activity, AlertCircle, MessageSquare, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey(), refetchInterval: 15000 }
  });

  const { data: logs, isLoading: logsLoading } = useGetAdminLogs({
    query: { queryKey: getGetAdminLogsQueryKey(), refetchInterval: 15000 }
  });

  const endpointChartData = stats?.requestsByEndpoint
    ? Object.entries(stats.requestsByEndpoint)
        .map(([endpoint, count]) => ({ endpoint: endpoint.replace("/api", ""), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    : [];

  const hourlyData = stats?.hourlyAiCalls ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-mono">Overview</h1>
        <p className="text-muted-foreground text-sm">System metrics and recent activity.</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold font-mono">{stats?.totalRequests.toLocaleString() ?? 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Calls Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold font-mono">{stats?.aiCallsToday.toLocaleString() ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Feedback: {stats?.aiCallsToday ? (stats.aiCallsToday - (stats.promptCallsToday ?? 0) - (stats.wordOfDayCallsToday ?? 0)) : 0} · Prompts: {stats?.promptCallsToday ?? 0} · WOD: {stats?.wordOfDayCallsToday ?? 0}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors Today</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold font-mono text-destructive">{stats?.errorsToday.toLocaleString() ?? 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {stats?.startedAt ? formatDistanceToNow(new Date(stats.startedAt)) : "-"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hourly AI calls chart — full width */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-lg">AI Call Volume — Last 24 Hours</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          {statsLoading ? (
            <div className="h-[220px]">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <div className="h-[220px] w-full">
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
                    <linearGradient id="gradWod" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    interval={3}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: 12,
                    }}
                    itemStyle={{ color: "var(--foreground)" }}
                    labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="feedback"
                    name="Feedback"
                    stroke="hsl(var(--primary))"
                    fill="url(#gradFeedback)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="prompt"
                    name="Prompts"
                    stroke="hsl(var(--chart-2))"
                    fill="url(#gradPrompt)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="wordOfDay"
                    name="Word of Day"
                    stroke="hsl(var(--chart-3))"
                    fill="url(#gradWod)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traffic by endpoint + Recent logs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Traffic by Endpoint</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {statsLoading ? (
              <div className="h-[260px]">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-[260px] w-full">
                {endpointChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={endpointChartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        dataKey="endpoint"
                        type="category"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        width={120}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          fontSize: 12,
                        }}
                        itemStyle={{ color: "var(--foreground)" }}
                        cursor={{ fill: "var(--accent)" }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Recent Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[260px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs && logs.length > 0 ? (
                      logs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {log.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[110px] truncate" title={log.path}>
                            {log.path}
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.isError ? "destructive" : "secondary"} className="font-mono text-[10px]">
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {format(new Date(log.timestamp), "HH:mm:ss")}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                          No recent logs
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
