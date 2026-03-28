"use client";

import { useState } from "react";
import {
  Building2,
  Users,
  Globe,
  MessageSquare,
  Bell,
  Shield,
  Save,
  Plus,
  Edit2,
  Trash2,
  TestTube2,
  CheckCircle2,
  XCircle,
  Upload,
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
import { cn } from "@/lib/utils";

// Mock data
const mockUsers = [
  {
    id: "1",
    name: "Mehmet Yildiz",
    email: "mehmet@emlakcrm.com",
    role: "Admin",
    status: "aktif",
  },
  {
    id: "2",
    name: "Ayse Kara",
    email: "ayse@emlakcrm.com",
    role: "Yonetici",
    status: "aktif",
  },
  {
    id: "3",
    name: "Mehmet Danisman",
    email: "mehmetd@emlakcrm.com",
    role: "Danisman",
    status: "aktif",
  },
  {
    id: "4",
    name: "Ayse Danisman",
    email: "aysed@emlakcrm.com",
    role: "Danisman",
    status: "aktif",
  },
  {
    id: "5",
    name: "Selin Korkmaz",
    email: "selin@emlakcrm.com",
    role: "Sekreter",
    status: "pasif",
  },
];

const roleColors: Record<string, string> = {
  Admin: "bg-red-100 text-red-800",
  Yonetici: "bg-purple-100 text-purple-800",
  Danisman: "bg-blue-100 text-blue-800",
  Sekreter: "bg-gray-100 text-gray-800",
};

const mockTemplates = [
  {
    id: "1",
    name: "Hos Geldiniz Mesaji",
    channel: "WhatsApp",
    preview: "Merhaba {isim}, emlak ofisimize hos geldiniz...",
  },
  {
    id: "2",
    name: "Gosterim Hatirlatma",
    channel: "SMS",
    preview: "Sayil {isim}, yarin saat {saat} gosterim randevunuz...",
  },
  {
    id: "3",
    name: "Fiyat Guncelleme",
    channel: "E-posta",
    preview: "Sayin {isim}, ilgilendiginiz {ilan} ilani icin fiyat...",
  },
  {
    id: "4",
    name: "Teklif Bildirimi",
    channel: "WhatsApp",
    preview: "Merhaba {isim}, ilaniniz icin yeni bir teklif aldi...",
  },
];

const notificationSettings = [
  {
    event: "Yeni musteri kaydi",
    email: true,
    sms: false,
    push: true,
  },
  {
    event: "Yeni teklif",
    email: true,
    sms: true,
    push: true,
  },
  {
    event: "Gosterim hatirlatma",
    email: true,
    sms: true,
    push: true,
  },
  {
    event: "Tapu randevusu",
    email: true,
    sms: true,
    push: true,
  },
  {
    event: "Portal senkronizasyon hatasi",
    email: true,
    sms: false,
    push: true,
  },
  {
    event: "Sozlesme suresi dolum",
    email: true,
    sms: true,
    push: false,
  },
  {
    event: "DASK suresi dolum",
    email: true,
    sms: false,
    push: true,
  },
];

const tabItems = [
  { id: "ofis", label: "Ofis Bilgileri", icon: Building2 },
  { id: "kullanicilar", label: "Kullanicilar", icon: Users },
  { id: "portal", label: "Portal Ayarlari", icon: Globe },
  { id: "sablonlar", label: "Mesaj Sablonlari", icon: MessageSquare },
  { id: "bildirimler", label: "Bildirimler", icon: Bell },
  { id: "kvkk", label: "KVKK", icon: Shield },
];

export default function AyarlarPage() {
  const [notifications, setNotifications] = useState(notificationSettings);

  const toggleNotification = (index: number, channel: "email" | "sms" | "push") => {
    setNotifications((prev) =>
      prev.map((n, i) =>
        i === index ? { ...n, [channel]: !n[channel] } : n
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ayarlar</h1>
        <p className="text-muted-foreground">
          Sistem ve ofis ayarlarinizi yonetin
        </p>
      </div>

      <Tabs defaultValue="ofis">
        <TabsList className="flex w-full flex-wrap gap-1 h-auto">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Ofis Bilgileri Tab */}
        <TabsContent value="ofis">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ofis Bilgileri</CardTitle>
              <CardDescription>
                Emlak ofisinizin temel bilgilerini yonetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ofis Logosu</label>
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                      <Building2 className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 h-3.5 w-3.5" />
                      Logo Yukle
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ofis Adi</label>
                    <Input defaultValue="Emlak CRM Gayrimenkul" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefon</label>
                    <Input defaultValue="0 (212) 555 00 00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">E-posta</label>
                    <Input defaultValue="info@emlakcrm.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vergi No</label>
                    <Input defaultValue="1234567890" />
                  </div>
                  <div className="col-span-full space-y-2">
                    <label className="text-sm font-medium">Adres</label>
                    <Textarea defaultValue="Besiktas, Istanbul" />
                  </div>
                </div>

                {/* Commission Rates */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold mb-4">
                    Komisyon Oranlari
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Alici Komisyonu (%)
                      </label>
                      <Input type="number" defaultValue="2" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Satici Komisyonu (%)
                      </label>
                      <Input type="number" defaultValue="2" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Kira Komisyonu
                      </label>
                      <Input defaultValue="1 aylik kira" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Kaydet
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kullanicilar Tab */}
        <TabsContent value="kullanicilar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Kullanicilar</CardTitle>
                  <CardDescription>
                    Kullanici hesaplarini ve rolleri yonetin
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Kullanici Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ad Soyad
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        E-posta
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Islemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mockUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium">
                            {user.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {user.email}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={cn(
                              "text-xs",
                              roleColors[user.role]
                            )}
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              user.status === "aktif"
                                ? "success"
                                : "secondary"
                            }
                          >
                            {user.status === "aktif"
                              ? "Aktif"
                              : "Pasif"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portal Ayarlari Tab */}
        <TabsContent value="portal">
          <div className="space-y-4">
            {[
              { name: "Sahibinden.com", connected: true },
              { name: "Hepsiemlak.com", connected: true },
              { name: "Emlakjet.com", connected: true },
              { name: "Zingat.com", connected: false },
            ].map((portal) => (
              <Card key={portal.name}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">
                          {portal.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          {portal.connected ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              <span className="text-xs text-emerald-600">
                                Bagli
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 text-red-500" />
                              <span className="text-xs text-red-600">
                                Bagli degil
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 max-w-md items-center gap-2">
                      <Input
                        type="password"
                        placeholder="API Anahtari"
                        defaultValue={portal.connected ? "sk-xxxxxxxxxxxx" : ""}
                      />
                      <Button variant="outline" size="sm">
                        <TestTube2 className="mr-2 h-3.5 w-3.5" />
                        Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Mesaj Sablonlari Tab */}
        <TabsContent value="sablonlar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Mesaj Sablonlari</CardTitle>
                  <CardDescription>
                    Otomatik mesajlar icin sablonlari yonetin
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Sablon
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">
                          {template.name}
                        </h4>
                        <Badge variant="secondary" className="text-[10px]">
                          {template.channel}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        {template.preview}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bildirimler Tab */}
        <TabsContent value="bildirimler">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bildirim Tercihleri</CardTitle>
              <CardDescription>
                Hangi olaylarda bildirim almak istediginizi secin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Olay
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        E-posta
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        SMS
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Push
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {notifications.map((notif, index) => (
                      <tr key={notif.event}>
                        <td className="px-4 py-3">
                          <span className="text-sm">{notif.event}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={notif.email}
                            onChange={() =>
                              toggleNotification(index, "email")
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={notif.sms}
                            onChange={() =>
                              toggleNotification(index, "sms")
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={notif.push}
                            onChange={() =>
                              toggleNotification(index, "push")
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Tercihleri Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KVKK Tab */}
        <TabsContent value="kvkk">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Veri Saklama Suresi
                </CardTitle>
                <CardDescription>
                  KVKK kapsaminda kisisel verilerin saklama surelerini belirleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Musteri Verileri (ay)
                    </label>
                    <Input type="number" defaultValue="36" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Mesaj Gecmisi (ay)
                    </label>
                    <Input type="number" defaultValue="24" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Log Kayitlari (ay)
                    </label>
                    <Input type="number" defaultValue="12" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Belgeler (ay)
                    </label>
                    <Input type="number" defaultValue="60" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Aydinlatma Metni ve Onam Formu
                </CardTitle>
                <CardDescription>
                  Musteri kaydi sirasinda gosterilecek KVKK metni
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[150px]"
                  defaultValue="6698 sayili Kisisel Verilerin Korunmasi Kanunu kapsaminda, kisisel verileriniz emlak danismanlik hizmeti sunulmasi amaciyla islenmektedir. Detayli bilgi icin aydinlatma metnimizi inceleyiniz."
                />
                <div className="mt-4 flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Veri Islem Araclari</CardTitle>
                <CardDescription>
                  KVKK kapsaminda veri disari aktarma ve silme islemleri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline">
                    Tum Verileri Disari Aktar (JSON)
                  </Button>
                  <Button variant="outline">
                    Tum Verileri Disari Aktar (CSV)
                  </Button>
                  <Button variant="destructive">
                    Suresi Dolan Verileri Sil
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
