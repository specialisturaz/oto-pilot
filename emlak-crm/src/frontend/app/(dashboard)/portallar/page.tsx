"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Wifi,
  WifiOff,
  Heart,
  AlertTriangle,
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
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

// ---- Types ----

interface PortalData {
  id: string;
  name: string;
  slug: string;
  baseUrl: string | null;
  apiUrl: string | null;
  isActive: boolean;
  hasApiKey: boolean;
  totalListings: number;
  totalViews: number;
  totalFavorites: number;
  createdAt: string;
  updatedAt: string;
}

interface PortalStats {
  portals: Array<{
    portalId: string;
    portalName: string;
    portalSlug: string;
    isActive: boolean;
    totalListings: number;
    publishedListings: number;
    pendingListings: number;
    rejectedListings: number;
    totalViews: number;
    totalFavorites: number;
  }>;
  totals: {
    totalListings: number;
    totalViews: number;
    totalFavorites: number;
    publishedListings: number;
  };
}

interface SyncResult {
  message: string;
  synced: number;
  failed: number;
  results: Array<{
    portal: string;
    externalId: string;
    success: boolean;
    message: string;
  }>;
}

interface TestConnectionResult {
  success: boolean;
  portal: string;
  message: string;
}

// ---- Portal color mapping ----

const PORTAL_COLORS: Record<string, string> = {
  sahibinden: "#1a3a8a",
  hepsiemlak: "#e30a17",
  emlakjet: "#f59e0b",
};

const getPortalColor = (slug: string) => PORTAL_COLORS[slug] || "#6b7280";

// ---- API functions ----

async function fetchPortals(): Promise<PortalData[]> {
  const res = await api.get("/api/v1/portals");
  return res.data.data;
}

async function fetchStats(): Promise<PortalStats> {
  const res = await api.get("/api/v1/portals/stats");
  return res.data.data;
}

async function syncPortals(): Promise<SyncResult> {
  const res = await api.post("/api/v1/portals/sync");
  return res.data.data;
}

async function testConnection(portalId: string): Promise<TestConnectionResult> {
  const res = await api.post(`/api/v1/portals/${portalId}/test-connection`);
  return res.data.data;
}

// ---- Component ----

