"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Plus,
  Edit2,
  Save,
  X,
  Calendar,
  Building2,
  FileText,
  Clock,
  Eye,
  User,
  MapPin,
  Heart,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatPhone, formatPrice, formatRelativeDate } from "@/lib/utils";

// Mock data for a single contact
const contact = {
  id: "1",
  firstName: "Ahmet",
  lastName: "Yilmaz",
  phone: "5321234567",
  email: "ahmet@email.com",
  tc_kimlik: "12345678901",
  status: "aktif",
  interest_type: "Alici",
  source: "Sahibinden",
  agent: "Mehmet Danisman",
  budget_min: 3000000,
  budget_max: 6000000,
  preferred_locations: ["Kadikoy", "Atasehir", "Uskudar"],
  preferred_types: ["Daire", "Dublex"],
  notes: "3+1 veya 4+1 daire araniyor. Deniz manzarali tercih ediliyor.",
  created_at: new Date("2026-02-15"),
  last_contact: new Date(Date.now() - 1000 * 60 * 60 * 2),
};

const activities = [
  {
    id: "1",
    type: "call",
    description: "Telefon gorusmesi yapildi. Kadikoy daire hakkinda bilgi verildi.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    icon: Phone,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "2",
    type: "showing",
    description: "Kadikoy 3+1 daire gosterimi yapildi. Musteri begenidi.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    icon: Eye,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "3",
    type: "email",
    description: "Ilan detaylari e-posta ile gonderildi.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 48),
    icon: Mail,
    color: "bg-purple-100 text-purple-600",
  },
  {
    id: "4",
    type: "note",
    description: "Musteri 4+1 dublex de degerlendirebilir. Butce esneklik var.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 72),
    icon: FileText,
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "5",
    type: "whatsapp",
    description: "WhatsApp uzerinden gosterim randevusu olusturuldu.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 96),
    icon: MessageSquare,
    color: "bg-green-100 text-green-600",
  },
  {
    id: "6",
    type: "registration",
    description: "Musteri kaydedildi. Kaynak: Sahibinden.com",
    date: new Date("2026-02-15"),
    icon: User,
    color: "bg-gray-100 text-gray-600",
  },
];

const relatedProperties = [
  {
    id: "1",
    title: "Kadikoy Merkez 3+1 Daire",
    price: 4500000,
    location: "Kadikoy, Istanbul",
    rooms: "3+1",
    area: 145,
    status: "Ilgileniyor",
  },
  {
    id: "2",
    title: "Atasehir Residence 2+1",
    price: 3200000,
    location: "Atasehir, Istanbul",
    rooms: "2+1",
    area: 95,
    status: "Gosterim Yapildi",
  },
  {
    id: "3",
    title: "Uskudar Sahil 3+1",
    price: 5100000,
    location: "Uskudar, Istanbul",
    rooms: "3+1",
    area: 130,
    status: "Onerildi",
  },
];

const relatedDeals = [
  {
    id: "1",
    property: "Kadikoy 3+1 Daire",
    stage: "Pazarlik",
    price: 4500000,
    date: "20 Mart 2026",
  },
];

const relatedDocuments = [
  {
    id: "1",
    name: "Kimlik_AhmetYilmaz.jpg",
    type: "Kimlik",
    date: "15 Subat 2026",
    size: "0.9 MB",
  },
  {
    id: "2",
    name: "Gelir_Belgesi_AhmetYilmaz.pdf",
    type: "Diger",
    date: "18 Mart 2026",
    size: "1.2 MB",
  },
];

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  aktif: { label: "Aktif", variant: "success" },
  beklemede: { label: "Beklemede", variant: "warning" },
  pasif: { label: "Pasif", variant: "secondary" },
};

const interestColors: Record<string, string> = {
  Alici: "bg-blue-100 text-blue-800",
  Satici: "bg-amber-100 text-amber-800",
  Kiraci: "bg-green-100 text-green-800",
  "Ev Sahibi": "bg-purple-100 text-purple-800",
  Yatirimci: "bg-red-100 text-red-800",
};

function getFullName(c: { firstName?: string; lastName?: string }) {
  return `${c.firstName || ""} ${c.lastName || ""}`.trim();
}

