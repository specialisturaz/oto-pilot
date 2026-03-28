"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  Eye,
  Heart,
  Clock,
  Share2,
  Edit2,
  Globe,
  RefreshCw,
  CheckCircle2,
  User,
  Phone,
  FileText,
  Upload,
  Download,
  Loader2,
  Trash2,
  ExternalLink,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn, formatPrice, formatArea, formatDate, formatRelativeDate, formatPhone } from "@/lib/utils";
import api from "@/lib/api";

// ---- Types ----
interface Property {
  id: string;
  title?: string;
  description?: string;
  property_type?: string;
  listing_type?: string;
  listing_price?: number;
  price?: number;
  currency?: string;
  aidat?: number;
  city?: string;
  district?: string;
  neighborhood?: string;
  street?: string;
  address_detail?: string;
  latitude?: number;
  longitude?: number;
  gross_sqm?: number;
  net_sqm?: number;
  room_count?: string;
  bathroom_count?: number;
  floor_number?: number;
  total_floors?: number;
  building_age?: number;
  heating_type?: string;
  is_furnished?: boolean;
  has_elevator?: boolean;
  has_parking?: boolean;
  has_balcony?: boolean;
  has_garden?: boolean;
  has_pool?: boolean;
  has_security?: boolean;
  has_cellar?: boolean;
  tapu_durumu?: string;
  ada_no?: string;
  parsel_no?: string;
  status?: string;
  features?: string[];
  photos?: Photo[];
  documents?: DocItem[];
  portal_listings?: PortalListing[];
  portalListings?: PortalListing[];
  view_count?: number;
  viewCount?: number;
  favorite_count?: number;
  favoriteCount?: number;
  created_at?: string;
  updated_at?: string;
  assigned_to?: { id: string; firstName: string; lastName: string } | null;
  seller_contact?: { id: string; first_name: string; last_name: string; phone: string } | null;
}

interface Photo {
  id: string;
  url?: string;
  file_url?: string;
  is_cover?: boolean;
  order?: number;
}

interface DocItem {
  id: string;
  name?: string;
  file_name?: string;
  type?: string;
  file_url?: string;
  fileUrl?: string;
  size?: number;
  created_at?: string;
}

interface PortalListing {
  id?: string;
  portal_name?: string;
  portalName?: string;
  portal?: string;
  status?: string;
  views?: number;
  portal_url?: string;
  portalUrl?: string;
  last_sync?: string;
  lastSync?: string;
}

interface MatchedCustomer {
  id: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  full_name?: string;
  phone?: string;
  budget_min?: number;
  budget_max?: number;
  match_score?: number;
  preferred_locations?: string[];
}

// ---- Helpers ----
const propertyStatusMap: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  active: { label: "Aktif", variant: "success" },
  aktif: { label: "Aktif", variant: "success" },
  pending: { label: "Beklemede", variant: "warning" },
  draft: { label: "Taslak", variant: "secondary" },
  sold: { label: "Satildi", variant: "secondary" },
  rented: { label: "Kiralandi", variant: "secondary" },
  withdrawn: { label: "Geri Cekildi", variant: "secondary" },
};

const heatingLabels: Record<string, string> = {
  dogalgaz_kombi: "Dogalgaz Kombi",
  merkezi: "Merkezi Sistem",
  soba: "Soba",
  yerden_isitma: "Yerden Isitma",
  klima: "Klima",
  diger: "Diger",
  yok: "Yok",
};

const tapuLabels: Record<string, string> = {
  kat_mulkiyeti: "Kat Mulkiyeti",
  kat_irtifaki: "Kat Irtifaki",
  arsa_tapusu: "Arsa Tapusu",
  hisseli: "Hisseli Tapu",
  diger: "Diger",
};