export default function PortallarPage() {
  const queryClient = useQueryClient();
  const [selectedPortals, setSelectedPortals] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<
    Record<string, { loading: boolean; result?: TestConnectionResult }>
  >({});

  // Fetch portals
  const {
    data: portals,
    isLoading: portalsLoading,
    error: portalsError,
  } = useQuery({
    queryKey: ["portals"],
    queryFn: fetchPortals,
  });

  // Fetch stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["portal-stats"],
    queryFn: fetchStats,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: syncPortals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portals"] });
      queryClient.invalidateQueries({ queryKey: ["portal-stats"] });
    },
  });

  // Toggle portal selection
  const togglePortalSelection = useCallback((portalId: string) => {
    setSelectedPortals((prev) =>
      prev.includes(portalId)
        ? prev.filter((id) => id !== portalId)
        : [...prev, portalId]
    );
  }, []);

  // Test connection handler
  const handleTestConnection = useCallback(
    async (portalId: string) => {
      setTestResults((prev) => ({
        ...prev,
        [portalId]: { loading: true },
      }));

      try {
        const result = await testConnection(portalId);
        setTestResults((prev) => ({
          ...prev,
          [portalId]: { loading: false, result },
        }));
      } catch {
        setTestResults((prev) => ({
          ...prev,
          [portalId]: {
            loading: false,
            result: {
              success: false,
              portal: "",
              message: "Baglanti testi basarisiz oldu",
            },
          },
        }));
      }
    },
    []
  );

  // Handle bulk publish
  const handleBulkPublish = useCallback(() => {
    if (selectedPortals.length === 0) return;
    // Navigate or open dialog - for now we show an alert
    // In a real implementation, this would open a property selection dialog
    const slugs = portals
      ?.filter((p) => selectedPortals.includes(p.id))
      .map((p) => p.slug);
    if (slugs && slugs.length > 0) {
      alert(
        `Secilen portaller: ${slugs.join(", ")}\nIlan secimi icin ilan sayfasina gidiniz.`
      );
    }
  }, [selectedPortals, portals]);

  // Computed values
  const connectedPortals = portals?.filter((p) => p.isActive && p.hasApiKey) || [];
  const totalListings = stats?.totals.totalListings || 0;
  const totalViews = stats?.totals.totalViews || 0;
  const totalFavorites = stats?.totals.totalFavorites || 0;

  // Chart data
  const chartData =
    stats?.portals.map((s) => ({
      name: s.portalName.replace(".com", ""),
      goruntulenme: s.totalViews,
      favori: s.totalFavorites,
      ilan: s.totalListings,
    })) || [];

  // Loading state
  if (portalsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (portalsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-lg font-semibold">Portallar yuklenirken hata olustu</h2>
        <p className="text-sm text-muted-foreground">
          Lutfen sayfayi yenileyip tekrar deneyiniz.
        </p>
        <Button
          variant="outline"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["portals"] })
          }
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portallar</h1>
          <p className="text-muted-foreground">
            {connectedPortals.length} portal bagli &middot; Toplam{" "}
            {totalListings} ilan &middot;{" "}
            {totalViews.toLocaleString("tr-TR")} goruntulenme &middot;{" "}
            {totalFavorites.toLocaleString("tr-TR")} favori
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {syncMutation.isPending
              ? "Senkronize Ediliyor..."
              : "Tumu Senkronize Et"}
          </Button>
          <Button
            disabled={selectedPortals.length === 0}
            onClick={handleBulkPublish}
          >
            <Upload className="mr-2 h-4 w-4" />
            Toplu Yayinla
          </Button>
        </div>
      </div>

      {/* Sync result banner */}
      {syncMutation.isSuccess && syncMutation.data && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {syncMutation.data.message}: {syncMutation.data.synced}{" "}
                basarili, {syncMutation.data.failed} basarisiz
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {syncMutation.isError && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                Senkronizasyon sirasinda hata olustu. Lutfen tekrar deneyiniz.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portal Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {portals?.map((portal) => {
          const portalStat = stats?.portals.find(
            (s) => s.portalId === portal.id
          );
          const testState = testResults[portal.id];

          return (
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
                        style={{
                          backgroundColor: getPortalColor(portal.slug),
                        }}
                      >
                        {portal.name[0]}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">
                          {portal.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          {portal.isActive && portal.hasApiKey ? (
                            <Wifi className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <WifiOff className="h-3 w-3 text-red-500" />
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {portal.isActive && portal.hasApiKey
                              ? "Bagli"
                              : !portal.hasApiKey
                                ? "API anahtari yok"
                                : "Pasif"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={portal.isActive ? "success" : "secondary"}
                    >
                      {portal.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Ilan</p>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-semibold">
                          {portalStat?.totalListings ?? portal.totalListings}
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
                          {(
                            portalStat?.totalViews ?? portal.totalViews
                          ).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Favori</p>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-semibold">
                          {(
                            portalStat?.totalFavorites ?? portal.totalFavorites
                          ).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Test connection button & result */}
                  <div className="border-t pt-3 space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      disabled={testState?.loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestConnection(portal.id);
                      }}
                    >
                      {testState?.loading ? (
                        <Spinner size="sm" className="mr-2" />
                      ) : (
                        <Activity className="mr-2 h-3 w-3" />
                      )}
                      {testState?.loading
                        ? "Test Ediliyor..."
                        : "Baglanti Testi"}
                    </Button>

                    {testState?.result && (
                      <div
                        className={cn(
                          "flex items-center gap-1.5 text-xs rounded-md px-2 py-1",
                          testState.result.success
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                        )}
                      >
                        {testState.result.success ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                        ) : (
                          <XCircle className="h-3 w-3 shrink-0" />
                        )}
                        <span className="truncate">
                          {testState.result.message}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Last Update */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Son guncelleme:{" "}
                      {new Date(portal.updatedAt).toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Portal Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Portal Performans Karsilastirmasi
            </CardTitle>
            <CardDescription>
              Portallara gore goruntulenme ve favori sayilari
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Spinner size="lg" showText text="Istatistikler yukleniyor..." />
              </div>
            ) : statsError ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p className="text-sm">Istatistikler yuklenemedi</p>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
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
                    <Bar
                      dataKey="favori"
                      name="Favori"
                      fill="hsl(var(--primary) / 0.5)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portal Details / Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Portal Durum Ozeti</CardTitle>
            <CardDescription>
              Her portalin yayinlama durumu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Spinner size="lg" showText text="Yukleniyor..." />
              </div>
            ) : (
              <div className="space-y-4">
                {stats?.portals.map((portalStat) => (
                  <div
                    key={portalStat.portalId}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                      style={{
                        backgroundColor: getPortalColor(portalStat.portalSlug),
                      }}
                    >
                      {portalStat.portalName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {portalStat.portalName}
                        </p>
                        <Badge
                          variant={portalStat.isActive ? "success" : "secondary"}
                          className="text-[10px]"
                        >
                          {portalStat.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span>
                            {portalStat.publishedListings} yayinda
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span>
                            {portalStat.pendingListings} beklemede
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-red-500" />
                          <span>
                            {portalStat.rejectedListings} reddedildi
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>
                          {portalStat.totalViews.toLocaleString("tr-TR")}{" "}
                          goruntulenme
                        </span>
                        <span>
                          {portalStat.totalFavorites.toLocaleString("tr-TR")}{" "}
                          favori
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Totals row */}
                {stats && (
                  <div className="rounded-lg bg-muted/50 p-3 mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Toplam</span>
                      <div className="flex gap-4 text-muted-foreground">
                        <span>
                          {stats.totals.publishedListings} yayinda
                        </span>
                        <span>
                          {stats.totals.totalViews.toLocaleString("tr-TR")}{" "}
                          goruntulenme
                        </span>
                        <span>
                          {stats.totals.totalFavorites.toLocaleString("tr-TR")}{" "}
                          favori
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
