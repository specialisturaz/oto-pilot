"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Trash2,
  Upload,
  Download,
  Loader2,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn, formatPhone, formatPrice, formatRelativeDate, formatDate } from "@/lib/utils";
import api from "@/lib/api";

// ---- Types ----
interface Contact {
  id: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  full_name?: string;
  phone?: string;
  secondary_phone?: string;
  email?: string;
  tc_kimlik_no?: string;
  status?: string;
  contact_type?: string;
  source?: string;
  assigned_to?: { id: string; firstName: string; lastName: string } | null;
  assigned_to_id?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_locations?: string[];
  preferred_property_types?: string[];
  notes?: string;
  company_name?: string;
  city?: string;
  district?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  last_contact_at?: string;
}

interface Activity {
  id: string;
  type?: string;
  description?: string;
  content?: string;
  created_at?: string;
  date?: string;
}

interface Deal {
  id: string;
  title?: string;
  stage?: string;
  price?: number;
  property?: { title?: string } | null;
  created_at?: string;
}

interface PropertyItem {
  id: string;
  title?: string;
  listing_price?: number;
  price?: number;
  location?: string;
  city?: string;
  district?: string;
  room_count?: string;
  rooms?: string;
  net_sqm?: number;
  area?: number;
  status?: string;
}

interface Document {
  id: string;
  name?: string;
  file_name?: string;
  type?: string;
  file_url?: string;
  fileUrl?: string;
  size?: number;
  created_at?: string;
}

// ---- Helpers ----
const statusMap: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  active: { label: "Aktif", variant: "success" },
  aktif: { label: "Aktif", variant: "success" },
  pending: { label: "Beklemede", variant: "warning" },
  beklemede: { label: "Beklemede", variant: "warning" },
  inactive: { label: "Pasif", variant: "secondary" },
  pasif: { label: "Pasif", variant: "secondary" },
};

const contactTypeLabels: Record<string, string> = {
  buyer: "Alici",
  seller: "Satici",
  tenant: "Kiraci",
  landlord: "Ev Sahibi",
  both: "Alici/Satici",
};

const interestColors: Record<string, string> = {
  buyer: "bg-blue-100 text-blue-800",
  seller: "bg-amber-100 text-amber-800",
  tenant: "bg-green-100 text-green-800",
  landlord: "bg-purple-100 text-purple-800",
  both: "bg-red-100 text-red-800",
};

const activityIcons: Record<string, { icon: typeof Phone; color: string }> = {
  call: { icon: Phone, color: "bg-blue-100 text-blue-600" },
  CALL: { icon: Phone, color: "bg-blue-100 text-blue-600" },
  showing: { icon: Eye, color: "bg-emerald-100 text-emerald-600" },
  SHOWING: { icon: Eye, color: "bg-emerald-100 text-emerald-600" },
  email: { icon: Mail, color: "bg-purple-100 text-purple-600" },
  EMAIL: { icon: Mail, color: "bg-purple-100 text-purple-600" },
  note: { icon: FileText, color: "bg-amber-100 text-amber-600" },
  NOTE: { icon: FileText, color: "bg-amber-100 text-amber-600" },
  whatsapp: { icon: MessageSquare, color: "bg-green-100 text-green-600" },
  WHATSAPP: { icon: MessageSquare, color: "bg-green-100 text-green-600" },
  meeting: { icon: Calendar, color: "bg-indigo-100 text-indigo-600" },
  MEETING: { icon: Calendar, color: "bg-indigo-100 text-indigo-600" },
};

