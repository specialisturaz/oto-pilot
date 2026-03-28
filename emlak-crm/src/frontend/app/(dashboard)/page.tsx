"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Building2,
  HandshakeIcon,
  TrendingUp,
  CalendarDays,
  Phone,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { StatsCard } from "@/components/stats-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatRelativeDate } from "@/lib/utils";
import api from "@/lib/api";

// Fallback mock data - used when API is unavailable
const fallbackPipelineData = [
  { name: "Talep", value: 0 },
  { name: "Gosterim", value: 0 },
  { name: "Pazarlik", value: 0 },
  { name: "Teklif", value: 0 },
  { name: "Kapora", value: 0 },
  { name: "Sozlesme", value: 0 },
  { name: "Tapu", value: 0 },
];

const fallbackPortalData = [
  { name: "Sahibinden", value: 45, color: "#1a3a8a" },
  { name: "Hepsiemlak", value: 30, color: "#e30a17" },
  { name: "Emlakjet", value: 15, color: "#f59e0b" },
  { name: "Diger", value: 10, color: "#6b7280" },
];

const fallbackActivities = [
  {
    id: 1,
    type: "call",
    description: "Henuz aktivite bulunmuyor",
    time: new Date(),
    icon: Phone,
  },
];

const fallbackTasks = [
  {
    id: 1,
    title: "Henuz gorev bulunmuyor",
    customer: "-",
    date: "-",
    type: "info",
  },
];

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardContent className="p-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/api/v1/reports/dashboard-stats");
      return res.data?.data || res.data;
    },
    retry: false,
  });

  const { data: recentActivitiesData } = useQuery({
    queryKey: ["recent-activities"],
    queryFn: async () => {
      const res = await api.get("/api/v1/activities", {
        params: { limit: 5 },
      });
      return res.data?.data || res.data;
    },
    retry: false,
  });

  // Map icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return Phone;
      case "showing":
        return Eye;
      case "deal":
        return HandshakeIcon;
      case "listing":
        return Building2;
      case "contact":
        return Users;
      default:
        return Clock;
    }
  };

  const totalContacts = statsData?.totalContacts ?? "-";
  const activeProperties = statsData?.activeProperties ?? "-";
  const openDeals = statsData?.openDeals ?? "-";
  const monthlyCommission = statsData?.monthlyCommission ?? 0;

  const pipelineData = statsData?.pipelineData || fallbackPipelineData;
  const portalData = statsData?.portalData || fallbackPortalData;

  const recentActivities = recentActivitiesData?.items || recentActivitiesData || null;
  const upcomingTasks = statsData?.upcomingTasks || fallbackTasks;

  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Ana Sayfa
        </h1>
        <p className="text-muted-foreground">
          Hosgeldiniz! Iste gunluk ozet bilgileriniz.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Toplam Musteri"
          value={String(totalContacts)}
          change=""
          changeType="neutral"
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          title="Aktif Ilan"
          value={String(activeProperties)}
          change=""
          changeType="neutral"
          icon={Building2}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-100"
        />
        <StatsCard
          title="Acik Satis"
          value={String(openDeals)}
          change=""
          changeType="neutral"
          icon={HandshakeIcon}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
        />
        <StatsCard
          title="Aylik Komisyon"
          value={typeof monthlyCommission === "number" ? formatPrice(monthlyCommission) : String(monthlyCommission)}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Pipeline Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">Satis Pipeline</CardTitle>
            <CardDescription>
              Asamalara gore aktif satislar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    className="fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    className="fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Portal Performance */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Portal Performansi</CardTitle>
            <CardDescription>
              Portallara gore ilan dagilimi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {portalData.map((entry: { color?: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {portalData.map((portal: { name: string; value: number; color?: string }) => (
                <div
                  key={portal.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: portal.color || "#6b7280" }}
                    />
                    <span>{portal.name}</span>
                  </div>
                  <span className="font-medium">{portal.value} ilan</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Son Aktiviteler</CardTitle>
            <CardDescription>
              Son yapilan islemler ve etkinlikler
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities && Array.isArray(recentActivities) && recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity: { id?: string | number; type?: string; description?: string; createdAt?: string; time?: string | Date }, index: number) => {
                  const Icon = getActivityIcon(activity.type || "");
                  return (
                    <div
                      key={activity.id || index}
                      className="flex items-start gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.createdAt
                            ? formatRelativeDate(activity.createdAt)
                            : activity.time
                              ? formatRelativeDate(activity.time)
                              : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Henuz aktivite bulunmuyor
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Yaklasan Gorevler</CardTitle>
            <CardDescription>
              Planlanan gorusme ve randevular
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks && Array.isArray(upcomingTasks) && upcomingTasks.length > 0 ? (
              <div className="space-y-4">
                {upcomingTasks.map((task: { id?: string | number; title?: string; customer?: string; date?: string }, index: number) => (
                  <div
                    key={task.id || index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.customer}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{task.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Henuz planlanan gorev bulunmuyor
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
