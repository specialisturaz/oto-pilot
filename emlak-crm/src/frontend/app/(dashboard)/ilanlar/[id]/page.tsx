"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  Layers,
  Eye,
  Heart,
  Clock,
  Calendar,
  Share2,
  Edit2,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  User,
  Phone,
  Mail,
  FileText,
  Thermometer,
  Car,
  Wifi,
  Home,
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
import { cn, formatPrice, formatArea } from "@/lib/utils";

// Mock property data
const property = {
  id: "1",
  title: "Kadikoy Merkez 3+1 Daire",
  type: "Daire",
  listing_type: "Satilik",
  price: 4500000,
  location: "Kadikoy, Istanbul",
  neighborhood: "Caferaga Mahallesi",
  address: "Moda Caddesi No: 42, Kat: 5, Daire: 10",
  rooms: "3+1",
  bathrooms: 2,
  area_gross: 160,
  area_net: 145,
  floor: "5",
  total_floors: "8",
  building_age: 5,
  heating: "Dogalgaz Kombi",
  status: "aktif",
  description:
    "Kadikoy Moda'da deniz manzarali, yakin cevre ve ulasim olanaklari ile ideal konumda 3+1 satilik daire. Site icinde, 7/24 guvenlik, kapali otopark, yuzme havuzu ve fitness center bulunmaktadir.",
  views: 245,
  favorites: 32,
  days_on_market: 13,
  created_at: "15 Mart 2026",
  images: [null, null, null, null, null, null],
  tapu_type: "Kat Mulkiyeti",
  ada: "1234",
  parsel: "56",
  iskan: true,
  dask: true,
  dask_no: "DASK-2026-001234",
  aidat: 2500,
  features_ic: [
    "ADSL",
    "Alarm",
    "Ankastre Mutfak",
    "Barbekü",
    "Dusakabin",
    "Ebeveyn Banyosu",
    "Giyinme Odasi",
    "Hilton Banyo",
    "Jakuzi",
    "Klima",
  ],
  features_dis: [
    "Otopark (Kapali)",
    "Yuzme Havuzu",
    "Cocuk Oyun Parki",
    "Fitness",
    "Guvenlik",
    "Jenerator",
    "Kapici",
    "Suana",
  ],
};

const portalStatuses = [
  {
    portal: "Sahibinden.com",
    status: "aktif",
    views: 145,
    last_sync: "28 Mart 2026, 09:15",
    url: "https://sahibinden.com/ilan/12345",
  },
  {
    portal: "Hepsiemlak.com",
    status: "aktif",
    views: 68,
    last_sync: "28 Mart 2026, 09:10",
    url: "https://hepsiemlak.com/ilan/67890",
  },
  {
    portal: "Emlakjet.com",
    status: "aktif",
    views: 32,
    last_sync: "28 Mart 2026, 08:45",
    url: "https://emlakjet.com/ilan/11223",
  },
  {
    portal: "Zingat.com",
    status: "pasif",
    views: 0,
    last_sync: "-",
    url: null,
  },
];

const matchedCustomers = [
  {
    id: "1",
    name: "Ahmet Yilmaz",
    phone: "5321234567",
    budget: "3M - 6M",
    match_score: 95,
    interest: "Kadikoy 3+1",
  },
  {
    id: "2",
    name: "Zeynep Arslan",
    phone: "5054443322",
    budget: "4M - 7M",
    match_score: 82,
    interest: "Kadikoy bolge",
  },
  {
    id: "3",
    name: "Can Demir",
    phone: "5421234567",
    budget: "3.5M - 5.5M",
    match_score: 78,
    interest: "Anadolu Yakasi 3+1",
  },
  {
    id: "4",
    name: "Selin Kaya",
    phone: "5331234567",
    budget: "4M - 8M",
    match_score: 65,
    interest: "Deniz manzarali",
  },
];

const propertyActivities = [
  {
    id: "1",
    description: "Ahmet Yilmaz'a gosterim yapildi",
    date: "27 Mart 2026",
    type: "Gosterim",
  },
  {
    id: "2",
    description: "Sahibinden.com'da fiyat guncellendi",
    date: "25 Mart 2026",
    type: "Portal",
  },
  {
    id: "3",
    description: "Fotograflar guncellendi (6 fotograf)",
    date: "22 Mart 2026",
    type: "Guncelleme",
  },
  {
    id: "4",
    description: "Ilan yayin tarihi: 3 portala yayinlandi",
    date: "15 Mart 2026",
    type: "Yayin",
  },
];

const propertyDocuments = [
  { id: "1", name: "Tapu_Kadikoy_3+1.pdf", type: "Tapu", size: "2.4 MB" },
  { id: "2", name: "DASK_Police.pdf", type: "DASK", size: "0.9 MB" },
  { id: "3", name: "Iskan_Belgesi.pdf", type: "Iskan", size: "1.8 MB" },
];

