"use client";

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
import { formatPrice, formatRelativeDate } from "@/lib/utils";

// Mock data - will be replaced with API calls
const pipelineData = [
  { name: "Talep", value: 24 },
  { name: "Gosterim", value: 18 },
  { name: "Pazarlik", value: 12 },
  { name: "Teklif", value: 8 },
  { name: "Kapora", value: 5 },
  { name: "Sozlesme", value: 3 },
  { name: "Tapu", value: 2 },
];

const portalData = [
  { name: "Sahibinden", value: 45, color: "#1a3a8a" },
  { name: "Hepsiemlak", value: 30, color: "#e30a17" },
  { name: "Emlakjet", value: 15, color: "#f59e0b" },
  { name: "Diger", value: 10, color: "#6b7280" },
];

const recentActivities = [
  {
    id: 1,
    type: "call",
    description: "Ahmet Yilmaz ile telefon gorusmesi yapildi",
    time: new Date(Date.now() - 1000 * 60 * 30),
    icon: Phone,
  },
  {
    id: 2,
    type: "showing",
    description: "Kadikoy 3+1 daire gosterimi tamamlandi",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2),
    icon: Eye,
  },
  {
    id: 3,
    type: "deal",
    description: "Besiktas villa icin teklif alindi",
    time: new Date(Date.now() - 1000 * 60 * 60 * 5),
    icon: HandshakeIcon,
  },
  {
    id: 4,
    type: "listing",
    description: "Yeni ilan eklendi: Atasehir 2+1 Daire",
    time: new Date(Date.now() - 1000 * 60 * 60 * 8),
    icon: Building2,
  },
  {
    id: 5,
    type: "contact",
    description: "Yeni musteri kaydedildi: Fatma Demir",
    time: new Date(Date.now() - 1000 * 60 * 60 * 12),
    icon: Users,
  },
];

const upcomingTasks = [
  {
    id: 1,
    title: "Kadikoy daire gosterimi",
    customer: "Mehmet Ozturk",
    date: "Bugun, 14:00",
    type: "showing",
  },
  {
    id: 2,
    title: "Sozlesme imzalama",
    customer: "Ayse Kaya",
    date: "Bugun, 16:30",
    type: "contract",
  },
  {
    id: 3,
    title: "Fiyat gorusmesi",
    customer: "Ali Celik",
    date: "Yarin, 10:00",
    type: "negotiation",
  },
  {
    id: 4,
    title: "Tapu devir islemleri",
    customer: "Zeynep Arslan",
    date: "Yarin, 14:00",
    type: "deed",
  },
];

export default function DashboardPage() {
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
          value="1.248"
          change="+12% gecen aya gore"
          changeType="positive"
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          title="Aktif Ilan"
          value="384"
          change="+5 bu hafta"
          changeType="positive"
          icon={Building2}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-100"
        />
        <StatsCard
          title="Acik Satis"
          value="67"
          change="8 tamamlanmaya yakin"
          changeType="neutral"
          icon={HandshakeIcon}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
        />
        <StatsCard
          title="Aylik Komisyon"
          value={formatPrice(285000)}
          change="+18% gecen aya gore"
          changeType="positive"
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
                    {portalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
              {portalData.map((portal) => (
                <div
                  key={portal.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: portal.color }}
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
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeDate(activity.time)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
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
            <div className="space-y-4">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