function getCustomerName(c: MatchedCustomer): string {
  if (c.first_name && c.last_name) return `${c.first_name} ${c.last_name}`;
  if (c.firstName && c.lastName) return `${c.firstName} ${c.lastName}`;
  if (c.full_name) return c.full_name;
  return "Isimsiz";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0/, "").replace(/^90/, "");
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "-";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ---- Component ----
export default function IlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  // ---- Queries ----
  const { data: property, isLoading, isError } = useQuery<Property>({
    queryKey: ["property", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/properties/${id}`);
      return res.data?.data || res.data;
    },
  });

  const { data: matchingData } = useQuery({
    queryKey: ["property-matching", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/properties/${id}/matching`);
      return res.data?.data || res.data;
    },
    enabled: !!property,
  });

  const matchedCustomers: MatchedCustomer[] = matchingData?.items || matchingData?.contacts || (Array.isArray(matchingData) ? matchingData : []);
  const photos: Photo[] = property?.photos || [];
  const documents: DocItem[] = property?.documents || [];
  const portalListings: PortalListing[] = property?.portal_listings || property?.portalListings || [];

  // ---- Mutations ----
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/v1/properties/${id}`);
    },
    onSuccess: () => {
      router.push("/ilanlar");
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (portalId: string) => {
      const res = await api.post(`/api/v1/properties/${id}/publish`, {
        portals: [portalId],
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
      const res = await api.post(`/api/v1/properties/${id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("photos", file));
      const res = await api.post(`/api/v1/properties/${id}/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    },
  });

  // ---- Handlers ----
  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocMutation.mutate(file);
    }
    e.target.value = "";
  }

  // ---- Loading State ----
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full rounded-lg" />
          </CardContent>
        </Card>
        <div className="space-y-3">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ---- Error State ----
  if (isError || !property) {
    return (
      <div className="space-y-6">
        <Link
          href="/ilanlar"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Ilanlar
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">Ilan bulunamadi</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Bu ID ile kayitli ilan bulunamadi veya baglanti hatasi olustu.
            </p>
            <Link href="/ilanlar">
              <Button className="mt-4">Ilanlara Don</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const price = property.listing_price || property.price || 0;
  const statusKey = property.status || "active";
  const status = propertyStatusMap[statusKey] || propertyStatusMap.active;
  const listingTypeLabel = property.listing_type === "kiralik" ? "Kiralik"
    : property.listing_type === "satilik" ? "Satilik"
    : property.listing_type || "Satilik";
  const views = property.view_count || property.viewCount || 0;
  const favorites = property.favorite_count || property.favoriteCount || 0;
  const daysOnMarket = property.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Split features into two groups (ic/dis approximation)
  const allFeatures = property.features || [];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/ilanlar"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Ilanlar
      </Link>

      {/* Photo Gallery */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-2">
            {/* Main Image */}
            <div className="col-span-4 sm:col-span-2 row-span-2">
              {photos.length > 0 && (photos[0].url || photos[0].file_url) ? (
                <img
                  src={photos[0].url || photos[0].file_url}
                  alt={property.title || "Fotograf"}
                  className="h-64 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
            </div>
            {/* Thumbnail Grid */}
            {[0, 1, 2, 3].map((i) => {
              const photo = photos[i + 1];
              return (
                <div key={i} className="hidden sm:block">
                  {photo && (photo.url || photo.file_url) ? (
                    <img
                      src={photo.url || photo.file_url}
                      alt={`Fotograf ${i + 2}`}
                      className="h-[122px] w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-[122px] items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Property Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{property.title || "Ilan"}</h1>
            <Badge variant={listingTypeLabel === "Satilik" ? "default" : "info"}>
              {listingTypeLabel}
            </Badge>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {[property.neighborhood, property.district, property.city].filter(Boolean).join(", ") || "-"}
          </div>
          <p className="mt-3 text-3xl font-bold text-primary">
            {formatPrice(price)}
            {property.currency && property.currency !== "TRY" && ` (${property.currency})`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-3.5 w-3.5" />
            {shareToast ? "Kopyalandi!" : "Paylas"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/ilanlar/${id}/duzenle`)}
          >
            <Edit2 className="mr-2 h-3.5 w-3.5" />
            Duzenle
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Sil
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <BedDouble className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">{property.room_count || "-"}</span>
            <span className="text-[10px] text-muted-foreground">Oda</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <Bath className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">{property.bathroom_count ?? "-"}</span>
            <span className="text-[10px] text-muted-foreground">Banyo</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <Maximize2 className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">
              {property.net_sqm ? `${property.net_sqm} m2` : "-"}
            </span>
            <span className="text-[10px] text-muted-foreground">Net Alan</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">{views}</span>
            <span className="text-[10px] text-muted-foreground">Goruntulenme</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <Heart className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">{favorites}</span>
            <span className="text-[10px] text-muted-foreground">Favori</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">{daysOnMarket}</span>
            <span className="text-[10px] text-muted-foreground">Gun</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="detaylar">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="detaylar">Detaylar</TabsTrigger>
          <TabsTrigger value="portal">Portal Durumu</TabsTrigger>
          <TabsTrigger value="eslesen">Eslesen Musteriler</TabsTrigger>
          <TabsTrigger value="belgeler">Belgeler</TabsTrigger>
        </TabsList>

        {/* Detaylar Tab */}
        <TabsContent value="detaylar">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Temel Bilgiler */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Temel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Ilan Tipi", value: listingTypeLabel },
                    { label: "Gayrimenkul Tipi", value: property.property_type || "-" },
                    { label: "Fiyat", value: formatPrice(price) },
                    { label: "Aidat", value: property.aidat ? formatPrice(property.aidat) + "/ay" : "-" },
                    { label: "Ilan Tarihi", value: property.created_at ? formatDate(property.created_at) : "-" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fiziksel Ozellikler */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fiziksel Ozellikler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Oda Sayisi", value: property.room_count || "-" },
                    { label: "Banyo Sayisi", value: property.bathroom_count != null ? String(property.bathroom_count) : "-" },
                    { label: "Brut m2", value: property.gross_sqm ? formatArea(property.gross_sqm) : "-" },
                    { label: "Net m2", value: property.net_sqm ? formatArea(property.net_sqm) : "-" },
                    { label: "Bulundugu Kat", value: property.floor_number != null ? `${property.floor_number}/${property.total_floors || "?"}` : "-" },
                    { label: "Bina Yasi", value: property.building_age != null ? `${property.building_age} yil` : "-" },
                    { label: "Isitma", value: property.heating_type ? (heatingLabels[property.heating_type] || property.heating_type) : "-" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Konum */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Konum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">Il</span>
                    <span className="text-sm font-medium">{property.city || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">Ilce</span>
                    <span className="text-sm font-medium">{property.district || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">Mahalle</span>
                    <span className="text-sm font-medium">{property.neighborhood || "-"}</span>
                  </div>
                  {property.address_detail && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Adres</span>
                      <span className="text-sm font-medium text-right max-w-[200px]">
                        {property.address_detail}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex h-48 items-center justify-center rounded-lg bg-muted">
                  <div className="text-center">
                    <MapPin className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Harita gorunumu yakinda eklenecek
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tapu Bilgileri */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tapu Bilgileri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Tapu Durumu", value: property.tapu_durumu ? (tapuLabels[property.tapu_durumu] || property.tapu_durumu) : "-" },
                    { label: "Ada", value: property.ada_no || "-" },
                    { label: "Parsel", value: property.parsel_no || "-" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Boolean Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ozellikler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {property.is_furnished && <Badge variant="secondary">Mobilyali</Badge>}
                  {property.has_elevator && <Badge variant="secondary">Asansor</Badge>}
                  {property.has_parking && <Badge variant="secondary">Otopark</Badge>}
                  {property.has_balcony && <Badge variant="secondary">Balkon</Badge>}
                  {property.has_garden && <Badge variant="secondary">Bahce</Badge>}
                  {property.has_pool && <Badge variant="secondary">Havuz</Badge>}
                  {property.has_security && <Badge variant="secondary">Guvenlik</Badge>}
                  {property.has_cellar && <Badge variant="secondary">Kiler</Badge>}
                  {allFeatures.map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                  {!property.is_furnished &&
                    !property.has_elevator &&
                    !property.has_parking &&
                    !property.has_balcony &&
                    !property.has_garden &&
                    !property.has_pool &&
                    !property.has_security &&
                    !property.has_cellar &&
                    allFeatures.length === 0 && (
                      <p className="text-sm text-muted-foreground">Ozellik belirtilmemis</p>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Aciklama */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Ilan Aciklamasi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {property.description || "Aciklama bulunmuyor."}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Portal Durumu Tab */}
        <TabsContent value="portal">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portal Durumu</CardTitle>
              <CardDescription>Ilanin portallardaki yayin durumu</CardDescription>
            </CardHeader>
            <CardContent>
              {portalListings.length > 0 ? (
                <div className="space-y-3">
                  {portalListings.map((portal, idx) => {
                    const portalName = portal.portal_name || portal.portalName || portal.portal || "Portal";
                    const portalUrl = portal.portal_url || portal.portalUrl;
                    const lastSync = portal.last_sync || portal.lastSync;
                    const portalStatus = portal.status || "pasif";
                    return (
                      <div
                        key={portal.id || idx}
                        className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium">{portalName}</h4>
                              {portalStatus === "active" || portalStatus === "aktif" ? (
                                <Badge variant="success">Aktif</Badge>
                              ) : (
                                <Badge variant="secondary">Pasif</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              {portal.views != null && <span>{portal.views} goruntulenme</span>}
                              {lastSync && <span>Son: {lastSync}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {portalUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(portalUrl, "_blank")}
                            >
                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                              Portalde Gor
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncMutation.mutate(portalName.toLocaleLowerCase("tr-TR").split(".")[0])}
                            disabled={syncMutation.isPending}
                          >
                            {syncMutation.isPending ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            )}
                            Senkronize Et
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Globe className="h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Henuz portala yayinlanmamis
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Eslesen Musteriler Tab */}
        <TabsContent value="eslesen">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Eslesen Musteriler</CardTitle>
              <CardDescription>Bu ilana kriterleri uyan musteriler</CardDescription>
            </CardHeader>
            <CardContent>
              {matchedCustomers.length > 0 ? (
                <div className="space-y-3">
                  {matchedCustomers.map((customer) => {
                    const name = getCustomerName(customer);
                    const budget = customer.budget_min || customer.budget_max
                      ? `${customer.budget_min ? formatPrice(customer.budget_min) : "?"} - ${customer.budget_max ? formatPrice(customer.budget_max) : "?"}`
                      : "-";
                    return (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                      >
                        <Link href={`/musteriler/${customer.id}`} className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-xs">
                              {getInitials(name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="text-sm font-medium">{name}</h4>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              {customer.phone && <span>{formatPhone(customer.phone)}</span>}
                              <span>Butce: {budget}</span>
                            </div>
                          </div>
                        </Link>
                        <div className="flex items-center gap-3 shrink-0">
                          {customer.match_score != null && (
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <div
                                  className={cn(
                                    "h-2 w-8 rounded-full",
                                    customer.match_score >= 90
                                      ? "bg-emerald-500"
                                      : customer.match_score >= 70
                                        ? "bg-amber-500"
                                        : "bg-gray-400"
                                  )}
                                />
                                <span className="text-sm font-semibold">
                                  %{customer.match_score}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">Eslesme</span>
                            </div>
                          )}
                          {customer.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(`tel:${customer.phone}`);
                              }}
                            >
                              <Phone className="mr-2 h-3.5 w-3.5" />
                              Ara
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <User className="h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Eslesen musteri bulunamadi
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Belgeler Tab */}
        <TabsContent value="belgeler">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Belgeler</CardTitle>
                  <CardDescription>Bu ilanla iliskili belgeler</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadDocMutation.isPending}
                >
                  {uploadDocMutation.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-3.5 w-3.5" />
                  )}
                  Belge Yukle
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-muted">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{doc.name || doc.file_name || "Belge"}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {doc.type && (
                              <Badge variant="secondary" className="text-[10px]">
                                {doc.type}
                              </Badge>
                            )}
                            {doc.created_at && <span>{formatDate(doc.created_at)}</span>}
                            <span>{formatFileSize(doc.size)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = doc.file_url || doc.fileUrl;
                          if (url) window.open(url, "_blank");
                        }}
                      >
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Indir
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Henuz belge yuklenmemis
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ilani Sil</DialogTitle>
            <DialogDescription>
              &quot;{property.title}&quot; ilanini silmek istediginizden emin misiniz?
              Bu islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">Silme islemi sirasinda hata olustu.</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Iptal</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