export default function IlanDetailPage() {
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
              <div className="flex h-64 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-16 w-16 text-muted-foreground/30" />
              </div>
            </div>
            {/* Thumbnail Grid */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="hidden sm:block">
                <div className="flex h-[122px] items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-8 w-8 text-muted-foreground/20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Property Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{property.title}</h1>
            <Badge
              variant={
                property.listing_type === "Satilik" ? "default" : "info"
              }
            >
              {property.listing_type}
            </Badge>
            <Badge variant="success">Aktif</Badge>
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {property.location} - {property.neighborhood}
          </div>
          <p className="mt-3 text-3xl font-bold text-primary">
            {formatPrice(property.price)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-3.5 w-3.5" />
            Paylas
          </Button>
          <Button variant="outline" size="sm">
            <Edit2 className="mr-2 h-3.5 w-3.5" />
            Duzenle
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <BedDouble className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">{property.rooms}</span>
            <span className="text-[10px] text-muted-foreground">Oda</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <Bath className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">{property.bathrooms}</span>
            <span className="text-[10px] text-muted-foreground">Banyo</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <Maximize2 className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">{property.area_net} m2</span>
            <span className="text-[10px] text-muted-foreground">Net Alan</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">{property.views}</span>
            <span className="text-[10px] text-muted-foreground">Goruntulenme</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <Heart className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">{property.favorites}</span>
            <span className="text-[10px] text-muted-foreground">Favori</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-sm font-semibold">{property.days_on_market}</span>
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
          <TabsTrigger value="aktiviteler">Aktiviteler</TabsTrigger>
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
                    { label: "Ilan Tipi", value: property.listing_type },
                    { label: "Gayrimenkul Tipi", value: property.type },
                    { label: "Fiyat", value: formatPrice(property.price) },
                    { label: "Aidat", value: formatPrice(property.aidat) + "/ay" },
                    { label: "Ilan Tarihi", value: property.created_at },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <span className="text-sm text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fiziksel Ozellikler */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Fiziksel Ozellikler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Oda Sayisi", value: property.rooms },
                    { label: "Banyo Sayisi", value: String(property.bathrooms) },
                    { label: "Brut m2", value: formatArea(property.area_gross) },
                    { label: "Net m2", value: formatArea(property.area_net) },
                    { label: "Bulundugu Kat", value: `${property.floor}/${property.total_floors}` },
                    { label: "Bina Yasi", value: `${property.building_age} yil` },
                    { label: "Isitma", value: property.heating },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <span className="text-sm text-muted-foreground">
                        {item.label}
                      </span>
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
                    <span className="text-sm font-medium">Istanbul</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">Ilce</span>
                    <span className="text-sm font-medium">Kadikoy</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">Mahalle</span>
                    <span className="text-sm font-medium">{property.neighborhood}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Adres</span>
                    <span className="text-sm font-medium text-right max-w-[200px]">
                      {property.address}
                    </span>
                  </div>
                </div>

                {/* Map Placeholder */}
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
                    { label: "Tapu Durumu", value: property.tapu_type },
                    { label: "Ada", value: property.ada },
                    { label: "Parsel", value: property.parsel },
                    {
                      label: "Iskan",
                      value: property.iskan ? "Var" : "Yok",
                      badge: property.iskan,
                    },
                    {
                      label: "DASK",
                      value: property.dask ? "Var" : "Yok",
                      badge: property.dask,
                    },
                    {
                      label: "DASK No",
                      value: property.dask_no,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <span className="text-sm text-muted-foreground">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {"badge" in item && (
                          <CheckCircle2
                            className={cn(
                              "h-4 w-4",
                              item.badge
                                ? "text-emerald-500"
                                : "text-red-500"
                            )}
                          />
                        )}
                        <span className="text-sm font-medium">
                          {item.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ic Ozellikler */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ic Ozellikler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {property.features_ic.map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dis Ozellikler */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dis Ozellikler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {property.features_dis.map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Aciklama */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Ilan Aciklamasi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {property.description}
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
              <CardDescription>
                Ilanin portallardaki yayin durumu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {portalStatuses.map((portal) => (
                  <div
                    key={portal.portal}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">
                            {portal.portal}
                          </h4>
                          {portal.status === "aktif" ? (
                            <Badge variant="success">Aktif</Badge>
                          ) : (
                            <Badge variant="secondary">Pasif</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span>
                            {portal.views} goruntulenme
                          </span>
                          <span>
                            Son senkronizasyon: {portal.last_sync}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {portal.url && (
                        <Button variant="outline" size="sm">
                          Portalde Gor
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-3.5 w-3.5" />
                        Senkronize Et
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Eslesen Musteriler Tab */}
        <TabsContent value="eslesen">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Eslesen Musteriler</CardTitle>
              <CardDescription>
                Bu ilana kriterleri uyan musteriler (otomatik eslesme)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {matchedCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs">
                          {customer.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-sm font-medium">
                          {customer.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span>{customer.phone}</span>
                          <span>Butce: {customer.budget}</span>
                          <span>{customer.interest}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
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
                        <span className="text-[10px] text-muted-foreground">
                          Eslesme
                        </span>
                      </div>
                      <Button variant="outline" size="sm">
                        <Phone className="mr-2 h-3.5 w-3.5" />
                        Ara
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
                  <CardDescription>
                    Bu ilanla iliskili belgeler
                  </CardDescription>
                </div>
                <Button size="sm">
                  Belge Yukle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {propertyDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px]">
                            {doc.type}
                          </Badge>
                          <span>{doc.size}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Indir
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aktiviteler Tab */}
        <TabsContent value="aktiviteler">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aktivite Gecmisi</CardTitle>
              <CardDescription>
                Bu ilanla ilgili tum islemler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {propertyActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm">{activity.description}</p>
                        <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                          {activity.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activity.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
