"use client";

import { useState } from "react";
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
import { cn, formatPrice, formatArea } from "@/lib/utils";

// Mock data
const properties = [
  {
    id: "1",
    title: "Kadikoy Merkez 3+1 Daire",
    type: "Daire",
    listing_type: "Satilik",
    price: 4500000,
    location: "Kadikoy, Istanbul",
    rooms: "3+1",
    bathrooms: 2,
    area: 145,
    floor: "5/8",
    image: null,
    status: "aktif",
    portal_count: 3,
    view_count: 245,
    created_at: "2026-03-15",
  },
  {
    id: "2",
    title: "Besiktas Deniz Manzarali Villa",
    type: "Villa",
    listing_type: "Satilik",
    price: 18500000,
    location: "Besiktas, Istanbul",
    rooms: "5+2",
    bathrooms: 4,
    area: 320,
    floor: "Mustakil",
    image: null,
    status: "aktif",
    portal_count: 4,
    view_count: 512,
    created_at: "2026-03-10",
  },
  {
    id: "3",
    title: "Atasehir Residence 2+1",
    type: "Daire",
    listing_type: "Kiralik",
    price: 25000,
    location: "Atasehir, Istanbul",
    rooms: "2+1",
    bathrooms: 1,
    area: 95,
    floor: "12/20",
    image: null,
    status: "aktif",
    portal_count: 2,
    view_count: 189,
    created_at: "2026-03-20",
  },
  {
    id: "4",
    title: "Bakirkoy 4+1 Dublex",
    type: "Daire",
    listing_type: "Satilik",
    price: 7800000,
    location: "Bakirkoy, Istanbul",
    rooms: "4+1",
    bathrooms: 2,
    area: 210,
    floor: "7-8/8",
    image: null,
    status: "aktif",
    portal_count: 3,
    view_count: 167,
    created_at: "2026-03-18",
  },
  {
    id: "5",
    title: "Pendik Satilik Arsa",
    type: "Arsa",
    listing_type: "Satilik",
    price: 3200000,
    location: "Pendik, Istanbul",
    rooms: "-",
    bathrooms: 0,
    area: 500,
    floor: "-",
    image: null,
    status: "beklemede",
    portal_count: 1,
    view_count: 78,
    created_at: "2026-03-22",
  },
  {
    id: "6",
    title: "Sisli Merkez Ofis",
    type: "Isyeri",
    listing_type: "Kiralik",
    price: 45000,
    location: "Sisli, Istanbul",
    rooms: "Acik Plan",
    bathrooms: 2,
    area: 180,
    floor: "3/10",
    image: null,
    status: "aktif",
    portal_count: 2,
    view_count: 134,
    created_at: "2026-03-25",
  },
];

const propertyStatusMap: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  aktif: { label: "Aktif", variant: "success" },
  beklemede: { label: "Beklemede", variant: "warning" },
  pasif: { label: "Pasif", variant: "secondary" },
};

export default function IlanlarPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [listingTypeFilter, setListingTypeFilter] = useState("all");

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.title.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      p.location.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));
    const matchesType = typeFilter === "all" || p.type === typeFilter;
    const matchesListingType =
      listingTypeFilter === "all" || p.listing_type === listingTypeFilter;
    return matchesSearch && matchesType && matchesListingType;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ilanlar</h1>
          <p className="text-muted-foreground">
            Toplam {properties.length} ilan kaydi
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Ilan
        </Button>
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

      {/* Properties Grid */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => {
            const status = propertyStatusMap[property.status];
            return (
              <Card
                key={property.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                {/* Image Placeholder */}
                <div className="relative h-48 bg-muted">
                  <div className="flex h-full items-center justify-center">
                    <Building2 className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <div className="absolute left-3 top-3 flex gap-2">
                    <Badge
                      variant={
                        property.listing_type === "Satilik"
                          ? "default"
                          : "info"
                      }
                    >
                      {property.listing_type}
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
                        {property.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {property.location}
                      </div>
                    </div>

                    <p className="text-xl font-bold text-primary">
                      {formatPrice(property.price)}
                      {property.listing_type === "Kiralik" && (
                        <span className="text-sm font-normal text-muted-foreground">
                          /ay
                        </span>
                      )}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {property.rooms !== "-" && (
                        <div className="flex items-center gap-1">
                          <BedDouble className="h-4 w-4" />
                          {property.rooms}
                        </div>
                      )}
                      {property.bathrooms > 0 && (
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          {property.bathrooms}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Maximize2 className="h-4 w-4" />
                        {formatArea(property.area)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                      <span>{property.portal_count} portal</span>
                      <span>{property.view_count} goruntulenme</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredProperties.map((property) => {
                const status = propertyStatusMap[property.status];
                return (
                  <div
                    key={property.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-8 w-8 text-muted-foreground/30" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {property.title}
                        </h3>
                        <Badge variant={status.variant} className="shrink-0">
                          {status.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {property.location}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        {property.rooms !== "-" && (
                          <span>{property.rooms}</span>
                        )}
                        <span>{formatArea(property.area)}</span>
                        <span>Kat: {property.floor}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(property.price)}
                      </p>
                      <Badge
                        variant={
                          property.listing_type === "Satilik"
                            ? "default"
                            : "info"
                        }
                        className="mt-1"
                      >
                        {property.listing_type}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredProperties.length === 0 && (
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
