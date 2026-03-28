"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  AlertCircle,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

// ─── Types ──────────────────────────────────────────────

interface OfficeData {
  name: string;
  phone: string;
  email: string;
  taxNumber: string;
  address: string;
  buyerCommission: string;
  sellerCommission: string;
  rentalCommission: string;
}

interface UserData {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  status?: string;
  isActive?: boolean;
}

interface PortalData {
  id: string;
  name: string;
  connected?: boolean;
  isActive?: boolean;
  apiKey?: string;
}

interface TemplateData {
  id: string;
  name: string;
  channel: string;
  preview?: string;
  content?: string;
}

interface NotifSetting {
  event: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

// ─── Fallback mock data ──────────────────────────────────

const fallbackUsers: UserData[] = [
  { id: "1", name: "Mehmet Yildiz", email: "mehmet@emlakcrm.com", role: "Admin", status: "aktif" },
  { id: "2", name: "Ayse Kara", email: "ayse@emlakcrm.com", role: "Yonetici", status: "aktif" },
  { id: "3", name: "Mehmet Danisman", email: "mehmetd@emlakcrm.com", role: "Danisman", status: "aktif" },
  { id: "4", name: "Ayse Danisman", email: "aysed@emlakcrm.com", role: "Danisman", status: "aktif" },
  { id: "5", name: "Selin Korkmaz", email: "selin@emlakcrm.com", role: "Sekreter", status: "pasif" },
];

const fallbackTemplates: TemplateData[] = [
  { id: "1", name: "Hos Geldiniz Mesaji", channel: "WhatsApp", preview: "Merhaba {isim}, emlak ofisimize hos geldiniz..." },
  { id: "2", name: "Gosterim Hatirlatma", channel: "SMS", preview: "Sayil {isim}, yarin saat {saat} gosterim randevunuz..." },
  { id: "3", name: "Fiyat Guncelleme", channel: "E-posta", preview: "Sayin {isim}, ilgilendiginiz {ilan} ilani icin fiyat..." },
  { id: "4", name: "Teklif Bildirimi", channel: "WhatsApp", preview: "Merhaba {isim}, ilaniniz icin yeni bir teklif aldi..." },
];

const defaultNotifications: NotifSetting[] = [
  { event: "Yeni musteri kaydi", email: true, sms: false, push: true },
  { event: "Yeni teklif", email: true, sms: true, push: true },
  { event: "Gosterim hatirlatma", email: true, sms: true, push: true },
  { event: "Tapu randevusu", email: true, sms: true, push: true },
  { event: "Portal senkronizasyon hatasi", email: true, sms: false, push: true },
  { event: "Sozlesme suresi dolum", email: true, sms: true, push: false },
  { event: "DASK suresi dolum", email: true, sms: false, push: true },
];

const roleColors: Record<string, string> = {
  Admin: "bg-red-100 text-red-800",
  ADMIN: "bg-red-100 text-red-800",
  Yonetici: "bg-purple-100 text-purple-800",
  MANAGER: "bg-purple-100 text-purple-800",
  Danisman: "bg-blue-100 text-blue-800",
  AGENT: "bg-blue-100 text-blue-800",
  Sekreter: "bg-gray-100 text-gray-800",
  SECRETARY: "bg-gray-100 text-gray-800",
};

const roleDisplayMap: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Yonetici",
  AGENT: "Danisman",
  SECRETARY: "Sekreter",
};

interface MessagingChannelConfig {
  whatsappApiToken: string;
  whatsappPhoneNumberId: string;
  whatsappWebhookVerifyToken: string;
  netgsmUsercode: string;
  netgsmPassword: string;
  netgsmSender: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
}

const tabItems = [
  { id: "ofis", label: "Ofis Bilgileri", icon: Building2 },
  { id: "kullanicilar", label: "Kullanicilar", icon: Users },
  { id: "mesajlasma", label: "Mesajlasma Ayarlari", icon: MessageSquare },
  { id: "portal", label: "Portal Ayarlari", icon: Globe },
  { id: "sablonlar", label: "Mesaj Sablonlari", icon: MessageSquare },
  { id: "bildirimler", label: "Bildirimler", icon: Bell },
  { id: "kvkk", label: "KVKK", icon: Shield },
];

