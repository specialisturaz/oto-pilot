"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Plus,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ContactType = "bireysel" | "kurumsal";
type InterestType = "alici" | "satici" | "kiraci" | "ev_sahibi" | "yatirimci";

const interestTypes: { id: InterestType; label: string }[] = [
  { id: "alici", label: "Alici" },
  { id: "satici", label: "Satici" },
  { id: "kiraci", label: "Kiraci" },
  { id: "ev_sahibi", label: "Ev Sahibi" },
  { id: "yatirimci", label: "Yatirimci" },
];

const sourceOptions = [
  "Portal (Sahibinden)",
  "Portal (Hepsiemlak)",
  "Portal (Emlakjet)",
  "Portal (Zingat)",
  "Referans",
  "Yuruyerek",
  "Web Sitesi",
  "WhatsApp",
  "Telefon",
  "Sosyal Medya",
];

const locationOptions = [
  "Kadikoy",
  "Besiktas",
  "Atasehir",
  "Uskudar",
  "Bakirkoy",
  "Sisli",
  "Maltepe",
  "Pendik",
  "Beylikduzu",
  "Kartal",
  "Umraniye",
  "Sariyer",
  "Fatih",
  "Beyoglu",
  "Bakiroy",
];

const propertyTypeOptions = [
  "Daire",
  "Residence",
  "Villa",
  "Mustakil Ev",
  "Arsa",
  "Isyeri",
  "Ofis",
  "Dukkan",
];

const danismanOptions = [
  "Mehmet Danisman",
  "Ayse Danisman",
  "Can Yilmaz",
  "Selin Korkmaz",
];

export default function YeniMusteriPage() {
  const [contactType, setContactType] = useState<ContactType>("bireysel");
  const [selectedInterest, setSelectedInterest] = useState<InterestType | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedDanisman, setSelectedDanisman] = useState("");

  const toggleLocation = (location: string) => {
    setSelectedLocations((prev) =>
      prev.includes(location)
        ? prev.filter((l) => l !== location)
        : [...prev, location]
    );
  };

  const togglePropertyType = (type: string) => {
    setSelectedPropertyTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

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

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Yeni Musteri Ekle
        </h1>
        <p className="text-muted-foreground">
          Yeni musteri kaydi olusturun
        </p>
      </div>

      {/* Contact Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Musteri Tipi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <button
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent",
                contactType === "bireysel" &&
                  "border-primary bg-primary/5"
              )}
              onClick={() => setContactType("bireysel")}
            >
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium">Bireysel</p>
                <p className="text-[10px] text-muted-foreground">
                  Gercek kisi
                </p>
              </div>
            </button>
            <button
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent",
                contactType === "kurumsal" &&
                  "border-primary bg-primary/5"
              )}
              onClick={() => setContactType("kurumsal")}
            >
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium">Kurumsal</p>
                <p className="text-[10px] text-muted-foreground">
                  Sirket/kurum
                </p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {contactType === "bireysel"
              ? "Kisisel Bilgiler"
              : "Kurum Bilgileri"}
          </CardTitle>
          <CardDescription>
            {contactType === "bireysel"
              ? "Musterinin temel iletisim bilgileri"
              : "Kurumun temel bilgileri ve yetkili kisi"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {contactType === "bireysel" ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Ad <span className="text-destructive">*</span>
                  </label>
                  <Input placeholder="Adi" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Soyad <span className="text-destructive">*</span>
                  </label>
                  <Input placeholder="Soyadi" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Sirket Adi <span className="text-destructive">*</span>
                  </label>
                  <Input placeholder="Sirket adi" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Yetkili Kisi <span className="text-destructive">*</span>
                  </label>
                  <Input placeholder="Yetkili adi soyadi" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Telefon <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="05XX XXX XX XX" className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="ornek@email.com" className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {contactType === "bireysel"
                  ? "TC Kimlik No"
                  : "Vergi No"}
              </label>
              <Input
                placeholder={
                  contactType === "bireysel"
                    ? "XXXXXXXXXXX"
                    : "XXXXXXXXXX"
                }
              />
            </div>
            {contactType === "kurumsal" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Vergi Dairesi</label>
                <Input placeholder="Vergi dairesi" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interest Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ilgi Alani</CardTitle>
          <CardDescription>
            Musteri ne ile ilgileniyor?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {interestTypes.map((type) => (
              <button
                key={type.id}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm transition-colors hover:bg-accent",
                  selectedInterest === type.id &&
                    "border-primary bg-primary/5 font-medium"
                )}
                onClick={() => setSelectedInterest(type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      {(selectedInterest === "alici" ||
        selectedInterest === "kiraci" ||
        selectedInterest === "yatirimci") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tercihler</CardTitle>
            <CardDescription>
              Musterinin gayrimenkul tercihleri
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Budget */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Minimum Butce (TL)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="number" placeholder="0" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Maksimum Butce (TL)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="number" placeholder="0" className="pl-9" />
                </div>
              </div>
            </div>

            {/* Preferred Locations */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Tercih Edilen Bolgeler
              </label>
              <div className="flex flex-wrap gap-2">
                {locationOptions.map((loc) => (
                  <button
                    key={loc}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      selectedLocations.includes(loc)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent"
                    )}
                    onClick={() => toggleLocation(loc)}
                  >
                    {loc}
                    {selectedLocations.includes(loc) && (
                      <X className="ml-1 inline h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Property Types */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Tercih Edilen Gayrimenkul Turleri
              </label>
              <div className="flex flex-wrap gap-2">
                {propertyTypeOptions.map((type) => (
                  <button
                    key={type}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      selectedPropertyTypes.includes(type)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent"
                    )}
                    onClick={() => togglePropertyType(type)}
                  >
                    {type}
                    {selectedPropertyTypes.includes(type) && (
                      <X className="ml-1 inline h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source & Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kaynak ve Atama</CardTitle>
          <CardDescription>
            Musteri kaynagi ve sorumlu danisman
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Musteri Kaynagi <span className="text-destructive">*</span>
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
              >
                <option value="">Kaynak Secin</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Sorumlu Danisman
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedDanisman}
                onChange={(e) => setSelectedDanisman(e.target.value)}
              >
                <option value="">Danisman Secin</option>
                {danismanOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notlar</CardTitle>
          <CardDescription>
            Musteri hakkinda ek bilgiler ve notlar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Musteri hakkinda notlarinizi buraya yazin..."
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link href="/musteriler">
          <Button variant="outline" className="w-full sm:w-auto">
            Iptal
          </Button>
        </Link>
        <Button variant="outline" className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Kaydet ve Yeni Ekle
        </Button>
        <Button className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          Kaydet
        </Button>
      </div>
    </div>
  );
}
