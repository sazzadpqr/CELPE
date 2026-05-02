import { useGetAdminStats, getGetAdminStatsQueryKey, useGetAdminLogs, getGetAdminLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, AlertCircle, MessageSquare, BookOpen, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() }
  });

  const { data: logs, isLoading: logsLoading } = useGetAdminLogs({
    query: { queryKey: getGetAdminLogsQueryKey() }
  });

  const endpointChartData = stats?.requestsByEndpoint
    ? Object.entries(stats.requestsByEndpoint).map(([endpoint, count]) => ({
        endpoint,
        count
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">Overview</h1>
          <p className="text-muted-foreground text-sm">System metrics and recent activity.</p>
        </div>
      </div>

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
              <div className="text-2xl font-bold font-mono">{stats?.aiCallsToday.toLocaleString() ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Prompts: {stats?.promptCallsToday ?? 0} | WOD: {stats?.wordOfDayCallsToday ?? 0}
            </p>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Traffic by Endpoint</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {statsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-[300px] w-full">
                {endpointChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={endpointChartData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <YAxis dataKey="endpoint" type="category" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
                        itemStyle={{ color: "var(--foreground)" }}
                        cursor={{ fill: "var(--accent)" }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>
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
              <ScrollArea className="h-[300px]">
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
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {log.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[120px] truncate" title={log.path}>
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