export default function AyarlarPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Office state
  const [officeForm, setOfficeForm] = useState<OfficeData>({
    name: "Emlak CRM Gayrimenkul",
    phone: "0 (212) 555 00 00",
    email: "info@emlakcrm.com",
    taxNumber: "1234567890",
    address: "Besiktas, Istanbul",
    buyerCommission: "2",
    sellerCommission: "2",
    rentalCommission: "1 aylik kira",
  });

  // Notifications state
  const [notifications, setNotifications] = useState<NotifSetting[]>(defaultNotifications);

  // User form state
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "Danisman", password: "" });
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Template form state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", channel: "WhatsApp", content: "" });
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // Portal test results
  const [portalTestResults, setPortalTestResults] = useState<Record<string, "success" | "error" | "loading">>({});

  // KVKK state
  const [kvkkForm, setKvkkForm] = useState({
    customerRetention: "36",
    messageRetention: "24",
    logRetention: "12",
    documentRetention: "60",
    consentText: "6698 sayili Kisisel Verilerin Korunmasi Kanunu kapsaminda, kisisel verileriniz emlak danismanlik hizmeti sunulmasi amaciyla islenmektedir. Detayli bilgi icin aydinlatma metnimizi inceleyiniz.",
  });
  const [deleteExpiredDialogOpen, setDeleteExpiredDialogOpen] = useState(false);

  // Messaging channel config state
  const [msgConfig, setMsgConfig] = useState<MessagingChannelConfig>({
    whatsappApiToken: "",
    whatsappPhoneNumberId: "",
    whatsappWebhookVerifyToken: "",
    netgsmUsercode: "",
    netgsmPassword: "",
    netgsmSender: "",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    smtpFrom: "",
  });
  const [msgTestResults, setMsgTestResults] = useState<Record<string, "success" | "error" | "loading">>({});

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }, []);

  // ─── Office API ───────────────────────────────────────
  const { isLoading: officeLoading } = useQuery({
    queryKey: ["settings-office"],
    queryFn: async () => {
      const res = await api.get("/api/v1/settings/office");
      const d = res.data?.data || res.data;
      if (d) {
        setOfficeForm({
          name: d.name || d.officeName || officeForm.name,
          phone: d.phone || officeForm.phone,
          email: d.email || officeForm.email,
          taxNumber: d.taxNumber || d.tax_number || officeForm.taxNumber,
          address: d.address || officeForm.address,
          buyerCommission: String(d.buyerCommission ?? d.buyer_commission ?? officeForm.buyerCommission),
          sellerCommission: String(d.sellerCommission ?? d.seller_commission ?? officeForm.sellerCommission),
          rentalCommission: d.rentalCommission || d.rental_commission || officeForm.rentalCommission,
        });
      }
      return d;
    },
    retry: 1,
  });

  const saveOfficeMutation = useMutation({
    mutationFn: async () => {
      await api.put("/api/v1/settings/office", officeForm);
    },
    onSuccess: () => showSuccess("Ofis bilgileri kaydedildi."),
    onError: () => showError("Ofis bilgileri kaydedilemedi."),
  });

  // ─── Messaging Config API ──────────────────────────────
  const { isLoading: msgConfigLoading } = useQuery({
    queryKey: ["messaging-config"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/settings/messaging");
        const d = res.data?.data || res.data;
        if (d) {
          setMsgConfig((prev) => ({
            ...prev,
            whatsappApiToken: d.whatsappApiToken || d.whatsapp_api_token || "",
            whatsappPhoneNumberId: d.whatsappPhoneNumberId || d.whatsapp_phone_number_id || "",
            whatsappWebhookVerifyToken: d.whatsappWebhookVerifyToken || d.whatsapp_webhook_verify_token || "",
            netgsmUsercode: d.netgsmUsercode || d.netgsm_usercode || "",
            netgsmPassword: d.netgsmPassword || d.netgsm_password || "",
            netgsmSender: d.netgsmSender || d.netgsm_sender || "",
            smtpHost: d.smtpHost || d.smtp_host || "",
            smtpPort: d.smtpPort || d.smtp_port || "587",
            smtpUser: d.smtpUser || d.smtp_user || "",
            smtpPassword: d.smtpPassword || d.smtp_password || "",
            smtpFrom: d.smtpFrom || d.smtp_from || "",
          }));
        }
        return d;
      } catch {
        return null;
      }
    },
    retry: 0,
  });

  const saveMsgConfigMutation = useMutation({
    mutationFn: async () => {
      await api.put("/api/v1/settings/messaging", msgConfig);
    },
    onSuccess: () => showSuccess("Mesajlasma ayarlari kaydedildi."),
    onError: () => showError("Mesajlasma ayarlari kaydedilemedi."),
  });

  const handleMsgChannelTest = useCallback(async (channel: string) => {
    setMsgTestResults((prev) => ({ ...prev, [channel]: "loading" }));
    try {
      await api.post("/api/v1/settings/messaging/test", { channel });
      setMsgTestResults((prev) => ({ ...prev, [channel]: "success" }));
    } catch {
      setMsgTestResults((prev) => ({ ...prev, [channel]: "error" }));
    }
    setTimeout(() => {
      setMsgTestResults((prev) => {
        const next = { ...prev };
        delete next[channel];
        return next;
      });
    }, 5000);
  }, []);

  const isWhatsappConfigured = !!(msgConfig.whatsappApiToken && msgConfig.whatsappPhoneNumberId);
  const isSmsConfigured = !!(msgConfig.netgsmUsercode && msgConfig.netgsmPassword);
  const isEmailConfigured = !!(msgConfig.smtpHost && msgConfig.smtpUser);

  // ─── Users API ────────────────────────────────────────
  const { data: usersData, isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/api/v1/users");
      return res.data?.data || res.data;
    },
    retry: 1,
  });

  const users: UserData[] = (
    usersError
      ? fallbackUsers
      : Array.isArray(usersData) ? usersData : usersData?.items || usersData?.users || fallbackUsers
  ).map((u: UserData) => ({
    ...u,
    name: u.name || (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.firstName || "Bilinmeyen"),
    status: u.status || (u.isActive === false ? "pasif" : "aktif"),
  }));

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof userForm) => {
      await api.post("/api/v1/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setUserDialogOpen(false);
      showSuccess("Kullanici olusturuldu.");
    },
    onError: () => showError("Kullanici olusturulamadi."),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof userForm }) => {
      await api.put(`/api/v1/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setUserDialogOpen(false);
      setEditingUser(null);
      showSuccess("Kullanici guncellendi.");
    },
    onError: () => showError("Kullanici guncellenemedi."),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccess("Kullanici silindi.");
    },
    onError: () => showError("Kullanici silinemedi."),
  });

  // ─── Portals API ──────────────────────────────────────
  const { data: portalsData, isLoading: portalsLoading, isError: portalsError } = useQuery({
    queryKey: ["portals"],
    queryFn: async () => {
      const res = await api.get("/api/v1/portals");
      return res.data?.data || res.data;
    },
    retry: 1,
  });

  const portals: PortalData[] = portalsError
    ? [
        { id: "1", name: "Sahibinden.com", connected: true },
        { id: "2", name: "Hepsiemlak.com", connected: true },
        { id: "3", name: "Emlakjet.com", connected: true },
        { id: "4", name: "Zingat.com", connected: false },
      ]
    : (Array.isArray(portalsData) ? portalsData : portalsData?.items || portalsData?.portals || []).map((p: PortalData) => ({
        ...p,
        connected: p.connected ?? p.isActive ?? false,
      }));

  const handlePortalTest = useCallback(async (portalId: string) => {
    setPortalTestResults((prev) => ({ ...prev, [portalId]: "loading" }));
    try {
      await api.post(`/api/v1/portals/${portalId}/test-connection`);
      setPortalTestResults((prev) => ({ ...prev, [portalId]: "success" }));
    } catch {
      setPortalTestResults((prev) => ({ ...prev, [portalId]: "error" }));
    }
    setTimeout(() => {
      setPortalTestResults((prev) => {
        const next = { ...prev };
        delete next[portalId];
        return next;
      });
    }, 5000);
  }, []);

  // ─── Templates API ────────────────────────────────────
  const { data: templatesData, isLoading: templatesLoading, isError: templatesError } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await api.get("/api/v1/settings/templates");
      return res.data?.data || res.data;
    },
    retry: 1,
  });

  const templates: TemplateData[] = templatesError
    ? fallbackTemplates
    : Array.isArray(templatesData) ? templatesData : templatesData?.items || templatesData?.templates || fallbackTemplates;

  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof templateForm) => {
      await api.post("/api/v1/settings/templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setTemplateDialogOpen(false);
      showSuccess("Sablon olusturuldu.");
    },
    onError: () => showError("Sablon olusturulamadi."),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof templateForm }) => {
      await api.put(`/api/v1/settings/templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      showSuccess("Sablon guncellendi.");
    },
    onError: () => showError("Sablon guncellenemedi."),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/settings/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      showSuccess("Sablon silindi.");
    },
    onError: () => showError("Sablon silinemedi."),
  });

  // ─── Notifications API ────────────────────────────────
  const { isLoading: notifsLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await api.get("/api/v1/settings/notifications");
      const d = res.data?.data || res.data;
      if (Array.isArray(d) && d.length > 0) {
        setNotifications(d);
      }
      return d;
    },
    retry: 1,
  });

  const saveNotifsMutation = useMutation({
    mutationFn: async () => {
      await api.put("/api/v1/settings/notifications", { preferences: notifications });
    },
    onSuccess: () => showSuccess("Bildirim tercihleri kaydedildi."),
    onError: () => showError("Bildirim tercihleri kaydedilemedi."),
  });

  const toggleNotification = (index: number, channel: "email" | "sms" | "push") => {
    setNotifications((prev) =>
      prev.map((n, i) =>
        i === index ? { ...n, [channel]: !n[channel] } : n
      )
    );
  };

  // ─── KVKK API ─────────────────────────────────────────
  const saveKvkkMutation = useMutation({
    mutationFn: async () => {
      await api.put("/api/v1/settings/kvkk", kvkkForm);
    },
    onSuccess: () => showSuccess("KVKK ayarlari kaydedildi."),
    onError: () => showError("KVKK ayarlari kaydedilemedi."),
  });

  const handleExportData = useCallback(async (format: "json" | "csv") => {
    try {
      const res = await api.get(`/api/v1/settings/export?format=${format}`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: format === "json" ? "application/json" : "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `veri-aktarim.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showError("Veri aktarimi basarisiz.");
    }
  }, [showError]);

  const deleteExpiredMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/v1/settings/delete-expired");
    },
    onSuccess: () => {
      setDeleteExpiredDialogOpen(false);
      showSuccess("Suresi dolan veriler silindi.");
    },
    onError: () => showError("Silme islemi basarisiz."),
  });

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={(open) => { setUserDialogOpen(open); if (!open) setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Kullanici Duzenle" : "Yeni Kullanici Ekle"}</DialogTitle>
            <DialogDescription>Kullanici bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ad Soyad</label>
              <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="Ad Soyad" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-posta</label>
              <Input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="E-posta" type="email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rol</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              >
                <option value="Admin">Admin</option>
                <option value="Yonetici">Yonetici</option>
                <option value="Danisman">Danisman</option>
                <option value="Sekreter">Sekreter</option>
              </select>
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Sifre</label>
                <Input value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Sifre" type="password" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUserDialogOpen(false); setEditingUser(null); }}>Iptal</Button>
            <Button
              onClick={() => {
                if (editingUser) {
                  updateUserMutation.mutate({ id: editingUser.id, data: userForm });
                } else {
                  createUserMutation.mutate(userForm);
                }
              }}
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {(createUserMutation.isPending || updateUserMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingUser ? "Guncelle" : "Olustur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullaniciyi Sil</DialogTitle>
            <DialogDescription>Bu kullaniciyi silmek istediginizden emin misiniz?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserDialogOpen(false)}>Iptal</Button>
            <Button variant="destructive" onClick={() => { if (userToDelete) deleteUserMutation.mutate(userToDelete); setDeleteUserDialogOpen(false); }}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={(open) => { setTemplateDialogOpen(open); if (!open) setEditingTemplate(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Sablon Duzenle" : "Yeni Sablon"}</DialogTitle>
            <DialogDescription>Mesaj sablonu bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sablon Adi</label>
              <Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Sablon adi" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kanal</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={templateForm.channel}
                onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value })}
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="E-posta">E-posta</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Icerik</label>
              <Textarea
                value={templateForm.content}
                onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                placeholder="Mesaj icerigi... {isim}, {ilan}, {saat} gibi degiskenler kullanabilirsiniz."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTemplateDialogOpen(false); setEditingTemplate(null); }}>Iptal</Button>
            <Button
              onClick={() => {
                if (editingTemplate) {
                  updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateForm });
                } else {
                  createTemplateMutation.mutate(templateForm);
                }
              }}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTemplate ? "Guncelle" : "Olustur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Dialog */}
      <Dialog open={deleteTemplateDialogOpen} onOpenChange={setDeleteTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sablonu Sil</DialogTitle>
            <DialogDescription>Bu sablonu silmek istediginizden emin misiniz?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTemplateDialogOpen(false)}>Iptal</Button>
            <Button variant="destructive" onClick={() => { if (templateToDelete) deleteTemplateMutation.mutate(templateToDelete); setDeleteTemplateDialogOpen(false); }}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expired Data Dialog */}
      <Dialog open={deleteExpiredDialogOpen} onOpenChange={setDeleteExpiredDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suresi Dolan Verileri Sil</DialogTitle>
            <DialogDescription>
              Saklama suresi dolan tum verileri kalici olarak silmek istediginizden emin misiniz? Bu islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteExpiredDialogOpen(false)}>Iptal</Button>
            <Button variant="destructive" onClick={() => deleteExpiredMutation.mutate()} disabled={deleteExpiredMutation.isPending}>
              {deleteExpiredMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {officeLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
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
                      <Input value={officeForm.name} onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Telefon</label>
                      <Input value={officeForm.phone} onChange={(e) => setOfficeForm({ ...officeForm, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">E-posta</label>
                      <Input value={officeForm.email} onChange={(e) => setOfficeForm({ ...officeForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vergi No</label>
                      <Input value={officeForm.taxNumber} onChange={(e) => setOfficeForm({ ...officeForm, taxNumber: e.target.value })} />
                    </div>
                    <div className="col-span-full space-y-2">
                      <label className="text-sm font-medium">Adres</label>
                      <Textarea value={officeForm.address} onChange={(e) => setOfficeForm({ ...officeForm, address: e.target.value })} />
                    </div>
                  </div>

                  {/* Commission Rates */}
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-semibold mb-4">
                      Komisyon Oranlari
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Alici Komisyonu (%)</label>
                        <Input type="number" value={officeForm.buyerCommission} onChange={(e) => setOfficeForm({ ...officeForm, buyerCommission: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Satici Komisyonu (%)</label>
                        <Input type="number" value={officeForm.sellerCommission} onChange={(e) => setOfficeForm({ ...officeForm, sellerCommission: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Kira Komisyonu</label>
                        <Input value={officeForm.rentalCommission} onChange={(e) => setOfficeForm({ ...officeForm, rentalCommission: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => saveOfficeMutation.mutate()} disabled={saveOfficeMutation.isPending}>
                      {saveOfficeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Kaydet
                    </Button>
                  </div>
                </div>
              )}
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
                <Button onClick={() => {
                  setEditingUser(null);
                  setUserForm({ name: "", email: "", role: "Danisman", password: "" });
                  setUserDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Kullanici Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 py-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ad Soyad</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">E-posta</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rol</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Durum</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Islemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map((user) => {
                        const displayRole = roleDisplayMap[user.role] || user.role;
                        return (
                          <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium">{user.name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-muted-foreground">{user.email}</span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={cn("text-xs", roleColors[user.role] || roleColors[displayRole] || "bg-gray-100 text-gray-800")}>
                                {displayRole}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={user.status === "aktif" ? "success" : "secondary"}>
                                {user.status === "aktif" ? "Aktif" : "Pasif"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setUserForm({
                                      name: user.name || "",
                                      email: user.email,
                                      role: roleDisplayMap[user.role] || user.role,
                                      password: "",
                                    });
                                    setUserDialogOpen(true);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => {
                                    setUserToDelete(user.id);
                                    setDeleteUserDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mesajlasma Ayarlari Tab */}
        <TabsContent value="mesajlasma">
          <div className="space-y-4">
            {/* Internal messaging info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dahili Mesajlasma</CardTitle>
                <CardDescription>
                  CRM ici dahili mesajlasma sistemi her zaman aktiftir. Hicbir yapilandirma gerektirmez.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Aktif</p>
                    <p className="text-xs text-emerald-600">
                      Dahili mesajlasma sistemi her zaman aktiftir. Mesajlar sayfasindan musterilerinize dahili mesaj gonderebilirsiniz.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Config */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">WhatsApp Business API</CardTitle>
                    <CardDescription>
                      WhatsApp uzerinden mesaj gonderebilmek icin Meta Business API bilgilerinizi girin
                    </CardDescription>
                  </div>
                  <Badge className={isWhatsappConfigured ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                    {isWhatsappConfigured ? "Aktif" : "Yapilandirilmamis"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-sm text-foreground">Kurulum Adimlari:</p>
                    <p>1. Meta Business Suite'e gidin: business.facebook.com</p>
                    <p>2. WhatsApp Business hesabi olusturun veya mevcut hesabiniza baglatin</p>
                    <p>3. WhatsApp API &gt; Baslangic bolumunden API Token'inizi alin</p>
                    <p>4. Telefon Numarasi ID'sini not edin</p>
                    <p>5. Webhook URL olarak CRM adresinizi ekleyin</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">API Token</label>
                      <Input
                        type="password"
                        placeholder="EAAxxxxxxx..."
                        value={msgConfig.whatsappApiToken}
                        onChange={(e) => setMsgConfig({ ...msgConfig, whatsappApiToken: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Telefon Numarasi ID</label>
                      <Input
                        placeholder="1234567890"
                        value={msgConfig.whatsappPhoneNumberId}
                        onChange={(e) => setMsgConfig({ ...msgConfig, whatsappPhoneNumberId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-medium">Webhook Dogrulama Tokeni</label>
                      <Input
                        placeholder="emlak_crm_webhook"
                        value={msgConfig.whatsappWebhookVerifyToken}
                        onChange={(e) => setMsgConfig({ ...msgConfig, whatsappWebhookVerifyToken: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isWhatsappConfigured || msgTestResults["whatsapp"] === "loading"}
                      onClick={() => handleMsgChannelTest("whatsapp")}
                    >
                      {msgTestResults["whatsapp"] === "loading" ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <TestTube2 className="mr-2 h-3.5 w-3.5" />
                      )}
                      Test Baglantisi
                    </Button>
                    {msgTestResults["whatsapp"] === "success" && (
                      <span className="text-xs text-emerald-600 font-medium">Baglanti basarili!</span>
                    )}
                    {msgTestResults["whatsapp"] === "error" && (
                      <span className="text-xs text-red-600 font-medium">Baglanti basarisiz</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SMS (Netgsm) Config */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">SMS - Netgsm</CardTitle>
                    <CardDescription>
                      SMS gondermek icin Netgsm hesap bilgilerinizi girin
                    </CardDescription>
                  </div>
                  <Badge className={isSmsConfigured ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                    {isSmsConfigured ? "Aktif" : "Yapilandirilmamis"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-sm text-foreground">Kurulum Adimlari:</p>
                    <p>1. Netgsm.com.tr adresine giderek hesap olusturun</p>
                    <p>2. Hesap ayarlarindan API kullanici kodunuzu ve sifrenizi alin</p>
                    <p>3. Baslik (Sender ID) tanimlayin ve onaylatín</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Kullanici Kodu</label>
                      <Input
                        placeholder="850xxxxxxx"
                        value={msgConfig.netgsmUsercode}
                        onChange={(e) => setMsgConfig({ ...msgConfig, netgsmUsercode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sifre</label>
                      <Input
                        type="password"
                        placeholder="API Sifresi"
                        value={msgConfig.netgsmPassword}
                        onChange={(e) => setMsgConfig({ ...msgConfig, netgsmPassword: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Baslik (Sender ID)</label>
                      <Input
                        placeholder="EMLAKCRM"
                        value={msgConfig.netgsmSender}
                        onChange={(e) => setMsgConfig({ ...msgConfig, netgsmSender: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isSmsConfigured || msgTestResults["sms"] === "loading"}
                      onClick={() => handleMsgChannelTest("sms")}
                    >
                      {msgTestResults["sms"] === "loading" ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <TestTube2 className="mr-2 h-3.5 w-3.5" />
                      )}
                      Test Baglantisi
                    </Button>
                    {msgTestResults["sms"] === "success" && (
                      <span className="text-xs text-emerald-600 font-medium">Baglanti basarili!</span>
                    )}
                    {msgTestResults["sms"] === "error" && (
                      <span className="text-xs text-red-600 font-medium">Baglanti basarisiz</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email SMTP Config */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">E-posta - SMTP</CardTitle>
                    <CardDescription>
                      E-posta gondermek icin SMTP sunucu bilgilerinizi girin
                    </CardDescription>
                  </div>
                  <Badge className={isEmailConfigured ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                    {isEmailConfigured ? "Aktif" : "Yapilandirilmamis"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-sm text-foreground">Kurulum Adimlari:</p>
                    <p>1. E-posta saglayicinizin SMTP ayarlarini ogrenmek icin destek sayfasini ziyaret edin</p>
                    <p>2. Gmail icin: smtp.gmail.com, Port: 587 (Uygulama Sifresi gereklidir)</p>
                    <p>3. Yandex icin: smtp.yandex.com, Port: 587</p>
                    <p>4. Ofis e-posta adresinizi "Gonderen Adresi" alanina girin</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP Sunucu</label>
                      <Input
                        placeholder="smtp.gmail.com"
                        value={msgConfig.smtpHost}
                        onChange={(e) => setMsgConfig({ ...msgConfig, smtpHost: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Port</label>
                      <Input
                        placeholder="587"
                        value={msgConfig.smtpPort}
                        onChange={(e) => setMsgConfig({ ...msgConfig, smtpPort: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Kullanici Adi</label>
                      <Input
                        placeholder="info@emlakcrm.com"
                        value={msgConfig.smtpUser}
                        onChange={(e) => setMsgConfig({ ...msgConfig, smtpUser: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sifre</label>
                      <Input
                        type="password"
                        placeholder="SMTP Sifresi"
                        value={msgConfig.smtpPassword}
                        onChange={(e) => setMsgConfig({ ...msgConfig, smtpPassword: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-medium">Gonderen Adresi</label>
                      <Input
                        placeholder="info@emlakcrm.com"
                        value={msgConfig.smtpFrom}
                        onChange={(e) => setMsgConfig({ ...msgConfig, smtpFrom: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isEmailConfigured || msgTestResults["email"] === "loading"}
                      onClick={() => handleMsgChannelTest("email")}
                    >
                      {msgTestResults["email"] === "loading" ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <TestTube2 className="mr-2 h-3.5 w-3.5" />
                      )}
                      Test Baglantisi
                    </Button>
                    {msgTestResults["email"] === "success" && (
                      <span className="text-xs text-emerald-600 font-medium">Baglanti basarili!</span>
                    )}
                    {msgTestResults["email"] === "error" && (
                      <span className="text-xs text-red-600 font-medium">Baglanti basarisiz</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save all messaging settings */}
            <div className="flex justify-end">
              <Button onClick={() => saveMsgConfigMutation.mutate()} disabled={saveMsgConfigMutation.isPending}>
                {saveMsgConfigMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Tum Mesajlasma Ayarlarini Kaydet
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Portal Ayarlari Tab */}
        <TabsContent value="portal">
          <div className="space-y-4">
            {portalsLoading ? (
              [1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              portals.map((portal) => (
                <Card key={portal.id || portal.name}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Globe className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{portal.name}</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            {portal.connected ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span className="text-xs text-emerald-600">Bagli</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 text-red-500" />
                                <span className="text-xs text-red-600">Bagli degil</span>
                              </>
                            )}
                            {portalTestResults[portal.id] === "success" && (
                              <span className="ml-2 text-xs text-emerald-600 font-medium">Baglanti basarili!</span>
                            )}
                            {portalTestResults[portal.id] === "error" && (
                              <span className="ml-2 text-xs text-red-600 font-medium">Baglanti basarisiz</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-1 max-w-md items-center gap-2">
                        <Input
                          type="password"
                          placeholder="API Anahtari"
                          defaultValue={portal.apiKey || (portal.connected ? "sk-xxxxxxxxxxxx" : "")}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={portalTestResults[portal.id] === "loading"}
                          onClick={() => handlePortalTest(portal.id)}
                        >
                          {portalTestResults[portal.id] === "loading" ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <TestTube2 className="mr-2 h-3.5 w-3.5" />
                          )}
                          Test
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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
                <Button onClick={() => {
                  setEditingTemplate(null);
                  setTemplateForm({ name: "", channel: "WhatsApp", content: "" });
                  setTemplateDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Sablon
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{template.name}</h4>
                          <Badge variant="secondary" className="text-[10px]">{template.channel}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground truncate">
                          {template.preview || template.content || ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingTemplate(template);
                            setTemplateForm({
                              name: template.name,
                              channel: template.channel,
                              content: template.content || template.preview || "",
                            });
                            setTemplateDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            setTemplateToDelete(template.id);
                            setDeleteTemplateDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Olay</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">E-posta</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">SMS</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Push</th>
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
                            onChange={() => toggleNotification(index, "email")}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={notif.sms}
                            onChange={() => toggleNotification(index, "sms")}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={notif.push}
                            onChange={() => toggleNotification(index, "push")}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => saveNotifsMutation.mutate()} disabled={saveNotifsMutation.isPending}>
                  {saveNotifsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                <CardTitle className="text-lg">Veri Saklama Suresi</CardTitle>
                <CardDescription>
                  KVKK kapsaminda kisisel verilerin saklama surelerini belirleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Musteri Verileri (ay)</label>
                    <Input type="number" value={kvkkForm.customerRetention} onChange={(e) => setKvkkForm({ ...kvkkForm, customerRetention: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mesaj Gecmisi (ay)</label>
                    <Input type="number" value={kvkkForm.messageRetention} onChange={(e) => setKvkkForm({ ...kvkkForm, messageRetention: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Log Kayitlari (ay)</label>
                    <Input type="number" value={kvkkForm.logRetention} onChange={(e) => setKvkkForm({ ...kvkkForm, logRetention: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Belgeler (ay)</label>
                    <Input type="number" value={kvkkForm.documentRetention} onChange={(e) => setKvkkForm({ ...kvkkForm, documentRetention: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Aydinlatma Metni ve Onam Formu</CardTitle>
                <CardDescription>
                  Musteri kaydi sirasinda gosterilecek KVKK metni
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[150px]"
                  value={kvkkForm.consentText}
                  onChange={(e) => setKvkkForm({ ...kvkkForm, consentText: e.target.value })}
                />
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => saveKvkkMutation.mutate()} disabled={saveKvkkMutation.isPending}>
                    {saveKvkkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                  <Button variant="outline" onClick={() => handleExportData("json")}>
                    Tum Verileri Disari Aktar (JSON)
                  </Button>
                  <Button variant="outline" onClick={() => handleExportData("csv")}>
                    Tum Verileri Disari Aktar (CSV)
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteExpiredDialogOpen(true)}>
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
