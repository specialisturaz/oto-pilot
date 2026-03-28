"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search,
  Plus,
  Filter,
  Phone,
  Mail,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Users,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn, formatPhone, formatRelativeDate } from "@/lib/utils";
import api from "@/lib/api";

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  active: { label: "Aktif", variant: "success" },
  aktif: { label: "Aktif", variant: "success" },
  pending: { label: "Beklemede", variant: "warning" },
  beklemede: { label: "Beklemede", variant: "warning" },
  inactive: { label: "Pasif", variant: "secondary" },
  pasif: { label: "Pasif", variant: "secondary" },
};

function getContactName(contact: Record<string, unknown>): string {
  if (contact.firstName && contact.lastName) {
    return `${contact.firstName} ${contact.lastName}`;
  }
  if (contact.full_name) return String(contact.full_name);
  if (contact.name) return String(contact.name);
  return "Isimsiz";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}

export default function MusterilerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["contacts", page, searchQuery, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/api/v1/contacts", { params });
      return res.data?.data || res.data;
    },
    retry: false,
  });

  const contacts = data?.items || data?.contacts || (Array.isArray(data) ? data : []);
  const totalCount = data?.total || data?.totalCount || contacts.length;
  const totalPages = data?.totalPages || Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Musteriler
          </h1>
          <p className="text-muted-foreground">
            {isLoading ? "Yukleniyor..." : `Toplam ${totalCount} musteri kaydi`}
          </p>
        </div>
        <Link href="/musteriler/yeni">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Musteri
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Musteri ara (ad, telefon, e-posta)..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Tum Durumlar</option>
                <option value="active">Aktif</option>
                <option value="pending">Beklemede</option>
                <option value="inactive">Pasif</option>
              </select>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtreler
              </Button>
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Ilgi Alani
                </label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option value="">Tumunu Goster</option>
                  <option value="satin_alma">Satin Alma</option>
                  <option value="kiralama">Kiralama</option>
                  <option value="satis">Satis</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Kaynak
                </label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option value="">Tumunu Goster</option>
                  <option value="sahibinden">Sahibinden</option>
                  <option value="hepsiemlak">Hepsiemlak</option>
                  <option value="emlakjet">Emlakjet</option>
                  <option value="referans">Referans</option>
                  <option value="web">Web Sitesi</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Danisman
                </label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option value="">Tumunu Goster</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">Veriler yuklenemedi</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Backend baglantisi kontrol ediniz.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Customers Table */}
      {!isLoading && !isError && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ad Soyad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Telefon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                      Durum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                      Ilgi Alani
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                      Son Iletisim
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                      Kaynak
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Islemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contacts.map((customer: Record<string, unknown>) => {
                    const name = getContactName(customer);
                    const statusKey = String(customer.status || "aktif");
                    const status = statusMap[statusKey] || statusMap.aktif;
                    return (
                      <tr
                        key={String(customer.id)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <Link href={`/musteriler/${customer.id}`}>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-xs">
                                  {getInitials(name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {String(customer.email || "")}
                                </p>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">
                            {customer.phone ? formatPhone(String(customer.phone)) : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm">
                            {String(customer.interestType || customer.interest_type || "-")}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {customer.lastContactAt || customer.last_contact
                              ? formatRelativeDate(String(customer.lastContactAt || customer.last_contact))
                              : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-sm">{String(customer.source || "-")}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                className="z-50 min-w-[160px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                                align="end"
                              >
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent"
                                  onSelect={() => {
                                    window.location.href = `/musteriler/${customer.id}`;
                                  }}
                                >
                                  Detay Goruntule
                                </DropdownMenu.Item>
                                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent">
                                  <Phone className="h-3.5 w-3.5" />
                                  Ara
                                </DropdownMenu.Item>
                                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent">
                                  <Mail className="h-3.5 w-3.5" />
                                  E-posta Gonder
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10">
                                  Sil
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty state */}
            {contacts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-4 text-lg font-semibold">Musteri Bulunamadi</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Arama kriterlerinize uygun musteri bulunamadi.
                </p>
              </div>
            )}

            {/* Pagination */}
            {contacts.length > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Toplam {totalCount} musteriden {(page - 1) * limit + 1}-{Math.min(page * limit, totalCount)} arasi gosteriliyor
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
                    {page}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
