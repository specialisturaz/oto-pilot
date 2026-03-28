"use client";

import { useState } from "react";
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  Building2,
  Clock,
  Upload,
  ExternalLink,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
import { cn } from "@/lib/utils";

interface Portal {
  id: string;
  name: string;
  url: string;
  status: "aktif" | "pasif";
  connected: boolean;
  total_listings: number;
  total_views: number;
  last_sync: string;
  color: string;
}

interface SyncLog {
  id: string;
  portal: string;
  action: string;
  status: "basarili" | "hatali";
  time: string;
  details: string;
}

const mockPortals: Portal[] = [
  {
    id: "1",
    name: "Sahibinden.com",
    url: "https://sahibinden.com",
    status: "aktif",
    connected: true,
    total_listings: 45,
    total_views: 12450,
    last_sync: "28 Mart 2026, 09:15",
    color: "#1a3a8a",
  },
  {
    id: "2",
    name: "Hepsiemlak.com",
    url: "https://hepsiemlak.com",
    status: "aktif",
    connected: true,
    total_listings: 38,
    total_views: 8720,
    last_sync: "28 Mart 2026, 09:10",
    color: "#e30a17",
  },
  {
    id: "3",
    name: "Emlakjet.com",
    url: "https://emlakjet.com",
    status: "aktif",
    connected: true,
    total_listings: 32,
    total_views: 5340,
    last_sync: "28 Mart 2026, 08:45",
    color: "#f59e0b",
  },
  {
    id: "4",
    name: "Zingat.com",
    url: "https://zingat.com",
    status: "pasif",
    connected: false,
    total_listings: 0,
    total_views: 0,
    last_sync: "Baglanti yok",
    color: "#6b7280",
  },
];

const portalComparisonData = [
  { name: "Sahibinden", goruntulenme: 12450, ilan: 45 },
  { name: "Hepsiemlak", goruntulenme: 8720, ilan: 38 },
  { name: "Emlakjet", goruntulenme: 5340, ilan: 32 },
  { name: "Zingat", goruntulenme: 0, ilan: 0 },
];

const mockSyncLogs: SyncLog[] = [
  {
    id: "1",
    portal: "Sahibinden.com",
    action: "Ilan guncelleme",
    status: "basarili",
    time: "09:15",
    details: "45 ilan basariyla guncellendi",
  },
  {
    id: "2",
    portal: "Hepsiemlak.com",
    action: "Ilan guncelleme",
    status: "basarili",
    time: "09:10",
    details: "38 ilan basariyla guncellendi",
  },
  {
    id: "3",
    portal: "Emlakjet.com",
    action: "Yeni ilan yayini",
    status: "basarili",
    time: "08:45",
    details: "2 yeni ilan yayinlandi",
  },
  {
    id: "4",
    portal: "Zingat.com",
    action: "Baglanti denemesi",
    status: "hatali",
    time: "08:30",
    details: "API anahtari gecersiz",
  },
  {
    id: "5",
    portal: "Sahibinden.com",
    action: "Fotograf guncelleme",
    status: "basarili",
    time: "08:00",
    details: "12 ilan icin fotograflar guncellendi",
  },
  {
    id: "6",
    portal: "Hepsiemlak.com",
    action: "Fiyat guncelleme",
    status: "basarili",
    time: "Dun 17:30",
    details: "5 ilanin fiyati guncellendi",
  },
];

export default function PortallarPage() {
  const [selectedPortals, setSelectedPortals] = useState<string[]>([]);

  const togglePortalSelection = (portalId: string) => {
    setSelectedPortals((prev) =>
      prev.includes(portalId)
        ? prev.filter((id) => id !== portalId)
        : [...prev, portalId]
    );
  };

  const connectedPortals = mockPortals.filter((p) => p.connected);
  const totalListings = connectedPortals.reduce(
    (sum, p) => sum + p.total_listings,
    0
  );
  const totalViews = connectedPortals.reduce(
    (sum, p) => sum + p.total_views,
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portallar</h1>
          <p className="text-muted-foreground">
            {connectedPortals.length} portal bagli &middot; Toplam{" "}
            {totalListings} ilan &middot; {totalViews.toLocaleString("tr-TR")}{" "}
            goruntulenme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tumu Senkronize Et
          </Button>
          <Button disabled={selectedPortals.length === 0}>
            <Upload className="mr-2 h-4 w-4" />
            Toplu Yayinla
          </Button>
        </div>
      </div>

      {/* Portal Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mockPortals.map((portal) => (
          <Card
            key={portal.id}
            className={cn(
              "relative cursor-pointer transition-all hover:shadow-md",
              selectedPortals.includes(portal.id) && "ring-2 ring-primary"
            )}
            onClick={() => togglePortalSelection(portal.id)}
          >
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm"
                      style={{ backgroundColor: portal.color }}
                    >
                      {portal.name[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{portal.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        {portal.connected ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {portal.connected ? "Bagli" : "Baglanti yok"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={portal.status === "aktif" ? "success" : "secondary"}
                  >
                    {portal.status === "aktif" ? "Aktif" : "Pasif"}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Ilan</p>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold">
                        {portal.total_listings}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      Goruntulenme
                    </p>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold">
                        {portal.total_views.toLocaleString("tr-TR")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Sync */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t pt-3">
                  <Clock className="h-3 w-3" />
                  <span>Son senkronizasyon: {portal.last_sync}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Portal Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Portal Performans Karsilastirmasi
            </CardTitle>
            <CardDescription>
              Portallara gore goruntulenme sayilari
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={portalComparisonData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
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
                    dataKey="goruntulenme"
                    name="Goruntulenme"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sync Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Senkronizasyon Gecmisi
            </CardTitle>
            <CardDescription>Son islemler ve aktiviteler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockSyncLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      log.status === "basarili"
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-red-100 text-red-600"
                    )}
                  >
                    {log.status === "basarili" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{log.portal}</p>
                      <span className="text-xs text-muted-foreground">
                        {log.time}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {log.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.details}
                    </p>
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
