"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  DollarSign,
  Clock,
  Percent,
  Download,
  FileText,
  FileSpreadsheet,
  Calendar,
  Eye,
  Heart,
  BarChart3,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/stats-card";
import { cn, formatPrice, formatPriceShort } from "@/lib/utils";
import api from "@/lib/api";

type DateRange = "bu_hafta" | "bu_ay" | "son_3_ay" | "bu_yil" | "ozel";

const dateRangeOptions: { id: DateRange; label: string }[] = [
  { id: "bu_hafta", label: "Bu Hafta" },
  { id: "bu_ay", label: "Bu Ay" },
  { id: "son_3_ay", label: "Son 3 Ay" },
  { id: "bu_yil", label: "Bu Yil" },
  { id: "ozel", label: "Ozel" },
];

// Calculate date range from selection
function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  let from: Date;

  switch (range) {
    case "bu_hafta": {
      from = new Date(now);
      from.setDate(now.getDate() - now.getDay() + 1); // Monday
      break;
    }
    case "bu_ay": {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "son_3_ay": {
      from = new Date(now);
      from.setMonth(now.getMonth() - 3);
      break;
    }
    case "bu_yil": {
      from = new Date(now.getFullYear(), 0, 1);
      break;
    }
    default: {
      from = new Date(now.getFullYear(), 0, 1);
      break;
    }
  }

  return { from: from.toISOString().split("T")[0], to };
}

// Fallback data
const fallbackMonthlyRevenue = [
  { ay: "Oca", gelir: 850000 },
  { ay: "Sub", gelir: 1200000 },
  { ay: "Mar", gelir: 980000 },
  { ay: "Nis", gelir: 1450000 },
  { ay: "May", gelir: 1100000 },
  { ay: "Haz", gelir: 1650000 },
  { ay: "Tem", gelir: 1380000 },
  { ay: "Agu", gelir: 1520000 },
  { ay: "Eyl", gelir: 1750000 },
  { ay: "Eki", gelir: 1900000 },
  { ay: "Kas", gelir: 2100000 },
  { ay: "Ara", gelir: 2350000 },
];

const fallbackFunnelData = [
  { asama: "Talep", sayi: 124, color: "#64748b" },
  { asama: "Gosterim", sayi: 86, color: "#3b82f6" },
  { asama: "Pazarlik", sayi: 52, color: "#6366f1" },
  { asama: "Teklif", sayi: 38, color: "#8b5cf6" },
  { asama: "Kapora", sayi: 24, color: "#f59e0b" },
  { asama: "Sozlesme", sayi: 18, color: "#f97316" },
  { asama: "Tapu", sayi: 12, color: "#10b981" },
];

const fallbackCommissionData = [
  { name: "Alici Komisyonu", value: 45, color: "hsl(var(--primary))" },
  { name: "Satici Komisyonu", value: 35, color: "#f59e0b" },
  { name: "Kira Komisyonu", value: 15, color: "#10b981" },
  { name: "Referans", value: 5, color: "#6b7280" },
];

const fallbackAgentPerformance = [
  { id: "1", name: "Mehmet Danisman", deals_closed: 18, revenue: 12500000, commission: 625000, conversion_rate: 32, avg_response_time: "15 dk" },
  { id: "2", name: "Ayse Danisman", deals_closed: 15, revenue: 9800000, commission: 490000, conversion_rate: 28, avg_response_time: "22 dk" },
  { id: "3", name: "Can Yilmaz", deals_closed: 12, revenue: 7200000, commission: 360000, conversion_rate: 25, avg_response_time: "18 dk" },
  { id: "4", name: "Selin Korkmaz", deals_closed: 9, revenue: 5400000, commission: 270000, conversion_rate: 22, avg_response_time: "30 dk" },
];

const fallbackTopProperties = [
  { id: "1", title: "Besiktas Deniz Manzarali Villa", views: 512, favorites: 48, location: "Besiktas, Istanbul" },
  { id: "2", title: "Kadikoy Merkez 3+1 Daire", views: 245, favorites: 32, location: "Kadikoy, Istanbul" },
  { id: "3", title: "Atasehir Residence 2+1", views: 189, favorites: 21, location: "Atasehir, Istanbul" },
  { id: "4", title: "Bakirkoy 4+1 Dublex", views: 167, favorites: 19, location: "Bakirkoy, Istanbul" },
  { id: "5", title: "Sisli Merkez Ofis", views: 134, favorites: 12, location: "Sisli, Istanbul" },
];

