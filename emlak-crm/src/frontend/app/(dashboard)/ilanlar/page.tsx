"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Plus,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  Heart,
  MoreHorizontal,
  ChevronDown,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatPrice, formatArea } from "@/lib/utils";
import api from "@/lib/api";

const propertyStatusMap: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  active: { label: "Aktif", variant: "success" },
  aktif: { label: "Aktif", variant: "success" },
  pending: { label: "Beklemede", variant: "warning" },
  beklemede: { label: "Beklemede", variant: "warning" },
  inactive: { label: "Pasif", variant: "secondary" },
  pasif: { label: "Pasif", variant: "secondary" },
};

export default function IlanlarPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [listingTypeFilter, setListingTypeFilter] = useState("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["properties", searchQuery, typeFilter, listingTypeFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (searchQuery) params.search = searchQuery;
      if (typeFilter !== "all") params.type = typeFilter;
      if (listingTypeFilter !== "all") params.listingType = listingTypeFilter;
      const res = await api.get("/api/v1/properties", { params });
      return res.data?.data || res.data;
    },
    retry: false,
  });

  const properties = data?.items || data?.properties || (Array.isArray(data) ? data : []);
  const totalCount = data?.total || data?.totalCount || properties.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ilanlar</h1>
          <p className="text-muted-foreground">
            {isLoading ? "Yukleniyor..." : `Toplam ${totalCount} ilan kaydi`}
          </p>
        </div>
        <Link href="/ilanlar/yeni">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Ilan
          </Button>
        </Link>
      </div>

      {/* Search, Filters and View Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ilan ara (baslik, konum)..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={listingTypeFilter}
                onChange={(e) => setListingTypeFilter(e.target.value)}
              >
                <option value="all">Satilik / Kiralik</option>
                <option value="Satilik">Satilik</option>
                <option value="Kiralik">Kiralik</option>
              </select>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">Tum Turler</option>
                <option value="Daire">Daire</option>
                <option value="Villa">Villa</option>
                <option value="Arsa">Arsa</option>
                <option value="Isyeri">Isyeri</option>
              </select>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtreler
              </Button>
              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Min Fiyat
                </label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Max Fiyat
                </label>
                <Input type="number" placeholder="50.000.000" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Oda Sayisi
                </label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option value="">Tumu</option>
                  <option value="1+0">1+0</option>
                  <option value="1+1">1+1</option>
                  <option value="2+1">2+1</option>
                  <option value="3+1">3+1</option>
                  <option value="4+1">4+1</option>
                  <option value="5+">5+</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Min m2
                </label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="mt-3 h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/2" />
                <Skeleton className="mt-2 h-6 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">Veriler yuklenemedi</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Backend baglantisi kontrol ediniz.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Properties Grid */}
      {!isLoading && !isError && viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property: Record<string, unknown>) => {
            const statusKey = String(property.status || "aktif");
            const status = propertyStatusMap[statusKey] || propertyStatusMap.aktif;
            const listingType = String(property.listing_type || property.listingType || "Satilik");
            const price = Number(property.price || 0);
            const area = Number(property.area || property.areaNet || 0);
            const rooms = String(property.rooms || "-");
            const bathrooms = Number(property.bathrooms || 0);
            return (
              <Link key={String(property.id)} href={`/ilanlar/${property.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  {/* Image Placeholder */}
                  <div className="relative h-48 bg-muted">
                    <div className="flex h-full items-center justify-center">
                      <Building2 className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                    <div className="absolute left-3 top-3 flex gap-2">
                      <Badge
                        variant={
                          listingType === "Satilik"
                            ? "default"
                            : "info"
                        }
                      >
                        {listingType}
                      </Badge>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-3 h-8 w-8 bg-white/80 hover:bg-white"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold line-clamp-1">
                          {String(property.title || "")}
                        </h3>
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {String(property.location || "")}
                        </div>
                      </div>

                      <p className="text-xl font-bold text-primary">
                        {formatPrice(price)}
                        {listingType === "Kiralik" && (
                          <span className="text-sm font-normal text-muted-foreground">
                            /ay
                          </span>
                        )}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {rooms !== "-" && (
                          <div className="flex items-center gap-1">
                            <BedDouble className="h-4 w-4" />
                            {rooms}
                          </div>
                        )}
                        {bathrooms > 0 && (
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            {bathrooms}
                          </div>
                        )}
                        {area > 0 && (
                          <div className="flex items-center gap-1">
                            <Maximize2 className="h-4 w-4" />
                            {formatArea(area)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                        <span>{String(property.portal_count || property.portalCount || 0)} portal</span>
                        <span>{String(property.view_count || property.viewCount || 0)} goruntulenme</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!isLoading && !isError && viewMode === "list" && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {properties.map((property: Record<string, unknown>) => {
                const statusKey = String(property.status || "aktif");
                const status = propertyStatusMap[statusKey] || propertyStatusMap.aktif;
                const listingType = String(property.listing_type || property.listingType || "Satilik");
                const price = Number(property.price || 0);
                const area = Number(property.area || property.areaNet || 0);
                const rooms = String(property.rooms || "-");
                const floor = String(property.floor || "-");
                return (
                  <Link key={String(property.id)} href={`/ilanlar/${property.id}`}>
                    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                      {/* Thumbnail */}
                      <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-8 w-8 text-muted-foreground/30" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">
                            {String(property.title || "")}
                          </h3>
                          <Badge variant={status.variant} className="shrink-0">
                            {status.label}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {String(property.location || "")}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                          {rooms !== "-" && (
                            <span>{rooms}</span>
                          )}
                          {area > 0 && <span>{formatArea(area)}</span>}
                          <span>Kat: {floor}</span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-primary">
                          {formatPrice(price)}
                        </p>
                        <Badge
                          variant={
                            listingType === "Satilik"
                              ? "default"
                              : "info"
                          }
                          className="mt-1"
                        >
                          {listingType}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && properties.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">Ilan Bulunamadi</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Arama kriterlerinize uygun ilan bulunamadi.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
