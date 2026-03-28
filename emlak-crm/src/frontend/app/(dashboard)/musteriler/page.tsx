"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Phone,
  Mail,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
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
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Select from "@radix-ui/react-select";
import { cn, formatPhone, formatRelativeDate } from "@/lib/utils";

// Mock data
const customers = [
  {
    id: "1",
    full_name: "Ahmet Yilmaz",
    phone: "5321234567",
    email: "ahmet@email.com",
    status: "aktif",
    interest_type: "Satin Alma",
    last_contact: new Date(Date.now() - 1000 * 60 * 60 * 2),
    agent: "Mehmet Danisman",
    source: "Sahibinden",
  },
  {
    id: "2",
    full_name: "Fatma Demir",
    phone: "5339876543",
    email: "fatma@email.com",
    status: "aktif",
    interest_type: "Kiralama",
    last_contact: new Date(Date.now() - 1000 * 60 * 60 * 24),
    agent: "Ayse Danisman",
    source: "Referans",
  },
  {
    id: "3",
    full_name: "Mustafa Kaya",
    phone: "5411112233",
    email: "mustafa@email.com",
    status: "beklemede",
    interest_type: "Satin Alma",
    last_contact: new Date(Date.now() - 1000 * 60 * 60 * 48),
    agent: "Mehmet Danisman",
    source: "Hepsiemlak",
  },
  {
    id: "4",
    full_name: "Zeynep Arslan",
    phone: "5054443322",
    email: "zeynep@email.com",
    status: "aktif",
    interest_type: "Satin Alma",
    last_contact: new Date(Date.now() - 1000 * 60 * 60 * 5),
    agent: "Ayse Danisman",
    source: "Web Sitesi",
  },
  {
    id: "5",
    full_name: "Ali Celik",
    phone: "5367778899",
    email: "ali@email.com",
    status: "pasif",
    interest_type: "Satis",
    last_contact: new Date(Date.now() - 1000 * 60 * 60 * 72),
    agent: "Mehmet Danisman",
    source: "Sahibinden",
  },
  {
    id: "6",
    full_name: "Elif Ozturk",
    phone: "5429998877",
    email: "elif@email.com",
    status: "aktif",
    interest_type: "Kiralama",
    last_contact: new Date(Date.now() - 1000 * 60 * 60 * 1),
    agent: "Ayse Danisman",
    source: "Emlakjet",
  },
];

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  aktif: { label: "Aktif", variant: "success" },
  beklemede: { label: "Beklemede", variant: "warning" },
  pasif: { label: "Pasif", variant: "secondary" },
};

export default function MusterilerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.full_name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      c.phone.includes(searchQuery) ||
      c.email.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));
    const matchesStatus =
      statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Musteriler
          </h1>
          <p className="text-muted-foreground">
            Toplam {customers.length} musteri kaydi
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Musteri
        </Button>
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
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tum Durumlar</option>
                <option value="aktif">Aktif</option>
                <option value="beklemede">Beklemede</option>
                <option value="pasif">Pasif</option>
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
                  <option value="mehmet">Mehmet Danisman</option>
                  <option value="ayse">Ayse Danisman</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customers Table */}
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
                    Danisman
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Islemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCustomers.map((customer) => {
                  const status = statusMap[customer.status];
                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs">
                              {customer.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {customer.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {customer.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {formatPhone(customer.phone)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm">
                          {customer.interest_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {formatRelativeDate(customer.last_contact)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-sm">{customer.agent}</span>
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
                              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent">
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

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {filteredCustomers.length} musteriden 1-{filteredCustomers.length} arasi gosteriliyor
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
