"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  GripVertical,
  X,
  Building2,
  MapPin,
  Home,
  FileText,
  Camera,
  Eye,
  Globe,
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

const steps = [
  { id: 1, label: "Temel Bilgiler", icon: Building2 },
  { id: 2, label: "Konum", icon: MapPin },
  { id: 3, label: "Ozellikler", icon: Home },
  { id: 4, label: "Tapu Bilgileri", icon: FileText },
  { id: 5, label: "Fotograflar", icon: Camera },
  { id: 6, label: "Onizleme ve Yayinla", icon: Eye },
];

const propertyTypes = [
  "Daire",
  "Residence",
  "Villa",
  "Mustakil Ev",
  "Ciftlik Evi",
  "Yalin Ev",
  "Prefabrik",
  "Kooperatif",
];

const listingTypes = ["Satilik", "Kiralik", "Devren Satilik", "Devren Kiralik"];

const heatingOptions = [
  "Dogalgaz Kombi",
  "Merkezi Sistem",
  "Yerden Isitma",
  "Soba",
  "Klima",
  "Kat Kaloriferi",
  "Jeotermal",
  "Gunes Enerjisi",
];

const icOzellikler = [
  "ADSL",
  "Alarm",
  "Ankastre Mutfak",
  "Barbekü",
  "Beyaz Esya",
  "Dusakabin",
  "Ebeveyn Banyosu",
  "Giyinme Odasi",
  "Hilton Banyo",
  "Jakuzi",
  "Klima",
  "Mobilya",
  "Parke Zemin",
  "Seramik Zemin",
  "Laminat Zemin",
  "Spot Aydinlatma",
  "Termostat",
  "Vestiyer",
];

const disOzellikler = [
  "Asansor",
  "Otopark (Acik)",
  "Otopark (Kapali)",
  "Yuzme Havuzu",
  "Cocuk Oyun Parki",
  "Fitness",
  "Guvenlik",
  "Jenerator",
  "Kapici",
  "Sauna",
  "Tenis Kortu",
  "Yangin Merdiveni",
  "Hidrofor",
  "Su Deposu",
];

const tapuTypes = [
  "Kat Mulkiyeti",
  "Kat Irtifaki",
  "Arsa Tapusu",
  "Hisseli Tapu",
  "Kooperatif Tapusu",
];

const mockIller = ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya"];
const mockIlceler: Record<string, string[]> = {
  Istanbul: [
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
  ],
  Ankara: ["Cankaya", "Kecioren", "Mamak", "Etimesgut", "Sincan"],
  Izmir: ["Karsiyaka", "Bornova", "Buca", "Konak", "Bayrakli"],
  Bursa: ["Nilufer", "Osmangazi", "Yildirim", "Mudanya"],
  Antalya: ["Muratpasa", "Konyaalti", "Kepez", "Lara"],
};

const portalOptions = [
  { id: "sahibinden", name: "Sahibinden.com" },
  { id: "hepsiemlak", name: "Hepsiemlak.com" },
  { id: "emlakjet", name: "Emlakjet.com" },
  { id: "zingat", name: "Zingat.com" },
];

