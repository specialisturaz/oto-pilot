"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  User,
  Building2,
  Phone,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn, formatPrice, formatPriceShort } from "@/lib/utils";

// Pipeline stages in Turkish
const stages = [
  { id: "talep", label: "Talep", color: "bg-slate-500" },
  { id: "gosterim", label: "Gosterim", color: "bg-blue-500" },
  { id: "pazarlik", label: "Pazarlik", color: "bg-indigo-500" },
  { id: "teklif", label: "Teklif", color: "bg-purple-500" },
  { id: "kapora", label: "Kapora", color: "bg-amber-500" },
  { id: "sozlesme", label: "Sozlesme", color: "bg-orange-500" },
  { id: "tapu", label: "Tapu", color: "bg-emerald-500" },
  { id: "tamamlandi", label: "Tamamlandi", color: "bg-green-600" },
];

// Mock deals data
const initialDeals: Record<string, Deal[]> = {
  talep: [
    {
      id: "1",
      contact_name: "Ahmet Yilmaz",
      property_title: "Kadikoy 3+1 Daire",
      price: 4500000,
      agent: "Mehmet D.",
      created_at: "2026-03-20",
      priority: "high",
    },
    {
      id: "2",
      contact_name: "Fatma Demir",
      property_title: "Atasehir 2+1 Residence",
      price: 25000,
      agent: "Ayse D.",
      created_at: "2026-03-22",
      priority: "medium",
      is_rental: true,
    },
  ],
  gosterim: [
    {
      id: "3",
      contact_name: "Mustafa Kaya",
      property_title: "Besiktas Villa",
      price: 18500000,
      agent: "Mehmet D.",
      created_at: "2026-03-18",
      priority: "high",
    },
  ],
  pazarlik: [
    {
      id: "4",
      contact_name: "Zeynep Arslan",
      property_title: "Bakirkoy 4+1 Dublex",
      price: 7800000,
      agent: "Ayse D.",
      created_at: "2026-03-15",
      priority: "medium",
    },
    {
      id: "5",
      contact_name: "Ali Celik",
      property_title: "Sisli Ofis",
      price: 45000,
      agent: "Mehmet D.",
      created_at: "2026-03-17",
      priority: "low",
      is_rental: true,
    },
  ],
  teklif: [
    {
      id: "6",
      contact_name: "Elif Ozturk",
      property_title: "Kadikoy Deniz Manzarali",
      price: 6200000,
      agent: "Ayse D.",
      created_at: "2026-03-10",
      priority: "high",
    },
  ],
  kapora: [
    {
      id: "7",
      contact_name: "Hasan Yildiz",
      property_title: "Maltepe 3+1 Yeni",
      price: 3800000,
      agent: "Mehmet D.",
      created_at: "2026-03-08",
      priority: "high",
    },
  ],
  sozlesme: [
    {
      id: "8",
      contact_name: "Merve Sahin",
      property_title: "Uskudar 2+1 Daire",
      price: 2900000,
      agent: "Ayse D.",
      created_at: "2026-03-05",
      priority: "medium",
    },
  ],
  tapu: [],
  tamamlandi: [
    {
      id: "9",
      contact_name: "Emre Korkmaz",
      property_title: "Beylikduzu 3+1",
      price: 2400000,
      agent: "Mehmet D.",
      created_at: "2026-02-20",
      priority: "low",
    },
  ],
};

interface Deal {
  id: string;
  contact_name: string;
  property_title: string;
  price: number;
  agent: string;
  created_at: string;
  priority: "high" | "medium" | "low";
  is_rental?: boolean;
}

const priorityColors: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-green-500",
};

export default function SatislarPage() {
  const [deals] = useState(initialDeals);

  // Calculate totals
  const totalDeals = Object.values(deals).flat().length;
  const totalValue = Object.values(deals)
    .flat()
    .filter((d) => !d.is_rental)
    .reduce((sum, d) => sum + d.price, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Satis Pipeline
          </h1>
          <p className="text-muted-foreground">
            {totalDeals} aktif satis &middot; Toplam deger:{" "}
            {formatPrice(totalValue)}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Satis
        </Button>
      </div>

      {/* Pipeline Summary */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const stageDeals = deals[stage.id] || [];
          return (
            <div
              key={stage.id}
              className="flex items-center gap-2 rounded-lg bg-card border px-3 py-2 text-sm shrink-0"
            >
              <div className={cn("h-2.5 w-2.5 rounded-full", stage.color)} />
              <span className="font-medium">{stage.label}</span>
              <Badge variant="secondary" className="ml-1">
                {stageDeals.length}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {stages.map((stage) => {
          const stageDeals = deals[stage.id] || [];
          const stageTotal = stageDeals
            .filter((d) => !d.is_rental)
            .reduce((sum, d) => sum + d.price, 0);

          return (
            <div
              key={stage.id}
              className="flex w-[300px] shrink-0 flex-col rounded-lg bg-muted/50 border"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b p-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full",
                      stage.color
                    )}
                  />
                  <h3 className="font-semibold text-sm">{stage.label}</h3>
                  <Badge variant="outline" className="ml-1 text-xs">
                    {stageDeals.length}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Column Total */}
              {stageTotal > 0 && (
                <div className="border-b px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Toplam: {formatPriceShort(stageTotal)}
                  </p>
                </div>
              )}

              {/* Deal Cards */}
              {/* TODO: Implement drag-and-drop with @dnd-kit/core or react-beautiful-dnd */}
              <div className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin">
                {stageDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    className={cn(
                      "border-l-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
                      priorityColors[deal.priority]
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        {/* Deal Header */}
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium line-clamp-1">
                            {deal.property_title}
                          </h4>
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                className="z-50 min-w-[140px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                                align="end"
                              >
                                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent">
                                  Detay Goruntule
                                </DropdownMenu.Item>
                                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent">
                                  Duzenle
                                </DropdownMenu.Item>
                                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent">
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  Sonraki Asama
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10">
                                  Iptal Et
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </div>

                        {/* Contact Info */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {deal.contact_name}
                        </div>

                        {/* Price */}
                        <p className="text-sm font-bold text-primary">
                          {formatPrice(deal.price)}
                          {deal.is_rental && (
                            <span className="text-xs font-normal text-muted-foreground">
                              /ay
                            </span>
                          )}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-1 border-t">
                          <div className="flex items-center gap-1">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {deal.agent
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {deal.agent}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {deal.created_at.split("-").reverse().slice(0, 2).join("/")}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Empty State */}
                {stageDeals.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
                    <p className="text-xs text-muted-foreground">
                      Bu asamada satis yok
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
