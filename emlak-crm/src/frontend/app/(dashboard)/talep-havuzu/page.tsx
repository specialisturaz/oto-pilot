"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, MapPin, Home, Banknote, Maximize, X, MessageSquare, Filter, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { formatPrice, formatRelativeDate } from "@/lib/utils";

export default function TalepHavuzuPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "my">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [form, setForm] = useState({
    type: "DEMAND", propertyType: "", listingType: "SALE",
    ilId: "", budgetMin: "", budgetMax: "", roomCount: "", minSqm: "", maxSqm: "",
    description: "", contactName: "", contactPhone: "",
  });

  const { data: locations } = useQuery({
    queryKey: ["iller"],
    queryFn: async () => { const r = await api.get("/api/v1/locations/iller"); return r.data?.data || []; },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["demand-pool", tab, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      const url = tab === "my" ? "/api/v1/demand-pool/my-posts" : `/api/v1/demand-pool?${params}`;
      const r = await api.get(url);
      return r.data;
    },
  });

  const posts = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

  const createMutation = useMutation({
    mutationFn: async (d: any) => { await api.post("/api/v1/demand-pool", d); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demand-pool"] });
      setShowForm(false);
      setForm({ type: "DEMAND", propertyType: "", listingType: "SALE", ilId: "", budgetMin: "", budgetMax: "", roomCount: "", minSqm: "", maxSqm: "", description: "", contactName: "", contactPhone: "" });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      await api.post(`/api/v1/demand-pool/${id}/respond`, { message });
    },
    onSuccess: () => { setReplyTo(null); setReplyMessage(""); queryClient.invalidateQueries({ queryKey: ["demand-pool"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/api/v1/demand-pool/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demand-pool"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Talep Havuzu</h1>
          <p className="text-sm text-muted-foreground">Ofisler arasi portfolyo ve talep paylasimi</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" />Yeni Talep/Teklif</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="DEMAND">Talep (Ariyorum)</option>
                <option value="OFFER">Teklif (Satiyorum/Kiraliyorum)</option>
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.listingType} onChange={e => setForm({...form, listingType: e.target.value})}>
                <option value="SALE">Satilik</option>
                <option value="RENT">Kiralik</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.propertyType} onChange={e => setForm({...form, propertyType: e.target.value})}>
                <option value="">Emlak Turu</option>
                <option value="APARTMENT">Daire</option><option value="VILLA">Villa</option>
                <option value="DETACHED">Mustakil</option><option value="OFFICE">Ofis</option>
                <option value="SHOP">Dukkan</option><option value="LAND">Arsa</option>
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.ilId} onChange={e => setForm({...form, ilId: e.target.value})}>
                <option value="">Sehir</option>
                {(locations || []).map((il: any) => <option key={il.id} value={il.id}>{il.name}</option>)}
              </select>
              <Input placeholder="Oda Sayisi (orn: 3+1)" value={form.roomCount} onChange={e => setForm({...form, roomCount: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <Input placeholder="Min Butce" type="number" value={form.budgetMin} onChange={e => setForm({...form, budgetMin: e.target.value})} />
              <Input placeholder="Max Butce" type="number" value={form.budgetMax} onChange={e => setForm({...form, budgetMax: e.target.value})} />
              <Input placeholder="Min m2" type="number" value={form.minSqm} onChange={e => setForm({...form, minSqm: e.target.value})} />
              <Input placeholder="Max m2" type="number" value={form.maxSqm} onChange={e => setForm({...form, maxSqm: e.target.value})} />
            </div>
            <Textarea placeholder="Detayli aciklama..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Iletisim Adi" value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} />
              <Input placeholder="Telefon" value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate({
                type: form.type, property_type: form.propertyType || undefined, listing_type: form.listingType,
                il_id: form.ilId || undefined, budget_min: form.budgetMin ? Number(form.budgetMin) : undefined,
                budget_max: form.budgetMax ? Number(form.budgetMax) : undefined, room_count: form.roomCount || undefined,
                min_sqm: form.minSqm ? Number(form.minSqm) : undefined, max_sqm: form.maxSqm ? Number(form.maxSqm) : undefined,
                description: form.description || undefined, contact_name: form.contactName || undefined, contact_phone: form.contactPhone || undefined,
              })} disabled={createMutation.isPending}>{createMutation.isPending ? "Kaydediliyor..." : "Yayinla"}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Iptal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>Tum Talepler</Button>
        <Button variant={tab === "my" ? "default" : "outline"} size="sm" onClick={() => setTab("my")}>Benim Taleplerim</Button>
        <div className="h-8 w-px bg-border mx-2" />
        {[{ v: "all", l: "Tumunu Goster" }, { v: "DEMAND", l: "Talepler" }, { v: "OFFER", l: "Teklifler" }].map(f => (
          <Button key={f.v} variant={typeFilter === f.v ? "secondary" : "ghost"} size="sm" onClick={() => setTypeFilter(f.v)}>{f.l}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : posts.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Talep bulunamadi</p>
          <p className="text-sm text-muted-foreground mt-1">Yeni bir talep veya teklif ekleyin</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post: any) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={post.type === "DEMAND" ? "bg-blue-500 text-white" : "bg-green-500 text-white"}>
                        {post.type === "DEMAND" ? "Talep" : "Teklif"}
                      </Badge>
                      <Badge variant="outline">{post.listingType === "SALE" ? "Satilik" : "Kiralik"}</Badge>
                      {post.propertyType && <Badge variant="secondary">{post.propertyType}</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {post.il && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{post.il.name}{post.ilce ? `, ${post.ilce.name}` : ""}</span>}
                      {(post.budgetMin || post.budgetMax) && <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />{post.budgetMin ? formatPrice(post.budgetMin) : "?"} - {post.budgetMax ? formatPrice(post.budgetMax) : "?"}</span>}
                      {post.roomCount && <span className="flex items-center gap-1"><Home className="h-3 w-3" />{post.roomCount}</span>}
                      {(post.minSqm || post.maxSqm) && <span className="flex items-center gap-1"><Maximize className="h-3 w-3" />{post.minSqm || "?"}-{post.maxSqm || "?"} m²</span>}
                    </div>
                    {post.description && <p className="text-sm">{post.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {post.contactName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.contactName}</span>}
                      <span>{formatRelativeDate(post.createdAt)}</span>
                      <span>{post.viewCount} goruntulenme</span>
                      <span>{post.responseCount} yanit</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}>
                      <MessageSquare className="mr-1 h-3 w-3" />Yanitla
                    </Button>
                    {tab === "my" && (
                      <Button size="sm" variant="destructive" onClick={() => { if (confirm("Bu talep silinecek. Emin misiniz?")) deleteMutation.mutate(post.id); }}>
                        <X className="mr-1 h-3 w-3" />Sil
                      </Button>
                    )}
                  </div>
                </div>
                {replyTo === post.id && (
                  <div className="mt-3 flex gap-2 border-t pt-3">
                    <Input placeholder="Yanitinizi yazin..." value={replyMessage} onChange={e => setReplyMessage(e.target.value)} className="flex-1"
                      onKeyDown={e => { if (e.key === "Enter" && replyMessage.trim()) respondMutation.mutate({ id: post.id, message: replyMessage }); }} />
                    <Button size="sm" onClick={() => respondMutation.mutate({ id: post.id, message: replyMessage })} disabled={!replyMessage.trim() || respondMutation.isPending}>
                      {respondMutation.isPending ? "..." : "Gonder"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