export default function MusteriDetailPage() {
  const [isEditing, setIsEditing] = useState(false);
  const status = statusMap[contact.status];
  const contactFullName = getFullName(contact);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/musteriler"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Musteriler
      </Link>

      {/* Contact Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {contactFullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{contactFullName}</h1>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <Badge className={cn("text-xs", interestColors[contact.interest_type])}>
                    {contact.interest_type}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {formatPhone(contact.phone)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {contact.email}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {contact.agent}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Son iletisim: {formatRelativeDate(contact.last_contact)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Phone className="mr-2 h-3.5 w-3.5" />
                Ara
              </Button>
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-2 h-3.5 w-3.5" />
                WhatsApp
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="mr-2 h-3.5 w-3.5" />
                E-posta
              </Button>
              <Button size="sm">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Gorev Ekle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="genel">
        <TabsList>
          <TabsTrigger value="genel">Genel Bilgiler</TabsTrigger>
          <TabsTrigger value="aktiviteler">Aktiviteler</TabsTrigger>
          <TabsTrigger value="ilanlar">Ilanlar</TabsTrigger>
          <TabsTrigger value="anlasmalar">Anlasmalar</TabsTrigger>
          <TabsTrigger value="belgeler">Belgeler</TabsTrigger>
        </TabsList>

        {/* Genel Bilgiler Tab */}
        <TabsContent value="genel">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Kisisel Bilgiler</CardTitle>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? (
                    <>
                      <Save className="mr-2 h-3.5 w-3.5" />
                      Kaydet
                    </>
                  ) : (
                    <>
                      <Edit2 className="mr-2 h-3.5 w-3.5" />
                      Duzenle
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Ad Soyad
                  </label>
                  {isEditing ? (
                    <Input defaultValue={contactFullName} />
                  ) : (
                    <p className="text-sm">{contactFullName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Telefon
                  </label>
                  {isEditing ? (
                    <Input defaultValue={contact.phone} />
                  ) : (
                    <p className="text-sm">{formatPhone(contact.phone)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    E-posta
                  </label>
                  {isEditing ? (
                    <Input defaultValue={contact.email} />
                  ) : (
                    <p className="text-sm">{contact.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    TC Kimlik No
                  </label>
                  {isEditing ? (
                    <Input defaultValue={contact.tc_kimlik} />
                  ) : (
                    <p className="text-sm">{contact.tc_kimlik}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Kaynak
                  </label>
                  <p className="text-sm">{contact.source}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Danisman
                  </label>
                  <p className="text-sm">{contact.agent}</p>
                </div>
              </div>

              {/* Preferences */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-semibold mb-4">Tercihler</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Butce Araligi
                    </label>
                    <p className="text-sm">
                      {formatPrice(contact.budget_min)} -{" "}
                      {formatPrice(contact.budget_max)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Tercih Edilen Bolgeler
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {contact.preferred_locations.map((loc) => (
                        <Badge key={loc} variant="secondary" className="text-xs">
                          {loc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Tercih Edilen Turler
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {contact.preferred_types.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-semibold mb-4">Notlar</h3>
                {isEditing ? (
                  <Textarea defaultValue={contact.notes} className="min-h-[100px]" />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {contact.notes}
                  </p>
                )}
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
                Tum iletisim ve islem gecmisi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-6">
                {/* Timeline line */}
                <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />

                {activities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="relative flex gap-4 pl-0"
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full z-10",
                          activity.color
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatRelativeDate(activity.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ilanlar Tab */}
        <TabsContent value="ilanlar">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Iliskili Ilanlar</CardTitle>
              <CardDescription>
                Bu musterinin ilgilendigi veya sahip oldugu ilanlar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {relatedProperties.map((property) => (
                  <div
                    key={property.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">
                          {property.title}
                        </h4>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{property.location}</span>
                          <span>{property.rooms}</span>
                          <span>{property.area} m2</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">
                        {formatPrice(property.price)}
                      </p>
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {property.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anlasmalar Tab */}
        <TabsContent value="anlasmalar">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anlasmalar</CardTitle>
              <CardDescription>
                Bu musteriyle ilgili satis surecleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              {relatedDeals.length > 0 ? (
                <div className="space-y-3">
                  {relatedDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <h4 className="text-sm font-medium">
                          {deal.property}
                        </h4>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="info">{deal.stage}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {deal.date}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        {formatPrice(deal.price)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <DollarSign className="h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Henuz anlasma bulunmuyor
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
                  <CardDescription>
                    Bu musteriyle iliskili belgeler
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Belge Yukle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {relatedDocuments.length > 0 ? (
                <div className="space-y-3">
                  {relatedDocuments.map((doc) => (
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
                            <span>{doc.date}</span>
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
    </div>
  );
}
