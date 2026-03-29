"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  Users,
  Building2,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Target,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
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

interface ScoreBreakdown {
  location: number;
  budget: number;
  type: number;
  size: number;
  features: number;
  total: number;
}

interface ContactInfo {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredLocations: string | null;
  preferredPropertyTypes: string | null;
  interestType: string | null;
  assignedUser: { id: string; firstName: string; lastName: string } | null;
}

interface PropertyInfo {
  id: string;
  title: string;
  price: number;
  propertyType: string;
  listingType: string;
  roomCount: string | null;
  grossSqm: number | null;
  ilId: string | null;
  ilceId: string | null;
  mahalleId: string | null;
  address: string | null;
  photos: Array<{ id: string; url: string; thumbnailUrl: string | null }>;
  assignedUser: { id: string; firstName: string; lastName: string } | null;
}

interface TopMatch {
  contact: ContactInfo;
  property: PropertyInfo;
  score: ScoreBreakdown;
}

interface MatchingStats {
  totalContacts: number;
  totalProperties: number;
  totalMatches: number;
  averageScore: number;
  topProperties: Array<{
    propertyId: string;
    title: string;
    matchCount: number;
    averageScore: number;
  }>;
  scoreDistribution: {
    excellent: number;
    good: number;
    fair: number;
  };
}

interface ContactMatchResult {
  contact: ContactInfo;
  score: ScoreBreakdown;
}

interface PropertyMatchResult {
  property: PropertyInfo;
  score: ScoreBreakdown;
}

// ---- API ----

async function fetchTopMatches(limit: number = 20): Promise<TopMatch[]> {
  const res = await api.get(`/api/v1/matching/top?limit=${limit}`);
  return res.data.data;
}

async function fetchStats(): Promise<MatchingStats> {
  const res = await api.get("/api/v1/matching/stats");
  return res.data.data;
}

async function fetchMatchesForContact(contactId: string): Promise<PropertyMatchResult[]> {
  const res = await api.get(`/api/v1/matching/contact/${contactId}`);
  return res.data.data;
}

async function fetchMatchesForProperty(propertyId: string): Promise<ContactMatchResult[]> {
  const res = await api.get(`/api/v1/matching/property/${propertyId}`);
  return res.data.data;
}

// ---- Helpers ----

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Mukemmel";
  if (score >= 60) return "Iyi";
  if (score >= 40) return "Orta";
  return "Dusuk";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Daire",
  VILLA: "Villa",
  DETACHED: "Mustakel",
  RESIDENCE: "Residence",
  OFFICE: "Ofis",
  SHOP: "Dukkan",
  STORE: "Magaza",
  WAREHOUSE: "Depo",
  FACTORY: "Fabrika",
  LAND: "Arsa",
  ZONED_LAND: "Imarlı Arsa",
  FIELD: "Tarla",
  GARDEN: "Bahce",
  HOTEL: "Otel",
  APART_HOTEL: "Apart Otel",
};

// ---- Score Bar Component ----

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium", getScoreColor(value))}>{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-1.5 rounded-full transition-all", getScoreBgColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ---- Match Card Component ----

