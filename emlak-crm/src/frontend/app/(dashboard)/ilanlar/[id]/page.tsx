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
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [adPlatform, setAdPlatform] = useState<"facebook" | "instagram" | "google">("facebook");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { data: fbAdData, isLoading: fbLoading } = useQuery({
    queryKey: ["social-ad", id, "facebook"],
    queryFn: async () => { const r = await api.get(`/api/v1/social-ads/${id}/facebook`); return r.data?.data || r.data; },
    enabled: showAdDialog,
  });
  const { data: igAdData, isLoading: igLoading } = useQuery({
    queryKey: ["social-ad", id, "instagram"],
    queryFn: async () => { const r = await api.get(`/api/v1/social-ads/${id}/instagram`); return r.data?.data || r.data; },
    enabled: showAdDialog,
  });
  const { data: googleAdData, isLoading: googleLoading } = useQuery({
    queryKey: ["social-ad", id, "google"],
    queryFn: async () => { const r = await api.get(`/api/v1/social-ads/${id}/google`); return r.data?.data || r.data; },
    enabled: showAdDialog,
  });
  const [shareToast, setShareToast] = useState(false);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const res = await api.get(`/api/v1/brochure/${id}`, { responseType: 'text' });
                const html = typeof res.data === 'string' ? res.data : res.data?.data || '';
                const win = window.open('', '_blank');
                if (win) { win.document.write(html); win.document.close(); }
              } catch { alert('Brosur olusturulamadi'); }
            }}
          >
            <FileText className="mr-2 h-3.5 w-3.5" />
            Brosur Olustur
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdDialog(true)}
          >
            <Globe className="mr-2 h-3.5 w-3.5" />
            Reklam Olustur
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

      {/* Ad Creator Dialog */}
      <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reklam Olustur</DialogTitle>
            <DialogDescription>
              Sosyal medya reklam icerikleriniz otomatik olusturuldu. Platformu secin, varyantlari inceleyin ve kopyalayin.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={adPlatform} onValueChange={(v) => setAdPlatform(v as "facebook" | "instagram" | "google")}>
            <TabsList className="w-full">
              <TabsTrigger value="facebook" className="flex-1">Facebook</TabsTrigger>
              <TabsTrigger value="instagram" className="flex-1">Instagram</TabsTrigger>
              <TabsTrigger value="google" className="flex-1">Google Ads</TabsTrigger>
            </TabsList>

            {/* ===== FACEBOOK TAB ===== */}
            <TabsContent value="facebook">
              {fbLoading || !fbAdData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Facebook reklam icerigi olusturuluyor...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Baslik Varyantlari */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Baslik Varyantlari (A/B Test)</h4>
                    <div className="space-y-2">
                      {(fbAdData.headlines as string[] || []).map((h: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Badge variant="secondary" className="shrink-0">V{i + 1}</Badge>
                          <p className="flex-1 rounded border bg-muted px-3 py-2 text-sm">{h}</p>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(h, `fb-h-${i}`)}>
                            {copiedField === `fb-h-${i}` ? <CheckCircle2 className="h-3.5 w-3.5" /> : "Kopyala"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Birincil Metin Varyantlari */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Birincil Metin Varyantlari</h4>
                    <div className="space-y-2">
                      {(fbAdData.primaryTexts as string[] || []).map((t: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <Badge variant="secondary" className="shrink-0 mt-2">V{i + 1}</Badge>
                          <p className="flex-1 rounded border bg-muted px-3 py-2 text-sm whitespace-pre-wrap">{t}</p>
                          <Button size="sm" variant="outline" className="shrink-0" onClick={() => copyToClipboard(t, `fb-t-${i}`)}>
                            {copiedField === `fb-t-${i}` ? <CheckCircle2 className="h-3.5 w-3.5" /> : "Kopyala"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Aciklama Varyantlari */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Aciklama Varyantlari</h4>
                    <div className="space-y-2">
                      {(fbAdData.descriptions as string[] || []).map((d: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Badge variant="secondary" className="shrink-0">V{i + 1}</Badge>
                          <p className="flex-1 rounded border bg-muted px-3 py-2 text-sm">{d}</p>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(d, `fb-d-${i}`)}>
                            {copiedField === `fb-d-${i}` ? <CheckCircle2 className="h-3.5 w-3.5" /> : "Kopyala"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  {fbAdData.cta && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">CTA Butonu Onerisi</h4>
                      <Badge variant="info">{fbAdData.cta as string}</Badge>
                    </div>
                  )}

                  {/* Gorsel Boyutlari */}
                  {fbAdData.imageSpecs && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Gorsel Boyutlari</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {Object.entries(fbAdData.imageSpecs as Record<string, string>).map(([key, val]) => (
                          <div key={key} className="rounded border bg-muted/50 p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-1">{key === 'feed' ? 'Akis' : key === 'square' ? 'Kare' : 'Hikaye'}</p>
                            <p className="text-sm font-medium">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hedef Kitle */}
                  {fbAdData.targeting && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Hedef Kitle Onerisi</h4>
                      <div className="rounded border bg-muted/30 p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Konum:</span> <span className="font-medium">{(fbAdData.targeting as Record<string, unknown>).location as string} ({(fbAdData.targeting as Record<string, unknown>).radius as string})</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Yas Araligi:</span> <span className="font-medium">{(fbAdData.targeting as Record<string, unknown>).ageRange as string}</span></div>
                        <div><span className="text-muted-foreground">Ilgi Alanlari:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {((fbAdData.targeting as Record<string, unknown>).interests as string[] || []).map((interest: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{interest}</Badge>
                            ))}
                          </div>
                        </div>
                        <div><span className="text-muted-foreground">Davranislar:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {((fbAdData.targeting as Record<string, unknown>).behaviors as string[] || []).map((b: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">{b}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Butce Onerisi */}
                  {fbAdData.budget && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Butce Onerisi</h4>
                      <div className="rounded border bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center rounded bg-white dark:bg-background p-3 border">
                            <p className="text-xs text-muted-foreground">Gunluk Butce</p>
                            <p className="text-lg font-bold text-primary">{(fbAdData.budget as Record<string, unknown>).dailyBudget as number} TL</p>
                          </div>
                          <div className="text-center rounded bg-white dark:bg-background p-3 border">
                            <p className="text-xs text-muted-foreground">Haftalik Butce</p>
                            <p className="text-lg font-bold text-primary">{(fbAdData.budget as Record<string, unknown>).weeklyBudget as number} TL</p>
                          </div>
                        </div>
                        {Boolean((fbAdData.budget as Record<string, unknown>).estimatedImpressions) && (
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-muted-foreground">Tahmini Gunluk Gosterim: </span><span className="font-medium">{((fbAdData.budget as Record<string, Record<string, string>>).estimatedImpressions).daily}</span></div>
                            <div><span className="text-muted-foreground">Tahmini Gunluk Tiklama: </span><span className="font-medium">{((fbAdData.budget as Record<string, Record<string, string>>).estimatedClicks).daily}</span></div>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">{(fbAdData.budget as Record<string, unknown>).reasoning as string}</p>
                      </div>
                    </div>
                  )}

                  {/* Tumunu Kopyala */}
                  <Button className="w-full" onClick={() => {
                    const allHeadlines = (fbAdData.headlines as string[] || []).map((h: string, i: number) => `Baslik ${i + 1}: ${h}`).join('\n');
                    const allTexts = (fbAdData.primaryTexts as string[] || []).map((t: string, i: number) => `Metin ${i + 1}: ${t}`).join('\n');
                    const allDescs = (fbAdData.descriptions as string[] || []).map((d: string, i: number) => `Aciklama ${i + 1}: ${d}`).join('\n');
                    copyToClipboard(`${allHeadlines}\n\n${allTexts}\n\n${allDescs}`, 'fb-all');
                  }}>
                    {copiedField === 'fb-all' ? 'Kopyalandi!' : 'Tum Metinleri Kopyala'}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ===== INSTAGRAM TAB ===== */}
            <TabsContent value="instagram">
              {igLoading || !igAdData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Instagram reklam icerigi olusturuluyor...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Feed Caption */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Feed Post Metni</h4>
                    <div className="flex gap-2">
                      <p className="flex-1 rounded border bg-muted px-3 py-2 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">{igAdData.feedCaption as string}</p>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => copyToClipboard(igAdData.feedCaption as string, 'ig-caption')}>
                        {copiedField === 'ig-caption' ? <CheckCircle2 className="h-3.5 w-3.5" /> : "Kopyala"}
                      </Button>
                    </div>
                  </div>

                  {/* Story Overlays */}
                  {igAdData.storyTextOverlays && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Hikaye Metin Onerileri</h4>
                      <div className="space-y-2">
                        {(igAdData.storyTextOverlays as string[]).map((s: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <Badge variant="secondary" className="shrink-0">Slide {i + 1}</Badge>
                            <p className="flex-1 rounded border bg-muted px-3 py-2 text-sm">{s}</p>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(s, `ig-s-${i}`)}>
                              {copiedField === `ig-s-${i}` ? <CheckCircle2 className="h-3.5 w-3.5" /> : "Kopyala"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hashtags - Kategorilere ayrilmis */}
                  {igAdData.hashtags && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Hashtag&apos;ler (30 adet, kategorilere ayrilmis)</h4>
                      <div className="space-y-3">
                        {([
                          { key: 'high', label: 'Yuksek Hacim', color: 'text-emerald-600 dark:text-emerald-400' },
                          { key: 'medium', label: 'Orta Hacim', color: 'text-amber-600 dark:text-amber-400' },
                          { key: 'niche', label: 'Nis', color: 'text-blue-600 dark:text-blue-400' },
                        ] as const).map(({ key, label, color }) => {
                          const tags = (igAdData.hashtags as Record<string, string[]>)[key] || [];
                          return (
                            <div key={key}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">{label} ({tags.length})</span>
                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copyToClipboard(tags.join(' '), `ig-ht-${key}`)}>
                                  {copiedField === `ig-ht-${key}` ? 'Kopyalandi' : 'Kopyala'}
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {tags.map((tag: string, i: number) => (
                                  <span
                                    key={i}
                                    className={cn("text-sm cursor-pointer hover:underline", color)}
                                    onClick={() => copyToClipboard(tag, `ig-tag-${key}-${i}`)}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <Button size="sm" variant="outline" className="w-full" onClick={() => {
                          const all = [
                            ...((igAdData.hashtags as Record<string, string[]>).high || []),
                            ...((igAdData.hashtags as Record<string, string[]>).medium || []),
                            ...((igAdData.hashtags as Record<string, string[]>).niche || []),
                          ];
                          copyToClipboard(all.join(' '), 'ig-ht-all');
                        }}>
                          {copiedField === 'ig-ht-all' ? 'Kopyalandi!' : 'Tum Hashtag\'leri Kopyala'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Carousel Onerileri */}
                  {igAdData.carouselSuggestions && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Carousel Paylasim Sirasi</h4>
                      <div className="space-y-1">
                        {(igAdData.carouselSuggestions as string[]).map((s: string, i: number) => (
                          <p key={i} className="text-sm text-muted-foreground">{s}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Konum Etiketi ve Zaman */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {igAdData.locationTag && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Konum Etiketi</h4>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{igAdData.locationTag as string}</span>
                        </div>
                      </div>
                    )}
                    {igAdData.bestPostingTime && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">En Iyi Paylasim Zamani</h4>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{igAdData.bestPostingTime as string}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hedef Kitle */}
                  {igAdData.targeting && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Hedef Kitle Onerisi</h4>
                      <div className="rounded border bg-muted/30 p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Konum:</span> <span className="font-medium">{(igAdData.targeting as Record<string, unknown>).location as string}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Yas Araligi:</span> <span className="font-medium">{(igAdData.targeting as Record<string, unknown>).ageRange as string}</span></div>
                        <div><span className="text-muted-foreground">Ilgi Alanlari: </span>
                          <span className="font-medium">{((igAdData.targeting as Record<string, unknown>).interests as string[] || []).join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Butce */}
                  {igAdData.budget && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Butce Onerisi</h4>
                      <div className="rounded border bg-blue-50 dark:bg-blue-950/20 p-4 space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center rounded bg-white dark:bg-background p-3 border">
                            <p className="text-xs text-muted-foreground">Gunluk</p>
                            <p className="text-lg font-bold text-primary">{(igAdData.budget as Record<string, unknown>).dailyBudget as number} TL</p>
                          </div>
                          <div className="text-center rounded bg-white dark:bg-background p-3 border">
                            <p className="text-xs text-muted-foreground">Haftalik</p>
                            <p className="text-lg font-bold text-primary">{(igAdData.budget as Record<string, unknown>).weeklyBudget as number} TL</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{(igAdData.budget as Record<string, unknown>).reasoning as string}</p>
                      </div>
                    </div>
                  )}

                  {/* Tumunu Kopyala */}
                  <Button className="w-full" onClick={() => copyToClipboard(igAdData.feedCaption as string, 'ig-all')}>
                    {copiedField === 'ig-all' ? 'Kopyalandi!' : 'Tum Metinleri Kopyala'}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ===== GOOGLE ADS TAB ===== */}
            <TabsContent value="google">
              {googleLoading || !googleAdData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Google Ads icerigi olusturuluyor...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Basliklar */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Duyarli Arama Reklami Basliklari (max 30 karakter)</h4>
                    <div className="space-y-2">
                      {(googleAdData.headlines as string[] || []).map((h: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Badge variant="secondary" className="shrink-0">H{i + 1}</Badge>
                          <p className="flex-1 rounded border bg-muted px-3 py-2 text-sm">{h}</p>
                          <span className="text-xs text-muted-foreground shrink-0">{h.length}/30</span>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(h, `g-h-${i}`)}>
                            {copiedField === `g-h-${i}` ? <CheckCircle2 className="h-3.5 w-3.5" /> : "Kopyala"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Aciklamalar */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Aciklamalar (max 90 karakter)</h4>
                    <div className="space-y-2">
                      {(googleAdData.descriptions as string[] || []).map((d: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <Badge variant="secondary" className="shrink-0 mt-2">D{i + 1}</Badge>
                          <p className="flex-1 rounded border bg-muted px-3 py-2 text-sm">{d}</p>
                          <span className="text-xs text-muted-foreground shrink-0 mt-2">{d.length}/90</span>
                          <Button size="sm" variant="outline" className="shrink-0" onClick={() => copyToClipboard(d, `g-d-${i}`)}>
                            {copiedField === `g-d-${i}` ? <CheckCircle2 className="h-3.5 w-3.5" /> : "Kopyala"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* URL Yollari */}
                  {googleAdData.displayUrlPaths && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Gorunen URL Yolu</h4>
                      <div className="space-y-1">
                        {(googleAdData.displayUrlPaths as string[]).map((p: string, i: number) => (
                          <p key={i} className="text-sm text-muted-foreground">ornek.com/<span className="font-medium text-foreground">{p}</span></p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Onizleme */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Reklam Onizlemesi</h4>
                    <div className="rounded border bg-white dark:bg-muted/30 p-4 space-y-1">
                      <p className="text-sm text-muted-foreground">Reklam</p>
                      <p className="text-blue-600 dark:text-blue-400 text-base font-medium">
                        {(googleAdData.headlines as string[]).join(' | ')}
                      </p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        ornek.com/{(googleAdData.displayUrlPaths as string[])[0] || ''}
                      </p>
                      <p className="text-sm text-muted-foreground">{(googleAdData.descriptions as string[])[0] || ''}</p>
                    </div>
                  </div>

                  {/* Anahtar Kelimeler */}
                  {googleAdData.keywords && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Anahtar Kelimeler</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground font-medium">Birincil Anahtar Kelimeler</span>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copyToClipboard(((googleAdData.keywords as Record<string, string[]>).primary || []).join(', '), 'g-kw-p')}>
                              {copiedField === 'g-kw-p' ? 'Kopyalandi' : 'Kopyala'}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {((googleAdData.keywords as Record<string, string[]>).primary || []).map((kw: string, i: number) => (
                              <Badge key={i} variant="default" className="text-xs cursor-pointer" onClick={() => copyToClipboard(kw, `g-kw-p-${i}`)}>{kw}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground font-medium">Ikincil Anahtar Kelimeler</span>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copyToClipboard(((googleAdData.keywords as Record<string, string[]>).secondary || []).join(', '), 'g-kw-s')}>
                              {copiedField === 'g-kw-s' ? 'Kopyalandi' : 'Kopyala'}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {((googleAdData.keywords as Record<string, string[]>).secondary || []).map((kw: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs cursor-pointer" onClick={() => copyToClipboard(kw, `g-kw-s-${i}`)}>{kw}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground font-medium">Negatif Anahtar Kelimeler</span>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copyToClipboard(((googleAdData.keywords as Record<string, string[]>).negative || []).join(', '), 'g-kw-n')}>
                              {copiedField === 'g-kw-n' ? 'Kopyalandi' : 'Kopyala'}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {((googleAdData.keywords as Record<string, string[]>).negative || []).map((kw: string, i: number) => (
                              <Badge key={i} variant="destructive" className="text-xs cursor-pointer" onClick={() => copyToClipboard(kw, `g-kw-n-${i}`)}>{kw}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Teklif Stratejisi */}
                  {googleAdData.bidStrategy && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Teklif Stratejisi</h4>
                      <p className="text-sm text-muted-foreground rounded border bg-muted/30 p-3">{googleAdData.bidStrategy as string}</p>
                    </div>
                  )}

                  {/* Butce */}
                  {googleAdData.budget && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Butce Onerisi</h4>
                      <div className="rounded border bg-blue-50 dark:bg-blue-950/20 p-4 space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center rounded bg-white dark:bg-background p-3 border">
                            <p className="text-xs text-muted-foreground">Gunluk</p>
                            <p className="text-lg font-bold text-primary">{(googleAdData.budget as Record<string, unknown>).dailyBudget as number} TL</p>
                          </div>
                          <div className="text-center rounded bg-white dark:bg-background p-3 border">
                            <p className="text-xs text-muted-foreground">Haftalik</p>
                            <p className="text-lg font-bold text-primary">{(googleAdData.budget as Record<string, unknown>).weeklyBudget as number} TL</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{(googleAdData.budget as Record<string, unknown>).reasoning as string}</p>
                      </div>
                    </div>
                  )}

                  {/* Kopyala Butonlari */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => {
                      const allH = (googleAdData.headlines as string[]).join('\n');
                      const allD = (googleAdData.descriptions as string[]).join('\n');
                      copyToClipboard(`${allH}\n\n${allD}`, 'g-all-text');
                    }}>
                      {copiedField === 'g-all-text' ? 'Kopyalandi!' : 'Tum Metinleri Kopyala'}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      const kw = googleAdData.keywords as Record<string, string[]>;
                      const all = [...(kw.primary || []), ...(kw.secondary || [])].join(', ');
                      copyToClipboard(all, 'g-all-kw');
                    }}>
                      {copiedField === 'g-all-kw' ? 'Kopyalandi!' : 'Anahtar Kelimeleri Kopyala'}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