function getContactName(c: Contact): string {
  if (c.first_name && c.last_name) return `${c.first_name} ${c.last_name}`;
  if (c.firstName && c.lastName) return `${c.firstName} ${c.lastName}`;
  if (c.full_name) return c.full_name;
  return "Isimsiz";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0/, "").replace(/^90/, "");
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "-";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ---- Component ----
export default function MusteriDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Contact>>({});

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    type: "CALL" as string,
    priority: "MEDIUM" as string,
    due_date: "",
  });

  // ---- Queries ----
  const { data: contact, isLoading: contactLoading, isError: contactError } = useQuery<Contact>({
    queryKey: ["contact", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contacts/${id}`);
      return res.data?.data || res.data;
    },
  });

  const { data: activitiesData } = useQuery({
    queryKey: ["contact-activities", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contacts/${id}/activities`);
      return res.data?.data || res.data;
    },
    enabled: !!contact,
  });

  const { data: dealsData } = useQuery({
    queryKey: ["contact-deals", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contacts/${id}/deals`);
      return res.data?.data || res.data;
    },
    enabled: !!contact,
  });

  const { data: propertiesData } = useQuery({
    queryKey: ["contact-properties", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/properties`, { params: { seller_contact_id: id } });
      return res.data?.data || res.data;
    },
    enabled: !!contact,
  });

  const activities: Activity[] = activitiesData?.items || activitiesData?.activities || (Array.isArray(activitiesData) ? activitiesData : []);
  const deals: Deal[] = dealsData?.items || dealsData?.deals || (Array.isArray(dealsData) ? dealsData : []);
  const properties: PropertyItem[] = propertiesData?.items || propertiesData?.properties || (Array.isArray(propertiesData) ? propertiesData : []);
  const documents: Document[] = (contact as unknown as Record<string, unknown>)?.documents as Document[] || [];

  // ---- Mutations ----
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const res = await api.put(`/api/v1/contacts/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/v1/contacts/${id}`);
    },
    onSuccess: () => {
      router.push("/musteriler");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: typeof taskForm) => {
      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description || undefined,
        type: data.type,
        priority: data.priority,
        contact_id: id,
      };
      if (data.due_date) {
        payload.due_date = new Date(data.due_date).toISOString();
      }
      const res = await api.post("/api/v1/tasks", payload);
      return res.data;
    },
    onSuccess: () => {
      setShowTaskDialog(false);
      setTaskForm({ title: "", description: "", type: "CALL", priority: "MEDIUM", due_date: "" });
      queryClient.invalidateQueries({ queryKey: ["contact-activities", id] });
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
      const res = await api.post(`/api/v1/properties/${id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
    },
  });

  // ---- Handlers ----
  function handleStartEdit() {
    if (!contact) return;
    setEditForm({
      first_name: contact.first_name || contact.firstName || "",
      last_name: contact.last_name || contact.lastName || "",
      phone: contact.phone || "",
      email: contact.email || "",
      tc_kimlik_no: contact.tc_kimlik_no || "",
      contact_type: contact.contact_type || "buyer",
      source: contact.source || "",
      notes: contact.notes || "",
      budget_min: contact.budget_min || undefined,
      budget_max: contact.budget_max || undefined,
    });
    setIsEditing(true);
  }

  function handleSaveEdit() {
    updateMutation.mutate(editForm);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditForm({});
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocMutation.mutate(file);
    }
    e.target.value = "";
  }

  // ---- Loading State ----
  if (contactLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-10 w-96" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Error State ----
  if (contactError || !contact) {
    return (
      <div className="space-y-6">
        <Link
          href="/musteriler"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Musteriler
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">Musteri bulunamadi</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Bu ID ile kayitli musteri bulunamadi veya baglanti hatasi olustu.
            </p>
            <Link href="/musteriler">
              <Button className="mt-4">Musterilere Don</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contactName = getContactName(contact);
  const statusKey = contact.status || "active";
  const status = statusMap[statusKey] || statusMap.active;
  const contactType = contact.contact_type || "buyer";
  const agentName = contact.assigned_to
    ? `${contact.assigned_to.firstName || ""} ${contact.assigned_to.lastName || ""}`.trim()
    : "-";

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
                  {getInitials(contactName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{contactName}</h1>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <Badge className={cn("text-xs", interestColors[contactType])}>
                    {contactTypeLabels[contactType] || contactType}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {contact.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {formatPhone(contact.phone)}
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {contact.email}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {agentName}
                  </div>
                </div>
                {(contact.last_contact_at || contact.created_at) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {contact.last_contact_at
                      ? `Son iletisim: ${formatRelativeDate(contact.last_contact_at)}`
                      : `Kayit: ${formatDate(contact.created_at!)}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {contact.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${contact.phone}`)}
                >
                  <Phone className="mr-2 h-3.5 w-3.5" />
                  Ara
                </Button>
              )}
              {contact.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(`https://wa.me/90${cleanPhone(contact.phone!)}`)
                  }
                >
                  <MessageSquare className="mr-2 h-3.5 w-3.5" />
                  WhatsApp
                </Button>
              )}
              {contact.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`mailto:${contact.email}`)}
                >
                  <Mail className="mr-2 h-3.5 w-3.5" />
                  E-posta
                </Button>
              )}
              <Button size="sm" onClick={() => setShowTaskDialog(true)}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                Gorev Ekle
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Sil
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
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={updateMutation.isPending}
                    >
                      <X className="mr-2 h-3.5 w-3.5" />
                      Iptal
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-3.5 w-3.5" />
                      )}
                      Kaydet
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleStartEdit}>
                    <Edit2 className="mr-2 h-3.5 w-3.5" />
                    Duzenle
                  </Button>
                )}
              </div>
              {updateMutation.isError && (
                <p className="text-sm text-destructive mt-2">
                  Guncelleme sirasinda hata olustu. Lutfen tekrar deneyin.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Ad</label>
                  {isEditing ? (
                    <Input
                      value={editForm.first_name || ""}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{contact.first_name || contact.firstName || "-"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Soyad</label>
                  {isEditing ? (
                    <Input
                      value={editForm.last_name || ""}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{contact.last_name || contact.lastName || "-"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Telefon</label>
                  {isEditing ? (
                    <Input
                      value={editForm.phone || ""}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{contact.phone ? formatPhone(contact.phone) : "-"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">E-posta</label>
                  {isEditing ? (
                    <Input
                      value={editForm.email || ""}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{contact.email || "-"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">TC Kimlik No</label>
                  {isEditing ? (
                    <Input
                      value={editForm.tc_kimlik_no || ""}
                      onChange={(e) => setEditForm({ ...editForm, tc_kimlik_no: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{contact.tc_kimlik_no || "-"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Kaynak</label>
                  <p className="text-sm">{contact.source || "-"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Danisman</label>
                  <p className="text-sm">{agentName}</p>
                </div>
                {contact.company_name && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Sirket</label>
                    <p className="text-sm">{contact.company_name}</p>
                  </div>
                )}
              </div>

              {/* Preferences */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-semibold mb-4">Tercihler</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Butce Araligi</label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={editForm.budget_min || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, budget_min: Number(e.target.value) || undefined })
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={editForm.budget_max || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, budget_max: Number(e.target.value) || undefined })
                          }
                        />
                      </div>
                    ) : (
                      <p className="text-sm">
                        {contact.budget_min || contact.budget_max
                          ? `${contact.budget_min ? formatPrice(contact.budget_min) : "?"} - ${contact.budget_max ? formatPrice(contact.budget_max) : "?"}`
                          : "-"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Tercih Edilen Bolgeler</label>
                    <div className="flex flex-wrap gap-1">
                      {(contact.preferred_locations || []).length > 0 ? (
                        contact.preferred_locations!.map((loc) => (
                          <Badge key={loc} variant="secondary" className="text-xs">
                            {loc}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Tercih Edilen Turler</label>
                    <div className="flex flex-wrap gap-1">
                      {(contact.preferred_property_types || []).length > 0 ? (
                        contact.preferred_property_types!.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-semibold mb-4">Notlar</h3>
                {isEditing ? (
                  <Textarea
                    value={editForm.notes || ""}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {contact.notes || "Not bulunmuyor."}
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
              <CardDescription>Tum iletisim ve islem gecmisi</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="relative space-y-6">
                  <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />
                  {activities.map((activity) => {
                    const actType = activity.type || "note";
                    const iconConfig = activityIcons[actType] || activityIcons.note;
                    const Icon = iconConfig.icon;
                    return (
                      <div key={activity.id} className="relative flex gap-4 pl-0">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full z-10",
                            iconConfig.color
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm">{activity.description || activity.content || "-"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {activity.created_at
                              ? formatRelativeDate(activity.created_at)
                              : activity.date
                                ? formatRelativeDate(activity.date)
                                : "-"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Henuz aktivite bulunmuyor
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ilanlar Tab */}
        <TabsContent value="ilanlar">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Iliskili Ilanlar</CardTitle>
              <CardDescription>Bu musterinin ilgilendigi veya sahip oldugu ilanlar</CardDescription>
            </CardHeader>
            <CardContent>
              {properties.length > 0 ? (
                <div className="space-y-3">
                  {properties.map((property) => (
                    <Link key={property.id} href={`/ilanlar/${property.id}`}>
                      <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Building2 className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium">{property.title || "-"}</h4>
                            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{property.city && property.district ? `${property.district}, ${property.city}` : property.location || "-"}</span>
                              <span>{property.room_count || property.rooms || "-"}</span>
                              <span>{(property.net_sqm || property.area || 0) > 0 ? `${property.net_sqm || property.area} m2` : ""}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-primary">
                            {formatPrice(property.listing_price || property.price || 0)}
                          </p>
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            {property.status || "aktif"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Building2 className="h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Henuz iliskili ilan bulunmuyor
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anlasmalar Tab */}
        <TabsContent value="anlasmalar">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anlasmalar</CardTitle>
              <CardDescription>Bu musteriyle ilgili satis surecleri</CardDescription>
            </CardHeader>
            <CardContent>
              {deals.length > 0 ? (
                <div className="space-y-3">
                  {deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <h4 className="text-sm font-medium">
                          {deal.title || deal.property?.title || "Anlasma"}
                        </h4>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="info">{deal.stage || "-"}</Badge>
                          {deal.created_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(deal.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      {deal.price && (
                        <p className="text-sm font-bold text-primary">
                          {formatPrice(deal.price)}
                        </p>
                      )}
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
                  <CardDescription>Bu musteriyle iliskili belgeler</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadDocMutation.isPending}
                >
                  {uploadDocMutation.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-3.5 w-3.5" />
                  )}
                  Belge Yukle
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-muted">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{doc.name || doc.file_name || "Belge"}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {doc.type && (
                              <Badge variant="secondary" className="text-[10px]">
                                {doc.type}
                              </Badge>
                            )}
                            {doc.created_at && <span>{formatDate(doc.created_at)}</span>}
                            <span>{formatFileSize(doc.size)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = doc.file_url || doc.fileUrl;
                          if (url) window.open(url, "_blank");
                        }}
                      >
                        <Download className="mr-2 h-3.5 w-3.5" />
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

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Gorev Ekle</DialogTitle>
            <DialogDescription>
              Bu musteri icin yeni bir gorev olusturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gorev Basligi *</label>
              <Input
                placeholder="Gorev basligi"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Aciklama</label>
              <Textarea
                placeholder="Gorev aciklamasi..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tur</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={taskForm.type}
                  onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                >
                  <option value="CALL">Arama</option>
                  <option value="MEETING">Toplanti</option>
                  <option value="SHOWING">Gosterim</option>
                  <option value="FOLLOWUP">Takip</option>
                  <option value="DOCUMENT">Belge</option>
                  <option value="OTHER">Diger</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Oncelik</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                >
                  <option value="LOW">Dusuk</option>
                  <option value="MEDIUM">Normal</option>
                  <option value="HIGH">Yuksek</option>
                  <option value="URGENT">Acil</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bitis Tarihi</label>
              <Input
                type="datetime-local"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              />
            </div>
          </div>
          {createTaskMutation.isError && (
            <p className="text-sm text-destructive">Gorev olusturulurken hata olustu.</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Iptal</Button>
            </DialogClose>
            <Button
              onClick={() => createTaskMutation.mutate(taskForm)}
              disabled={!taskForm.title || createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Olustur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Musteriyi Sil</DialogTitle>
            <DialogDescription>
              &quot;{contactName}&quot; isimli musteriyi silmek istediginizden emin misiniz?
              Bu islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">Silme islemi sirasinda hata olustu.</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Iptal</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