function MatchCard({
  match,
  isExpanded,
  onToggle,
}: {
  match: TopMatch;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { contact, property, score } = match;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {/* Header with score */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={score.total >= 70 ? "success" : score.total >= 50 ? "info" : "warning"}>
                %{score.total} {getScoreLabel(score.total)}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              {/* Contact side */}
              <div className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Users className="h-3 w-3" />
                  <span>Musteri</span>
                </div>
                <p className="text-sm font-semibold">
                  {contact.firstName} {contact.lastName}
                </p>
                {contact.budgetMin !== null || contact.budgetMax !== null ? (
                  <p className="text-xs text-muted-foreground">
                    Butce: {contact.budgetMin ? formatCurrency(contact.budgetMin) : "?"} - {contact.budgetMax ? formatCurrency(contact.budgetMax) : "?"}
                  </p>
                ) : null}
                {contact.interestType && (
                  <Badge variant="outline" className="text-[10px]">
                    {contact.interestType === "BUYER"
                      ? "Alici"
                      : contact.interestType === "RENTER"
                        ? "Kiraci"
                        : contact.interestType === "INVESTOR"
                          ? "Yatirimci"
                          : contact.interestType}
                  </Badge>
                )}
              </div>

              {/* Property side */}
              <div className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Building2 className="h-3 w-3" />
                  <span>Ilan</span>
                </div>
                <p className="text-sm font-semibold truncate">{property.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(property.price)}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
                  </Badge>
                  {property.roomCount && (
                    <Badge variant="outline" className="text-[10px]">
                      {property.roomCount}
                    </Badge>
                  )}
                  {property.grossSqm && (
                    <Badge variant="outline" className="text-[10px]">
                      {property.grossSqm} m2
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={onToggle}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Expanded: Score breakdown + actions */}
        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Score breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Puan Detayi
                </h4>
                <ScoreBar label="Konum" value={score.location} />
                <ScoreBar label="Butce" value={score.budget} />
                <ScoreBar label="Emlak Tipi" value={score.type} />
                <ScoreBar label="Boyut" value={score.size} />
                <ScoreBar label="Ozellikler" value={score.features} />
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Iletisim
                </h4>
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent transition-colors"
                  >
                    <Phone className="h-4 w-4 text-emerald-600" />
                    <span>{contact.phone}</span>
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent transition-colors"
                  >
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>{contact.email}</span>
                  </a>
                )}
                {contact.assignedUser && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Sorumlu: {contact.assignedUser.firstName} {contact.assignedUser.lastName}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Main Page Component ----

export default function EslestirmePage() {
  const [activeTab, setActiveTab] = useState<"all" | "contact" | "property">("all");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // Fetch top matches
  const {
    data: topMatches,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: ["matching-top"],
    queryFn: () => fetchTopMatches(50),
  });

  // Fetch stats
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ["matching-stats"],
    queryFn: fetchStats,
  });

  const handleToggleExpand = (matchIdx: number) => {
    const key = String(matchIdx);
    setExpandedMatchId((prev) => (prev === key ? null : key));
  };

  // Loading state
  if (matchesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (matchesError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-lg font-semibold">Eslestirmeler yuklenirken hata olustu</h2>
        <p className="text-sm text-muted-foreground">
          Lutfen sayfayi yenileyip tekrar deneyiniz.
        </p>
        <Button variant="outline" onClick={() => refetchMatches()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const matches = topMatches || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Akilli Eslestirme
          </h1>
          <p className="text-muted-foreground">
            Musteri tercihleri ve ilan ozelliklerine gore otomatik eslestirme
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchMatches()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Yenile
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam Eslestirme</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-7 w-12" /> : stats?.totalMatches ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ortalama Puan</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-7 w-12" /> : `%${stats?.averageScore ?? 0}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktif Musteri</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-7 w-12" /> : stats?.totalContacts ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
                <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktif Ilan</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-7 w-12" /> : stats?.totalProperties ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution + Top Properties */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Puan Dagilimi
            </CardTitle>
            <CardDescription>Eslestirme puanlarina gore dagılım</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Spinner size="md" />
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-sm">Mukemmel (%80+)</span>
                  </div>
                  <span className="text-sm font-semibold">{stats.scoreDistribution.excellent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Iyi (%60-79)</span>
                  </div>
                  <span className="text-sm font-semibold">{stats.scoreDistribution.good}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="text-sm">Orta (%40-59)</span>
                  </div>
                  <span className="text-sm font-semibold">{stats.scoreDistribution.fair}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Istatistik verisi bulunamadi
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              En Cok Eslesen Ilanlar
            </CardTitle>
            <CardDescription>En fazla musteriyle eslesen ilanlar</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Spinner size="md" />
              </div>
            ) : stats && stats.topProperties.length > 0 ? (
              <div className="space-y-3">
                {stats.topProperties.map((prop, idx) => (
                  <div
                    key={prop.propertyId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{prop.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {prop.matchCount} eslestirme &middot; Ort. %{prop.averageScore}
                        </p>
                      </div>
                    </div>
                    <Badge variant={prop.averageScore >= 70 ? "success" : "info"}>
                      %{prop.averageScore}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Henuz eslestirme bulunamadi
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("all")}
        >
          <Zap className="mr-1 h-4 w-4" />
          Tum Eslestirmeler
        </Button>
        <Button
          variant={activeTab === "contact" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("contact")}
        >
          <Users className="mr-1 h-4 w-4" />
          Musteri Eslesmeleri
        </Button>
        <Button
          variant={activeTab === "property" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("property")}
        >
          <Building2 className="mr-1 h-4 w-4" />
          Ilan Eslesmeleri
        </Button>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {matches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-3">
              <Zap className="h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-lg font-medium">Henuz eslestirme bulunamadi</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Musteri tercihleri ve ilan bilgileri girildiginde otomatik eslestirmeler burada gorunecektir.
              </p>
            </CardContent>
          </Card>
        ) : (
          matches
            .filter((match) => {
              if (activeTab === "all") return true;
              // In the "contact" tab, group by unique contacts
              // In the "property" tab, group by unique properties
              // For simplicity, show all in all tabs (filtering can be refined)
              return true;
            })
            .map((match, idx) => (
              <MatchCard
                key={`${match.contact.id}-${match.property.id}`}
                match={match}
                isExpanded={expandedMatchId === String(idx)}
                onToggle={() => handleToggleExpand(idx)}
              />
            ))
        )}
      </div>
    </div>
  );
}