export default function YeniIlanPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const [selectedListingType, setSelectedListingType] = useState("");
  const [selectedIl, setSelectedIl] = useState("");
  const [selectedIlce, setSelectedIlce] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedDisFeatures, setSelectedDisFeatures] = useState<string[]>([]);
  const [selectedPortals, setSelectedPortals] = useState<string[]>(["sahibinden", "hepsiemlak"]);
  const [hasIskan, setHasIskan] = useState(false);
  const [hasDask, setHasDask] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<number[]>([]);

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const toggleDisFeature = (feature: string) => {
    setSelectedDisFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const togglePortal = (portalId: string) => {
    setSelectedPortals((prev) =>
      prev.includes(portalId)
        ? prev.filter((p) => p !== portalId)
        : [...prev, portalId]
    );
  };

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

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Yeni Ilan Ekle</h1>
        <p className="text-muted-foreground">
          Adim adim yeni ilan olusturun
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between overflow-x-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    className="flex flex-col items-center gap-1.5 px-2"
                    onClick={() => setCurrentStep(step.id)}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                        isCompleted &&
                          "border-primary bg-primary text-primary-foreground",
                        isCurrent &&
                          "border-primary text-primary",
                        !isCompleted &&
                          !isCurrent &&
                          "border-muted-foreground/30 text-muted-foreground/50"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] whitespace-nowrap",
                        isCurrent
                          ? "font-medium text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-px w-8 sm:w-12 mx-1",
                        step.id < currentStep
                          ? "bg-primary"
                          : "bg-muted-foreground/20"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Temel Bilgiler */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Temel Bilgiler</CardTitle>
            <CardDescription>
              Ilanin tur ve temel bilgilerini girin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Property Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Gayrimenkul Tipi</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {propertyTypes.map((type) => (
                  <button
                    key={type}
                    className={cn(
                      "rounded-lg border p-3 text-sm transition-colors hover:bg-accent",
                      selectedType === type &&
                        "border-primary bg-primary/5 font-medium"
                    )}
                    onClick={() => setSelectedType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Listing Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ilan Tipi</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {listingTypes.map((type) => (
                  <button
                    key={type}
                    className={cn(
                      "rounded-lg border p-3 text-sm transition-colors hover:bg-accent",
                      selectedListingType === type &&
                        "border-primary bg-primary/5 font-medium"
                    )}
                    onClick={() => setSelectedListingType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="col-span-full space-y-2">
                <label className="text-sm font-medium">Ilan Basligi</label>
                <Input placeholder="ornegin: Kadikoy Merkez 3+1 Satilik Daire" />
              </div>
              <div className="col-span-full space-y-2">
                <label className="text-sm font-medium">Aciklama</label>
                <Textarea
                  placeholder="Ilan hakkinda detayli aciklama yazin..."
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Fiyat (TL)
                </label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Aidat (TL/ay)
                </label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Konum */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Konum Bilgileri</CardTitle>
            <CardDescription>
              Gayrimenkulun konum bilgilerini girin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Il</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedIl}
                  onChange={(e) => {
                    setSelectedIl(e.target.value);
                    setSelectedIlce("");
                  }}
                >
                  <option value="">Il Secin</option>
                  {mockIller.map((il) => (
                    <option key={il} value={il}>
                      {il}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ilce</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedIlce}
                  onChange={(e) => setSelectedIlce(e.target.value)}
                  disabled={!selectedIl}
                >
                  <option value="">Ilce Secin</option>
                  {(mockIlceler[selectedIl] || []).map((ilce) => (
                    <option key={ilce} value={ilce}>
                      {ilce}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mahalle</label>
                <Input placeholder="Mahalle adi" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Detayli Adres</label>
              <Textarea placeholder="Cadde, sokak, bina no, daire no..." />
            </div>

            {/* Map Placeholder */}
            <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
              <div className="text-center">
                <MapPin className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Harita uzerinden konum secimi yakinda eklenecek
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Ozellikler */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ozellikler</CardTitle>
            <CardDescription>
              Gayrimenkulun fiziksel ozelliklerini belirtin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Oda Sayisi</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Secin</option>
                  {[
                    "1+0",
                    "1+1",
                    "2+0",
                    "2+1",
                    "3+1",
                    "3+2",
                    "4+1",
                    "4+2",
                    "5+1",
                    "5+2",
                    "6+",
                  ].map((oda) => (
                    <option key={oda} value={oda}>
                      {oda}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Banyo Sayisi</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Secin</option>
                  {["1", "2", "3", "4", "5+"].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Brut m2</label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Net m2</label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bulundugu Kat</label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Toplam Kat</label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bina Yasi</label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Isitma</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Secin</option>
                  {heatingOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ic Ozellikler */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-3">Ic Ozellikler</h3>
              <div className="flex flex-wrap gap-2">
                {icOzellikler.map((feature) => (
                  <button
                    key={feature}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      selectedFeatures.includes(feature)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent"
                    )}
                    onClick={() => toggleFeature(feature)}
                  >
                    {selectedFeatures.includes(feature) && (
                      <Check className="mr-1 inline h-3 w-3" />
                    )}
                    {feature}
                  </button>
                ))}
              </div>
            </div>

            {/* Dis Ozellikler */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-3">Dis Ozellikler</h3>
              <div className="flex flex-wrap gap-2">
                {disOzellikler.map((feature) => (
                  <button
                    key={feature}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      selectedDisFeatures.includes(feature)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent"
                    )}
                    onClick={() => toggleDisFeature(feature)}
                  >
                    {selectedDisFeatures.includes(feature) && (
                      <Check className="mr-1 inline h-3 w-3" />
                    )}
                    {feature}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Tapu Bilgileri */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tapu Bilgileri</CardTitle>
            <CardDescription>
              Gayrimenkulun tapu ve resmi belge bilgilerini girin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tapu Durumu</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Secin</option>
                  {tapuTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tapu Sahibi Adi
                </label>
                <Input placeholder="Tapu uzerindeki isim" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ada No</label>
                <Input placeholder="1234" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Parsel No</label>
                <Input placeholder="56" />
              </div>
            </div>

            {/* Iskan */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h4 className="text-sm font-medium">Iskan Belgesi</h4>
                <p className="text-xs text-muted-foreground">
                  Gayrimenkulun iskan (yapi kullanma izin belgesi) durumu
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={hasIskan}
                  onChange={() => setHasIskan(!hasIskan)}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
              </label>
            </div>

            {/* DASK */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h4 className="text-sm font-medium">DASK (Zorunlu Deprem Sigortasi)</h4>
                <p className="text-xs text-muted-foreground">
                  Zorunlu deprem sigortasi durumu
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={hasDask}
                  onChange={() => setHasDask(!hasDask)}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
              </label>
            </div>

            {hasDask && (
              <div className="space-y-2">
                <label className="text-sm font-medium">DASK Police No</label>
                <Input placeholder="DASK-2026-XXXXXX" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Fotograflar */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fotograflar</CardTitle>
            <CardDescription>
              Gayrimenkulun fotograflarini yukleyin (en fazla 20 fotograf)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Area */}
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-12 transition-colors hover:border-muted-foreground/50">
              <Upload className="h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-4 text-sm font-semibold">
                Fotograflari surukleyip birakin
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                veya dosya secmek icin tiklayin
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                Dosya Sec
              </Button>
              <p className="mt-2 text-[10px] text-muted-foreground">
                JPG, PNG veya WEBP (maks. 10 MB/fotograf)
              </p>
            </div>

            {/* Preview Grid Placeholder */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="group relative flex h-32 items-center justify-center rounded-lg bg-muted"
                >
                  <Camera className="h-6 w-6 text-muted-foreground/30" />
                  {i === 1 && (
                    <Badge className="absolute bottom-2 left-2 text-[10px]">
                      Kapak
                    </Badge>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="secondary" size="icon" className="h-7 w-7">
                      <GripVertical className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-7 w-7">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Ilk fotograf kapak fotografi olarak kullanilir. Surukleyerek
              siralama degistirebilirsiniz.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Onizleme ve Yayinla */}
      {currentStep === 6 && (
        <div className="space-y-6">
          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ilan Onizleme</CardTitle>
              <CardDescription>
                Ilaninizi yayinlamadan once kontrol edin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex h-48 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Kadikoy Merkez 3+1 Satilik Daire
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Kadikoy, Istanbul
                  </p>
                  <p className="mt-2 text-2xl font-bold text-primary">
                    4.500.000 TL
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>3+1</span>
                  <span>145 m2</span>
                  <span>5. Kat</span>
                  <span>5 Yasinda</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFeatures.slice(0, 5).map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                  {selectedFeatures.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedFeatures.length - 5} daha
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portal Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portal Secimi</CardTitle>
              <CardDescription>
                Ilani yayinlamak istediginiz portallari secin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {portalOptions.map((portal) => (
                  <div
                    key={portal.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors",
                      selectedPortals.includes(portal.id) &&
                        "border-primary bg-primary/5"
                    )}
                    onClick={() => togglePortal(portal.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">
                        {portal.name}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border",
                        selectedPortals.includes(portal.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selectedPortals.includes(portal.id) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri
        </Button>
        {currentStep < 6 ? (
          <Button
            onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
          >
            Ileri
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Check className="mr-2 h-4 w-4" />
            Yayinla
          </Button>
        )}
      </div>
    </div>
  );
}