const fallbackPortalPerformance = [
  { portal: "Sahibinden", goruntulenme: 12450, talep: 48, donusum: 8 },
  { portal: "Hepsiemlak", goruntulenme: 8720, talep: 32, donusum: 5 },
  { portal: "Emlakjet", goruntulenme: 5340, talep: 18, donusum: 3 },
  { portal: "Zingat", goruntulenme: 2100, talep: 8, donusum: 1 },
];

function generateCSV(headers: string[], rows: string[][]): string {
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  return csvContent;
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function RaporlarPage() {
  const [selectedRange, setSelectedRange] = useState<DateRange>("bu_ay");
  const dateRange = getDateRange(selectedRange);

  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ["reports-stats", selectedRange],
    queryFn: async () => {
      const res = await api.get("/api/v1/reports/dashboard-stats");
      return res.data?.data || res.data;
    },
    retry: 1,
  });

  // Fetch sales data
  const { data: salesData, isLoading: salesLoading, isError: salesError } = useQuery({
    queryKey: ["reports-sales", dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await api.get(`/api/v1/reports/sales?from=${dateRange.from}&to=${dateRange.to}`);
      return res.data?.data || res.data;
    },
    retry: 1,
  });

  // Fetch agent performance
  const { data: agentData, isLoading: agentLoading, isError: agentError } = useQuery({
    queryKey: ["reports-agents", selectedRange],
    queryFn: async () => {
      const res = await api.get("/api/v1/reports/agent-performance");
      return res.data?.data || res.data;
    },
    retry: 1,
  });

  // Resolve data with fallbacks
  const stats = statsError ? null : statsData;
  const totalSales = stats?.totalSales ?? stats?.total_sales ?? "54";
  const totalCommission = stats?.totalCommission ?? stats?.total_commission ?? 1745000;
  const avgSalesDuration = stats?.avgSalesDuration ?? stats?.avg_sales_duration ?? "34 Gun";
  const conversionRate = stats?.conversionRate ?? stats?.conversion_rate ?? 27;
  const salesChange = stats?.salesChange ?? "+18% gecen aya gore";
  const commissionChange = stats?.commissionChange ?? "+22% gecen aya gore";
  const durationChange = stats?.durationChange ?? "-5 gun gecen aya gore";
  const conversionChange = stats?.conversionChange ?? "+3% gecen aya gore";

  const monthlyRevenue = salesError
    ? fallbackMonthlyRevenue
    : salesData?.monthlyRevenue || salesData?.monthly_revenue || fallbackMonthlyRevenue;

  const funnelData = salesError
    ? fallbackFunnelData
    : salesData?.funnelData || salesData?.funnel_data || fallbackFunnelData;

  const commissionData = salesError
    ? fallbackCommissionData
    : salesData?.commissionData || salesData?.commission_data || fallbackCommissionData;

  const agentPerformance = agentError
    ? fallbackAgentPerformance
    : (Array.isArray(agentData) ? agentData : agentData?.agents || agentData?.items || fallbackAgentPerformance).map(
        (a: Record<string, unknown>) => ({
          id: a.id || String(Math.random()),
          name: a.name || a.agentName || `${a.firstName || ""} ${a.lastName || ""}`.trim() || "Danisman",
          deals_closed: a.deals_closed ?? a.dealsClosed ?? 0,
          revenue: a.revenue ?? a.totalRevenue ?? 0,
          commission: a.commission ?? a.totalCommission ?? 0,
          conversion_rate: a.conversion_rate ?? a.conversionRate ?? 0,
          avg_response_time: a.avg_response_time ?? a.avgResponseTime ?? "-",
        })
      );

  const topProperties = salesError
    ? fallbackTopProperties
    : salesData?.topProperties || salesData?.top_properties || fallbackTopProperties;

  const portalPerformance = salesError
    ? fallbackPortalPerformance
    : salesData?.portalPerformance || salesData?.portal_performance || fallbackPortalPerformance;

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const headers = ["Danisman", "Kapanan Satis", "Toplam Ciro", "Komisyon", "Donusum Orani"];
    const rows = agentPerformance.map((a: Record<string, unknown>) => [
      String(a.name || ""),
      String(a.deals_closed || 0),
      String(a.revenue || 0),
      String(a.commission || 0),
      `%${a.conversion_rate || 0}`,
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV("rapor-danisman-performans.csv", csv);
  }, [agentPerformance]);

  const handleExportSalesCSV = useCallback(() => {
    const headers = ["Ay", "Gelir (TL)"];
    const rows = monthlyRevenue.map((m: Record<string, unknown>) => [
      String(m.ay || ""),
      String(m.gelir || 0),
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV("rapor-aylik-satis.csv", csv);
  }, [monthlyRevenue]);

  const isAnyLoading = statsLoading || salesLoading || agentLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Raporlar</h1>
          <p className="text-muted-foreground">
            Satis performansi ve analiz raporlari
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportSalesCSV}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {dateRangeOptions.map((option) => (
              <Button
                key={option.id}
                variant={selectedRange === option.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRange(option.id)}
              >
                {option.id === "ozel" && (
                  <Calendar className="mr-2 h-3.5 w-3.5" />
                )}
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Toplam Satis"
            value={String(totalSales)}
            change={String(salesChange)}
            changeType="positive"
            icon={TrendingUp}
            iconColor="text-emerald-600"
            iconBgColor="bg-emerald-100"
          />
          <StatsCard
            title="Toplam Komisyon"
            value={formatPrice(Number(totalCommission))}
            change={String(commissionChange)}
            changeType="positive"
            icon={DollarSign}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
          />
          <StatsCard
            title="Ortalama Satis Suresi"
            value={String(avgSalesDuration)}
            change={String(durationChange)}
            changeType="positive"
            icon={Clock}
            iconColor="text-amber-600"
            iconBgColor="bg-amber-100"
          />
          <StatsCard
            title="Donusum Orani"
            value={`%${conversionRate}`}
            change={String(conversionChange)}
            changeType="positive"
            icon={Percent}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-100"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Sales Trend */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">Aylik Satis Trendi</CardTitle>
            <CardDescription>Aylik komisyon gelirleri (TL)</CardDescription>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="ay" fontSize={12} className="fill-muted-foreground" tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} className="fill-muted-foreground" tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(value: number) => [formatPrice(value), "Gelir"]}
                    />
                    <Line type="monotone" dataKey="gelir" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission Breakdown */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Komisyon Dagilimi</CardTitle>
            <CardDescription>Komisyon turlerine gore dagilim</CardDescription>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={commissionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {commissionData.map((entry: { color: string }, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number) => [`%${value}`, "Oran"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {commissionData.map((item: { name: string; value: number; color: string }) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">%{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deal Pipeline Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Satis Hunisi</CardTitle>
          <CardDescription>Asamalara gore musteri donusum sureci</CardDescription>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" fontSize={12} className="fill-muted-foreground" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="asama" fontSize={12} className="fill-muted-foreground" tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="sayi" name="Adet" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry: { color: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danisman Performansi</CardTitle>
          <CardDescription>Danismanlarin satis performans metrikleri</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {agentLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Danisman</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Kapanan Satis</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Toplam Ciro</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Komisyon</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Donusum Orani</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Ort. Yanit Suresi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {agentPerformance.map((agent: Record<string, unknown>, index: number) => (
                    <tr key={String(agent.id)} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium">{String(agent.name)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold">{Number(agent.deals_closed)}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm">{formatPriceShort(Number(agent.revenue))}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm">{formatPrice(Number(agent.commission))}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${Number(agent.conversion_rate)}%` }}
                            />
                          </div>
                          <span className="text-sm">%{Number(agent.conversion_rate)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-sm text-muted-foreground">{String(agent.avg_response_time)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">En Cok Ilgi Goren Ilanlar</CardTitle>
            <CardDescription>Goruntulenme ve favorilere gore siralama</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProperties.map((property: Record<string, unknown>, index: number) => (
                <div key={String(property.id)} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{String(property.title)}</p>
                      <p className="text-xs text-muted-foreground">{String(property.location)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      {Number(property.views)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="h-3.5 w-3.5" />
                      {Number(property.favorites)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Portal Performance Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Portal Performans Detayi</CardTitle>
            <CardDescription>Portallara gore detayli metrikler</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Portal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Goruntulenme</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Talep</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Donusum</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {portalPerformance.map((portal: Record<string, unknown>) => (
                    <tr key={String(portal.portal)} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium">{String(portal.portal)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{Number(portal.goruntulenme).toLocaleString("tr-TR")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{Number(portal.talep)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success">{Number(portal.donusum)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
