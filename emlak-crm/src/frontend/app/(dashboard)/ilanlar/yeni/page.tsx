"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  X,
  Building2,
  MapPin,
  Home,
  FileText,
  Camera,
  Eye,
  Globe,
  Loader2,
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
import { Textarea } from "@/components/ui/textarea";
import { cn, formatPrice } from "@/lib/utils";
import api from "@/lib/api";

// ---- Types ----
interface PhotoPreview {
  file: File;
  preview: string;
}

// ---- Zod Schema ----
const propertyFormSchema = z.object({
  title: z.string().min(10, "Baslik en az 10 karakter olmali").max(200),
  description: z.string().max(5000).optional().or(z.literal("")),
  property_type: z.string().min(1, "Gayrimenkul tipi secin"),
  listing_type: z.string().min(1, "Ilan tipi secin"),
  listing_price: z.coerce.number().min(1, "Fiyat giriniz"),
  currency: z.string().optional().default("TRY"),
  aidat: z.coerce.number().min(0).optional().or(z.literal(0)),
  city: z.string().min(1, "Il secin"),
  district: z.string().min(1, "Ilce secin"),
  neighborhood: z.string().optional().or(z.literal("")),
  address_detail: z.string().optional().or(z.literal("")),
  room_count: z.string().optional().or(z.literal("")),
  bathroom_count: z.coerce.number().int().min(0).optional().or(z.literal(0)),
  gross_sqm: z.coerce.number().min(0).optional().or(z.literal(0)),
  net_sqm: z.coerce.number().min(0).optional().or(z.literal(0)),
  floor_number: z.coerce.number().int().optional().or(z.literal(0)),
  total_floors: z.coerce.number().int().min(0).optional().or(z.literal(0)),
  building_age: z.coerce.number().int().min(0).optional().or(z.literal(0)),
  heating_type: z.string().optional().or(z.literal("")),
  tapu_durumu: z.string().optional().or(z.literal("")),
  tapu_owner: z.string().optional().or(z.literal("")),
  ada_no: z.string().optional().or(z.literal("")),
  parsel_no: z.string().optional().or(z.literal("")),
  dask_no: z.string().optional().or(z.literal("")),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

// ---- Constants ----
const steps = [
  { id: 1, label: "Temel Bilgiler", icon: Building2 },
  { id: 2, label: "Konum", icon: MapPin },
  { id: 3, label: "Ozellikler", icon: Home },
  { id: 4, label: "Tapu Bilgileri", icon: FileText },
  { id: 5, label: "Fotograflar", icon: Camera },
  { id: 6, label: "Onizleme ve Yayinla", icon: Eye },
];

const propertyTypes = [
  { value: "daire", label: "Daire" },
  { value: "villa", label: "Villa" },
  { value: "mustakil", label: "Mustakil Ev" },
  { value: "arsa", label: "Arsa" },
  { value: "dukkan", label: "Dukkan" },
  { value: "ofis", label: "Ofis" },
  { value: "depo", label: "Depo" },
  { value: "kooperatif", label: "Kooperatif" },
];

const listingTypes = [
  { value: "satilik", label: "Satilik" },
  { value: "kiralik", label: "Kiralik" },
  { value: "devren_satilik", label: "Devren Satilik" },
  { value: "devren_kiralik", label: "Devren Kiralik" },
];

const heatingOptions = [
  { value: "dogalgaz_kombi", label: "Dogalgaz Kombi" },
  { value: "merkezi", label: "Merkezi Sistem" },
  { value: "yerden_isitma", label: "Yerden Isitma" },
  { value: "soba", label: "Soba" },
  { value: "klima", label: "Klima" },
  { value: "diger", label: "Diger" },
  { value: "yok", label: "Yok" },
];

const icOzellikler = [
  "ADSL", "Alarm", "Ankastre Mutfak", "Barbekü", "Beyaz Esya",
  "Dusakabin", "Ebeveyn Banyosu", "Giyinme Odasi", "Hilton Banyo",
  "Jakuzi", "Klima", "Mobilya", "Parke Zemin", "Seramik Zemin",
  "Laminat Zemin", "Spot Aydinlatma", "Termostat", "Vestiyer",
];

const disOzellikler = [
  "Asansor", "Otopark (Acik)", "Otopark (Kapali)", "Yuzme Havuzu",
  "Cocuk Oyun Parki", "Fitness", "Guvenlik", "Jenerator",
  "Kapici", "Sauna", "Tenis Kortu", "Yangin Merdiveni",
  "Hidrofor", "Su Deposu",
];

const tapuTypes = [
  { value: "kat_mulkiyeti", label: "Kat Mulkiyeti" },
  { value: "kat_irtifaki", label: "Kat Irtifaki" },
  { value: "arsa_tapusu", label: "Arsa Tapusu" },
  { value: "hisseli", label: "Hisseli Tapu" },
  { value: "diger", label: "Diger" },
];

const portalOptions = [
  { id: "sahibinden", name: "Sahibinden.com" },
  { id: "hepsiemlak", name: "Hepsiemlak.com" },
  { id: "emlakjet", name: "Emlakjet.com" },
];

// ---- Component ----
export default function YeniIlanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedDisFeatures, setSelectedDisFeatures] = useState<string[]>([]);
  const [selectedPortals, setSelectedPortals] = useState<string[]>(["sahibinden", "hepsiemlak"]);
  const [hasIskan, setHasIskan] = useState(false);
  const [hasDask, setHasDask] = useState(false);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);

  // ---- Form ----
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: "",
      description: "",
      property_type: "",
      listing_type: "",
      listing_price: 0,
      currency: "TRY",
      aidat: 0,
      city: "",
      district: "",
      neighborhood: "",
      address_detail: "",
      room_count: "",
      bathroom_count: 0,
      gross_sqm: 0,
      net_sqm: 0,
      floor_number: 0,
      total_floors: 0,
      building_age: 0,
      heating_type: "",
      tapu_durumu: "",
      tapu_owner: "",
      ada_no: "",
      parsel_no: "",
      dask_no: "",
    },
  });

  const watchAll = watch();
  const selectedPropertyType = watch("property_type");
  const selectedListingType = watch("listing_type");
  const selectedIl = watch("city");

  // ---- API Queries ----
  const { data: illerData } = useQuery({
    queryKey: ["iller"],
    queryFn: async () => {
      const res = await api.get("/api/v1/locations/iller");
      return res.data?.data || res.data;
    },
  });

  const iller: { id: string; name?: string; il_name?: string }[] =
    illerData?.items || (Array.isArray(illerData) ? illerData : []);

  // Find the selected il's id to fetch ilceler
  const selectedIlObj = iller.find((il) => (il.name || il.il_name) === selectedIl);

  const { data: ilcelerData } = useQuery({
    queryKey: ["ilceler", selectedIlObj?.id],
    queryFn: async () => {
      if (!selectedIlObj?.id) return [];
      const res = await api.get(`/api/v1/locations/iller/${selectedIlObj.id}/ilceler`);
      return res.data?.data || res.data;
    },
    enabled: !!selectedIlObj?.id,
  });

  const ilceler: { id: string; name?: string; ilce_name?: string }[] =
    ilcelerData?.items || (Array.isArray(ilcelerData) ? ilcelerData : []);

  // Fallback location data
  const illerOptions = iller.length > 0
    ? iller.map((il) => il.name || il.il_name || "")
    : ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya"];

  const ilcelerOptions = ilceler.length > 0
    ? ilceler.map((ilce) => ilce.name || ilce.ilce_name || "")
    : [];

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: async (data: PropertyFormValues) => {
      const payload: Record<string, unknown> = {
        title: data.title,
        property_type: data.property_type,
        listing_type: data.listing_type,
        listing_price: data.listing_price,
        currency: data.currency || "TRY",
        city: data.city,
        district: data.district,
        status: "draft",
      };

      if (data.description) payload.description = data.description;
      if (data.aidat && data.aidat > 0) payload.aidat = data.aidat;
      if (data.neighborhood) payload.neighborhood = data.neighborhood;
      if (data.address_detail) payload.address_detail = data.address_detail;
      if (data.room_count) payload.room_count = data.room_count;
      if (data.bathroom_count && data.bathroom_count > 0) payload.bathroom_count = data.bathroom_count;
      if (data.gross_sqm && data.gross_sqm > 0) payload.gross_sqm = data.gross_sqm;
      if (data.net_sqm && data.net_sqm > 0) payload.net_sqm = data.net_sqm;
      if (data.floor_number) payload.floor_number = data.floor_number;
      if (data.total_floors && data.total_floors > 0) payload.total_floors = data.total_floors;
      if (data.building_age != null && data.building_age > 0) payload.building_age = data.building_age;
      if (data.heating_type) payload.heating_type = data.heating_type;
      if (data.tapu_durumu) payload.tapu_durumu = data.tapu_durumu;
      if (data.ada_no) payload.ada_no = data.ada_no;
      if (data.parsel_no) payload.parsel_no = data.parsel_no;

      const allFeats = [...selectedFeatures, ...selectedDisFeatures];
      if (allFeats.length > 0) payload.features = allFeats;

      const res = await api.post("/api/v1/properties", payload);
      return res.data?.data || res.data;
    },
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      if (photos.length === 0) return null;
      const formData = new FormData();
      photos.forEach((p) => formData.append("photos", p.file));
      const res = await api.post(`/api/v1/properties/${propertyId}/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      if (selectedPortals.length === 0) return null;
      const res = await api.post(`/api/v1/properties/${propertyId}/publish`, {
        portals: selectedPortals,
      });
      return res.data;
    },
  });

  // ---- Handlers ----
  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const toggleDisFeature = (feature: string) => {
    setSelectedDisFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const togglePortal = (portalId: string) => {
    setSelectedPortals((prev) =>
      prev.includes(portalId) ? prev.filter((p) => p !== portalId) : [...prev, portalId]
    );
  };

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: PhotoPreview[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newPhotos.push({ file, preview: ev.target?.result as string });
        if (newPhotos.length === files.length) {
          setPhotos((prev) => [...prev, ...newPhotos].slice(0, 20));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePublish(data: PropertyFormValues) {
    try {
      const result = await createMutation.mutateAsync(data);
      const propertyId = result?.id;

      if (propertyId && photos.length > 0) {
        await uploadPhotosMutation.mutateAsync(propertyId);
      }

      if (propertyId && selectedPortals.length > 0) {
        await publishMutation.mutateAsync(propertyId);
      }

      if (propertyId) {
        router.push(`/ilanlar/${propertyId}`);
      } else {
        router.push("/ilanlar");
      }
    } catch {
      // errors are shown in UI
    }
  }

  const isSubmitting = createMutation.isPending || uploadPhotosMutation.isPending || publishMutation.isPending;

  // Helper to get label for a type value
  function getPropertyTypeLabel(val: string): string {
    return propertyTypes.find((t) => t.value === val)?.label || val;
  }
  function getListingTypeLabel(val: string): string {
    return listingTypes.find((t) => t.value === val)?.label || val;
  }
  function getHeatingLabel(val: string): string {
    return heatingOptions.find((t) => t.value === val)?.label || val;
  }

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
        <p className="text-muted-foreground">Adim adim yeni ilan olusturun</p>
      </div>

      {/* Error Message */}
      {(createMutation.isError || uploadPhotosMutation.isError || publishMutation.isError) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Ilan kaydedilirken hata olustu. Lutfen bilgileri kontrol edip tekrar deneyin.
        </div>
      )}

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
                    type="button"
                    className="flex flex-col items-center gap-1.5 px-2"
                    onClick={() => setCurrentStep(step.id)}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                        isCompleted && "border-primary bg-primary text-primary-foreground",
                        isCurrent && "border-primary text-primary",
                        !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground/50"
                      )}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] whitespace-nowrap",
                        isCurrent ? "font-medium text-primary" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-px w-8 sm:w-12 mx-1",
                        step.id < currentStep ? "bg-primary" : "bg-muted-foreground/20"
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
            <CardDescription>Ilanin tur ve temel bilgilerini girin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Property Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Gayrimenkul Tipi *</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {propertyTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={cn(
                      "rounded-lg border p-3 text-sm transition-colors hover:bg-accent",
                      selectedPropertyType === type.value && "border-primary bg-primary/5 font-medium"
                    )}
                    onClick={() => setValue("property_type", type.value)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {errors.property_type && (
                <p className="text-xs text-destructive">{errors.property_type.message}</p>
              )}
            </div>

            {/* Listing Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ilan Tipi *</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {listingTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={cn(
                      "rounded-lg border p-3 text-sm transition-colors hover:bg-accent",
                      selectedListingType === type.value && "border-primary bg-primary/5 font-medium"
                    )}
                    onClick={() => setValue("listing_type", type.value)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {errors.listing_type && (
                <p className="text-xs text-destructive">{errors.listing_type.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="col-span-full space-y-2">
                <label className="text-sm font-medium">Ilan Basligi *</label>
                <Input
                  placeholder="ornegin: Kadikoy Merkez 3+1 Satilik Daire"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>
              <div className="col-span-full space-y-2">
                <label className="text-sm font-medium">Aciklama</label>
                <Textarea
                  placeholder="Ilan hakkinda detayli aciklama yazin..."
                  className="min-h-[120px]"
                  {...register("description")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fiyat (TL) *</label>
                <Input type="number" placeholder="0" {...register("listing_price")} />
                {errors.listing_price && (
                  <p className="text-xs text-destructive">{errors.listing_price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Aidat (TL/ay)</label>
                <Input type="number" placeholder="0" {...register("aidat")} />
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
            <CardDescription>Gayrimenkulun konum bilgilerini girin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Il *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedIl}
                  onChange={(e) => {
                    setValue("city", e.target.value);
                    setValue("district", "");
                  }}
                >
                  <option value="">Il Secin</option>
                  {illerOptions.map((il) => (
                    <option key={il} value={il}>{il}</option>
                  ))}
                </select>
                {errors.city && (
                  <p className="text-xs text-destructive">{errors.city.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ilce *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={watch("district")}
                  onChange={(e) => setValue("district", e.target.value)}
                  disabled={!selectedIl}
                >
                  <option value="">Ilce Secin</option>
                  {ilcelerOptions.map((ilce) => (
                    <option key={ilce} value={ilce}>{ilce}</option>
                  ))}
                </select>
                {errors.district && (
                  <p className="text-xs text-destructive">{errors.district.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mahalle</label>
                <Input placeholder="Mahalle adi" {...register("neighborhood")} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Detayli Adres</label>
              <Textarea placeholder="Cadde, sokak, bina no, daire no..." {...register("address_detail")} />
            </div>

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
            <CardDescription>Gayrimenkulun fiziksel ozelliklerini belirtin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Oda Sayisi</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={watch("room_count") || ""}
                  onChange={(e) => setValue("room_count", e.target.value)}
                >
                  <option value="">Secin</option>
                  {["1+0", "1+1", "2+0", "2+1", "3+1", "3+2", "4+1", "4+2", "5+1", "5+2", "6+"].map((oda) => (
                    <option key={oda} value={oda}>{oda}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Banyo Sayisi</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={watch("bathroom_count") || ""}
                  onChange={(e) => setValue("bathroom_count", Number(e.target.value))}
                >
                  <option value="">Secin</option>
                  {[1, 2, 3, 4, 5].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Brut m2</label>
                <Input type="number" placeholder="0" {...register("gross_sqm")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Net m2</label>
                <Input type="number" placeholder="0" {...register("net_sqm")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bulundugu Kat</label>
                <Input type="number" placeholder="0" {...register("floor_number")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Toplam Kat</label>
                <Input type="number" placeholder="0" {...register("total_floors")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bina Yasi</label>
                <Input type="number" placeholder="0" {...register("building_age")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Isitma</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={watch("heating_type") || ""}
                  onChange={(e) => setValue("heating_type", e.target.value)}
                >
                  <option value="">Secin</option>
                  {heatingOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                    type="button"
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      selectedFeatures.includes(feature)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent"
                    )}
                    onClick={() => toggleFeature(feature)}
                  >
                    {selectedFeatures.includes(feature) && <Check className="mr-1 inline h-3 w-3" />}
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
                    type="button"
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      selectedDisFeatures.includes(feature)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent"
                    )}
                    onClick={() => toggleDisFeature(feature)}
                  >
                    {selectedDisFeatures.includes(feature) && <Check className="mr-1 inline h-3 w-3" />}
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
            <CardDescription>Gayrimenkulun tapu ve resmi belge bilgilerini girin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tapu Durumu</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={watch("tapu_durumu") || ""}
                  onChange={(e) => setValue("tapu_durumu", e.target.value)}
                >
                  <option value="">Secin</option>
                  {tapuTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tapu Sahibi Adi</label>
                <Input placeholder="Tapu uzerindeki isim" {...register("tapu_owner")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ada No</label>
                <Input placeholder="1234" {...register("ada_no")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Parsel No</label>
                <Input placeholder="56" {...register("parsel_no")} />
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
                <Input placeholder="DASK-2026-XXXXXX" {...register("dask_no")} />
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
            <CardDescription>Gayrimenkulun fotograflarini yukleyin (en fazla 20 fotograf)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Area */}
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-12 transition-colors hover:border-muted-foreground/50 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-4 text-sm font-semibold">
                Fotograflari surukleyip birakin
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                veya dosya secmek icin tiklayin
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Dosya Sec
              </Button>
              <p className="mt-2 text-[10px] text-muted-foreground">
                JPG, PNG veya WEBP (maks. 10 MB/fotograf)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotoSelect}
              />
            </div>

            {/* Preview Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo, idx) => (
                  <div key={idx} className="group relative rounded-lg overflow-hidden">
                    <img
                      src={photo.preview}
                      alt={`Fotograf ${idx + 1}`}
                      className="h-32 w-full object-cover"
                    />
                    {idx === 0 && (
                      <Badge className="absolute bottom-2 left-2 text-[10px]">
                        Kapak
                      </Badge>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removePhoto(idx)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {photos.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Henuz fotograf eklenmedi. Ilk fotograf kapak fotografi olarak kullanilir.
              </p>
            )}
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
              <CardDescription>Ilaninizi yayinlamadan once kontrol edin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-4 space-y-4">
                {photos.length > 0 ? (
                  <img
                    src={photos[0].preview}
                    alt="Kapak fotografi"
                    className="h-48 w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">
                    {watchAll.title || "Baslik girilmedi"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {[watchAll.neighborhood, watchAll.district, watchAll.city].filter(Boolean).join(", ") || "Konum girilmedi"}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-primary">
                    {watchAll.listing_price ? formatPrice(Number(watchAll.listing_price)) : "0 TL"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>{getPropertyTypeLabel(watchAll.property_type || "")}</span>
                  <span>{getListingTypeLabel(watchAll.listing_type || "")}</span>
                  {watchAll.room_count && <span>{watchAll.room_count}</span>}
                  {watchAll.net_sqm && Number(watchAll.net_sqm) > 0 && <span>{watchAll.net_sqm} m2</span>}
                  {watchAll.floor_number && <span>{watchAll.floor_number}. Kat</span>}
                  {watchAll.building_age && Number(watchAll.building_age) > 0 && <span>{watchAll.building_age} Yasinda</span>}
                  {watchAll.heating_type && <span>{getHeatingLabel(watchAll.heating_type)}</span>}
                </div>
                {(selectedFeatures.length > 0 || selectedDisFeatures.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {[...selectedFeatures, ...selectedDisFeatures].slice(0, 8).map((f) => (
                      <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                    ))}
                    {selectedFeatures.length + selectedDisFeatures.length > 8 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedFeatures.length + selectedDisFeatures.length - 8} daha
                      </Badge>
                    )}
                  </div>
                )}
                {watchAll.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {watchAll.description}
                  </p>
                )}
                <div className="flex gap-2 text-xs text-muted-foreground border-t pt-3">
                  <span>{photos.length} fotograf</span>
                  {hasIskan && <span>Iskan: Var</span>}
                  {hasDask && <span>DASK: Var</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portal Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portal Secimi</CardTitle>
              <CardDescription>Ilani yayinlamak istediginiz portallari secin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {portalOptions.map((portal) => (
                  <div
                    key={portal.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors",
                      selectedPortals.includes(portal.id) && "border-primary bg-primary/5"
                    )}
                    onClick={() => togglePortal(portal.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">{portal.name}</span>
                    </div>
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border",
                        selectedPortals.includes(portal.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selectedPortals.includes(portal.id) && <Check className="h-3 w-3" />}
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
          type="button"
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri
        </Button>
        {currentStep < 6 ? (
          <Button
            type="button"
            onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
          >
            Ileri
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(handlePublish)}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Yayinla
          </Button>
        )}
      </div>
    </div>
  );
}
