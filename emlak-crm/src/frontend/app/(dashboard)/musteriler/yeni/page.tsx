"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Plus,
  User,
  Building2,
  Phone,
  Mail,
  DollarSign,
  X,
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
import { cn } from "@/lib/utils";
import api from "@/lib/api";

// ---- Zod Schema ----
const contactFormSchema = z.object({
  first_name: z.string().min(2, "Ad en az 2 karakter olmali").max(50),
  last_name: z.string().min(2, "Soyad en az 2 karakter olmali").max(50),
  phone: z
    .string()
    .min(1, "Telefon numarasi gerekli")
    .regex(/^(\+90|0)?[0-9]{10,11}$/, "Gecerli bir telefon numarasi giriniz"),
  email: z
    .string()
    .email("Gecerli bir e-posta giriniz")
    .optional()
    .or(z.literal("")),
  tc_kimlik_no: z
    .string()
    .optional()
    .or(z.literal("")),
  company_name: z.string().max(100).optional().or(z.literal("")),
  contact_type: z.enum(["buyer", "seller", "tenant", "landlord", "both"]),
  source: z
    .enum([
      "website",
      "sahibinden",
      "hepsiemlak",
      "emlakjet",
      "referral",
      "walk_in",
      "phone",
      "whatsapp",
      "social_media",
      "other",
    ])
    .optional(),
  assigned_to_id: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  budget_min: z.coerce.number().min(0).optional().or(z.literal(0)),
  budget_max: z.coerce.number().min(0).optional().or(z.literal(0)),
  preferred_locations: z.array(z.string()).optional(),
  preferred_property_types: z.array(z.string()).optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

// ---- Constants ----
type ContactKind = "bireysel" | "kurumsal";
type InterestType = "buyer" | "seller" | "tenant" | "landlord" | "both";

const interestTypes: { id: InterestType; label: string }[] = [
  { id: "buyer", label: "Alici" },
  { id: "seller", label: "Satici" },
  { id: "tenant", label: "Kiraci" },
  { id: "landlord", label: "Ev Sahibi" },
  { id: "both", label: "Alici/Satici" },
];

const sourceOptions: { value: string; label: string }[] = [
  { value: "sahibinden", label: "Portal (Sahibinden)" },
  { value: "hepsiemlak", label: "Portal (Hepsiemlak)" },
  { value: "emlakjet", label: "Portal (Emlakjet)" },
  { value: "referral", label: "Referans" },
  { value: "walk_in", label: "Yuruyerek" },
  { value: "website", label: "Web Sitesi" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Telefon" },
  { value: "social_media", label: "Sosyal Medya" },
  { value: "other", label: "Diger" },
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

// ---- Component ----
export default function YeniMusteriPage() {
  const router = useRouter();
  const [contactKind, setContactKind] = useState<ContactKind>("bireysel");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  // ---- Form ----
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      tc_kimlik_no: "",
      company_name: "",
      contact_type: "buyer",
      source: undefined,
      assigned_to_id: "",
      notes: "",
      budget_min: 0,
      budget_max: 0,
      preferred_locations: [],
      preferred_property_types: [],
    },
  });

  const selectedInterest = watch("contact_type");

  // ---- API Queries ----
  const { data: agentsData } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await api.get("/api/v1/users/agents");
      return res.data?.data || res.data;
    },
  });

  const { data: illerData } = useQuery({
    queryKey: ["iller"],
    queryFn: async () => {
      const res = await api.get("/api/v1/locations/iller");
      return res.data?.data || res.data;
    },
  });

  const agents: { id: string; firstName?: string; lastName?: string; first_name?: string; last_name?: string }[] =
    agentsData?.items || agentsData?.agents || (Array.isArray(agentsData) ? agentsData : []);

  const iller: { id: string; name?: string; il_name?: string }[] =
    illerData?.items || (Array.isArray(illerData) ? illerData : []);

  // Use iller for location options, or fallback to hardcoded
  const locationOptions = iller.length > 0
    ? iller.map((il) => il.name || il.il_name || "")
    : [
        "Kadikoy", "Besiktas", "Atasehir", "Uskudar", "Bakirkoy",
        "Sisli", "Maltepe", "Pendik", "Beylikduzu", "Kartal",
        "Umraniye", "Sariyer", "Fatih", "Beyoglu",
      ];

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      const payload: Record<string, unknown> = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        contact_type: data.contact_type,
      };
      if (data.email) payload.email = data.email;
      if (data.tc_kimlik_no) payload.tc_kimlik_no = data.tc_kimlik_no;
      if (data.company_name) payload.company_name = data.company_name;
      if (data.source) payload.source = data.source;
      if (data.assigned_to_id) payload.assigned_to_id = data.assigned_to_id;
      if (data.notes) payload.notes = data.notes;
      if (data.budget_min && data.budget_min > 0) payload.budget_min = data.budget_min;
      if (data.budget_max && data.budget_max > 0) payload.budget_max = data.budget_max;
      if (selectedLocations.length > 0) payload.preferred_locations = selectedLocations;
      if (selectedPropertyTypes.length > 0) payload.preferred_property_types = selectedPropertyTypes;

      const res = await api.post("/api/v1/contacts", payload);
      return res.data?.data || res.data;
    },
  });

  // ---- Handlers ----
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

  function onSubmit(data: ContactFormValues) {
    createMutation.mutate(data, {
      onSuccess: (result) => {
        const newId = result?.id;
        if (newId) {
          router.push(`/musteriler/${newId}`);
        } else {
          router.push("/musteriler");
        }
      },
    });
  }

  function onSubmitAndNew(data: ContactFormValues) {
    createMutation.mutate(data, {
      onSuccess: () => {
        reset();
        setSelectedLocations([]);
        setSelectedPropertyTypes([]);
        setSuccessMessage("Musteri basariyla kaydedildi!");
        setTimeout(() => setSuccessMessage(""), 3000);
      },
    });
  }

  return (
    <form className="space-y-6">
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
        <h1 className="text-2xl font-bold tracking-tight">Yeni Musteri Ekle</h1>
        <p className="text-muted-foreground">Yeni musteri kaydi olusturun</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {createMutation.isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Musteri kaydedilirken hata olustu. Lutfen bilgileri kontrol edip tekrar deneyin.
        </div>
      )}

      {/* Contact Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Musteri Tipi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <button
              type="button"
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent",
                contactKind === "bireysel" && "border-primary bg-primary/5"
              )}
              onClick={() => setContactKind("bireysel")}
            >
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium">Bireysel</p>
                <p className="text-[10px] text-muted-foreground">Gercek kisi</p>
              </div>
            </button>
            <button
              type="button"
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent",
                contactKind === "kurumsal" && "border-primary bg-primary/5"
              )}
              onClick={() => setContactKind("kurumsal")}
            >
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium">Kurumsal</p>
                <p className="text-[10px] text-muted-foreground">Sirket/kurum</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {contactKind === "bireysel" ? "Kisisel Bilgiler" : "Kurum Bilgileri"}
          </CardTitle>
          <CardDescription>
            {contactKind === "bireysel"
              ? "Musterinin temel iletisim bilgileri"
              : "Kurumun temel bilgileri ve yetkili kisi"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {contactKind === "bireysel" ? "Ad" : "Yetkili Adi"} <span className="text-destructive">*</span>
              </label>
              <Input placeholder="Adi" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {contactKind === "bireysel" ? "Soyad" : "Yetkili Soyadi"} <span className="text-destructive">*</span>
              </label>
              <Input placeholder="Soyadi" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>
            {contactKind === "kurumsal" && (
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">
                  Sirket Adi
                </label>
                <Input placeholder="Sirket adi" {...register("company_name")} />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Telefon <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="05XX XXX XX XX" className="pl-9" {...register("phone")} />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="ornek@email.com" className="pl-9" {...register("email")} />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {contactKind === "bireysel" ? "TC Kimlik No" : "Vergi No"}
              </label>
              <Input
                placeholder={contactKind === "bireysel" ? "XXXXXXXXXXX" : "XXXXXXXXXX"}
                {...register("tc_kimlik_no")}
              />
              {errors.tc_kimlik_no && (
                <p className="text-xs text-destructive">{errors.tc_kimlik_no.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interest Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ilgi Alani</CardTitle>
          <CardDescription>Musteri ne ile ilgileniyor?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {interestTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm transition-colors hover:bg-accent",
                  selectedInterest === type.id && "border-primary bg-primary/5 font-medium"
                )}
                onClick={() => setValue("contact_type", type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
          {errors.contact_type && (
            <p className="text-xs text-destructive mt-2">{errors.contact_type.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      {(selectedInterest === "buyer" ||
        selectedInterest === "tenant" ||
        selectedInterest === "both") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tercihler</CardTitle>
            <CardDescription>Musterinin gayrimenkul tercihleri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Budget */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum Butce (TL)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="number" placeholder="0" className="pl-9" {...register("budget_min")} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Maksimum Butce (TL)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="number" placeholder="0" className="pl-9" {...register("budget_max")} />
                </div>
              </div>
            </div>

            {/* Preferred Locations */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Tercih Edilen Bolgeler</label>
              <div className="flex flex-wrap gap-2">
                {locationOptions.map((loc) => (
                  <button
                    key={loc}
                    type="button"
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
              <label className="text-sm font-medium">Tercih Edilen Gayrimenkul Turleri</label>
              <div className="flex flex-wrap gap-2">
                {propertyTypeOptions.map((type) => (
                  <button
                    key={type}
                    type="button"
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
          <CardDescription>Musteri kaynagi ve sorumlu danisman</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Musteri Kaynagi
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register("source")}
              >
                <option value="">Kaynak Secin</option>
                {sourceOptions.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sorumlu Danisman</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register("assigned_to_id")}
              >
                <option value="">Danisman Secin</option>
                {agents.map((agent) => {
                  const name = `${agent.firstName || agent.first_name || ""} ${agent.lastName || agent.last_name || ""}`.trim();
                  return (
                    <option key={agent.id} value={agent.id}>
                      {name || agent.id}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notlar</CardTitle>
          <CardDescription>Musteri hakkinda ek bilgiler ve notlar</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Musteri hakkinda notlarinizi buraya yazin..."
            className="min-h-[120px]"
            {...register("notes")}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link href="/musteriler">
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            Iptal
          </Button>
        </Link>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={createMutation.isPending}
          onClick={handleSubmit(onSubmitAndNew)}
        >
          {createMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Kaydet ve Yeni Ekle
        </Button>
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={createMutation.isPending}
          onClick={handleSubmit(onSubmit)}
        >
          {createMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Kaydet
        </Button>
      </div>
    </form>
  );
}
