"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Send,
  Phone,
  MoreVertical,
  MessageSquare,
  User,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

type Channel = "tumu" | "whatsapp" | "sms" | "eposta";

interface Message {
  id: string;
  text?: string;
  content?: string;
  time?: string;
  createdAt?: string;
  sent?: boolean;
  direction?: "outbound" | "inbound";
  read?: boolean;
  status?: string;
}

interface Conversation {
  id: string;
  contact_name?: string;
  contactName?: string;
  contactId?: string;
  contact_id?: string;
  phone?: string;
  email?: string;
  status?: string;
  channel: "whatsapp" | "sms" | "eposta";
  last_message?: string;
  lastMessage?: string;
  last_time?: string;
  lastMessageAt?: string;
  unread?: number;
  unreadCount?: number;
  messages?: Message[];
}

const channelTabs: { id: Channel; label: string }[] = [
  { id: "tumu", label: "Tumu" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS" },
  { id: "eposta", label: "E-posta" },
];

const channelColors: Record<string, string> = {
  whatsapp: "bg-green-100 text-green-700",
  sms: "bg-blue-100 text-blue-700",
  eposta: "bg-purple-100 text-purple-700",
};

// Fallback mock data when API is unavailable
const fallbackConversations: Conversation[] = [
  {
    id: "1",
    contact_name: "Ahmet Yilmaz",
    phone: "5321234567",
    email: "ahmet@email.com",
    status: "Alici",
    channel: "whatsapp",
    last_message: "Kadikoy daire icin yarin musait miyim?",
    last_time: "10:35",
    unread: 2,
  },
  {
    id: "2",
    contact_name: "Fatma Demir",
    phone: "5339876543",
    email: "fatma@email.com",
    status: "Kiraci",
    channel: "whatsapp",
    last_message: "Tamam, tesekkurler!",
    last_time: "Dun",
    unread: 0,
  },
  {
    id: "3",
    contact_name: "Mustafa Kaya",
    phone: "5411112233",
    email: "mustafa@email.com",
    status: "Alici",
    channel: "sms",
    last_message: "Besiktas villa gosterimi icin saat 14:00 uygun.",
    last_time: "Dun",
    unread: 1,
  },
  {
    id: "4",
    contact_name: "Zeynep Arslan",
    phone: "5054443322",
    email: "zeynep@email.com",
    status: "Alici",
    channel: "eposta",
    last_message: "Bakirkoy dublex icin teklifimi ilettim, lutfen inceleyin.",
    last_time: "23 Mar",
    unread: 0,
  },
  {
    id: "5",
    contact_name: "Ali Celik",
    phone: "5367778899",
    email: "ali@email.com",
    status: "Satici",
    channel: "whatsapp",
    last_message: "Ilanin goruntulenme sayisi nasil gidiyor?",
    last_time: "22 Mar",
    unread: 0,
  },
];

const fallbackMessages: Record<string, Message[]> = {
  "1": [
    { id: "m1", text: "Merhaba, Kadikoy 3+1 daire hala satilik mi?", time: "09:15", sent: false, read: true },
    { id: "m2", text: "Merhaba Ahmet Bey, evet ilan hala aktif. Size detaylari paylasayim.", time: "09:20", sent: true, read: true },
    { id: "m3", text: "Daire 145 m2, 3+1, 5. katta. Fiyati 4.500.000 TL.", time: "09:21", sent: true, read: true },
    { id: "m4", text: "Tesekkur ederim, yerinde gormek istiyorum.", time: "09:45", sent: false, read: true },
    { id: "m5", text: "Tabii, size uygun bir zaman belirleyelim. Yarin ogleden sonra musait misiniz?", time: "09:50", sent: true, read: true },
    { id: "m6", text: "Kadikoy daire icin yarin musait miyim?", time: "10:35", sent: false, read: false },
  ],
  "2": [
    { id: "m7", text: "Merhaba, Atasehir 2+1 kiralik daire icin bilgi alabilir miyim?", time: "14:00", sent: false, read: true },
    { id: "m8", text: "Merhaba Fatma Hanim, tabi. Kira bedeli aylik 25.000 TL, aidat 2.000 TL.", time: "14:15", sent: true, read: true },
    { id: "m9", text: "Tamam, tesekkurler!", time: "14:30", sent: false, read: true },
  ],
  "3": [
    { id: "m10", text: "Besiktas villa gosterimi icin saat 14:00 uygun.", time: "11:00", sent: false, read: false },
  ],
  "4": [
    { id: "m11", text: "Bakirkoy dublex icin teklifimi ilettim, lutfen inceleyin.", time: "16:00", sent: false, read: true },
    { id: "m12", text: "Tesekkurler Zeynep Hanim, teklifinizi ev sahibine ilettim. En kisa surede donus yaparim.", time: "16:30", sent: true, read: true },
  ],
  "5": [
    { id: "m13", text: "Ilanin goruntulenme sayisi nasil gidiyor?", time: "10:00", sent: false, read: true },
    { id: "m14", text: "Ali Bey, ilaniniz simdilik 78 kez goruntulendi. 3 adet soru geldi.", time: "10:15", sent: true, read: true },
  ],
};

function normalizeConv(c: Conversation): Conversation {
  return {
    ...c,
    contact_name: c.contact_name || c.contactName || "Bilinmeyen",
    last_message: c.last_message || c.lastMessage || "",
    last_time: c.last_time || (c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : ""),
    unread: c.unread ?? c.unreadCount ?? 0,
    contactId: c.contactId || c.contact_id,
  };
}

function normalizeMsg(m: Message): Message {
  return {
    ...m,
    text: m.text || m.content || "",
    time: m.time || (m.createdAt ? new Date(m.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : ""),
    sent: m.sent ?? m.direction === "outbound",
    read: m.read ?? m.status === "read",
  };
}

export default function MesajlarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeChannel, setActiveChannel] = useState<Channel>("tumu");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({});
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch conversations
  const { data: convData, isLoading: convLoading, isError: convError } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get("/api/v1/messaging/conversations");
      return res.data?.data || res.data;
    },
    retry: 1,
  });

  const conversations: Conversation[] = (
    convError
      ? fallbackConversations
      : Array.isArray(convData) ? convData : convData?.items || convData?.conversations || fallbackConversations
  ).map(normalizeConv);

  // Set initial selected conversation
  useEffect(() => {
    if (!selectedConvId && conversations.length > 0) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, selectedConvId]);

  const selectedConversation = conversations.find((c) => c.id === selectedConvId) || null;

  // Fetch messages for selected conversation
  const { data: msgData, isLoading: msgLoading } = useQuery({
    queryKey: ["messages", selectedConvId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/messaging/conversations/${selectedConvId}/messages`);
      return res.data?.data || res.data;
    },
    enabled: !!selectedConvId,
    retry: 1,
  });

  const apiMessages: Message[] = (
    Array.isArray(msgData) ? msgData : msgData?.messages || []
  ).map(normalizeMsg);

  // Use API messages, fallback messages, or local messages
  const currentMessages: Message[] = (() => {
    const local = localMessages[selectedConvId || ""] || [];
    if (apiMessages.length > 0) return [...apiMessages, ...local];
    const fb = fallbackMessages[selectedConvId || ""] || [];
    return [...fb, ...local];
  })();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post("/api/v1/messaging/send", {
        conversationId: selectedConvId,
        content,
        channel: selectedConversation?.channel || "whatsapp",
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => {
      setError("Mesaj gonderilemedi. Lutfen tekrar deneyin.");
      setTimeout(() => setError(null), 4000);
    },
  });

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedConvId) return;

    const content = messageInput.trim();
    setMessageInput("");

    // Optimistic update
    const optimisticMsg: Message = {
      id: `opt-${Date.now()}`,
      text: content,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
      sent: true,
      read: false,
    };
    setLocalMessages((prev) => ({
      ...prev,
      [selectedConvId]: [...(prev[selectedConvId] || []), optimisticMsg],
    }));

    sendMutation.mutate(content);
  }, [messageInput, selectedConvId, sendMutation]);

  const handlePhoneCall = useCallback(() => {
    if (selectedConversation?.phone) {
      window.open(`tel:+90${selectedConversation.phone}`, "_self");
    }
  }, [selectedConversation]);

  const handleViewProfile = useCallback(() => {
    const contactId = selectedConversation?.contactId || selectedConversation?.contact_id;
    if (contactId) {
      router.push(`/musteriler/${contactId}`);
    } else {
      router.push("/musteriler");
    }
  }, [selectedConversation, router]);

  const handleAttachment = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConvId) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", selectedConvId);
    formData.append("channel", selectedConversation?.channel || "whatsapp");

    try {
      await api.post("/api/v1/messaging/send", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConvId] });
    } catch {
      setError("Dosya gonderilemedi.");
      setTimeout(() => setError(null), 4000);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [selectedConvId, selectedConversation, queryClient]);

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.contact_name || "";
    const lastMsg = conv.last_message || "";
    const matchesChannel =
      activeChannel === "tumu" || conv.channel === activeChannel;
    const matchesSearch =
      name.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR")) ||
      lastMsg.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR"));
    return matchesChannel && matchesSearch;
  });

  const totalUnread = conversations.reduce(
    (sum, conv) => sum + (conv.unread || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Hidden file input for attachments */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx"
        onChange={handleFileSelected}
      />

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mesajlar</h1>
        <p className="text-muted-foreground">
          {totalUnread > 0
            ? `${totalUnread} okunmamis mesajiniz var`
            : "Tum mesajlariniz okundu"}
        </p>
      </div>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-220px)] overflow-hidden rounded-lg border bg-card">
        {/* Left Panel - Conversation List */}
        <div className="flex w-full flex-col border-r sm:w-[360px]">
          {/* Channel Tabs */}
          <div className="flex border-b">
            {channelTabs.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  "flex-1 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  activeChannel === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveChannel(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Konusma ara..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {convLoading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 border-b px-3 py-3 transition-colors hover:bg-accent/50",
                    selectedConvId === conv.id && "bg-accent"
                  )}
                  onClick={() => {
                    setSelectedConvId(conv.id);
                    setLocalMessages((prev) => ({ ...prev, [conv.id]: [] }));
                  }}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="text-xs">
                      {(conv.contact_name || "")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {conv.contact_name}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {conv.last_time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <Badge
                          className={cn(
                            "text-[9px] px-1.5 py-0",
                            channelColors[conv.channel]
                          )}
                        >
                          {conv.channel === "whatsapp"
                            ? "WA"
                            : conv.channel === "sms"
                              ? "SMS"
                              : "E-p"}
                        </Badge>
                        {(conv.unread || 0) > 0 && (
                          <Badge className="h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]">
                            {conv.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Henuz mesajiniz yok
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Message Thread */}
        {selectedConversation ? (
          <div className="hidden flex-1 flex-col sm:flex">
            {/* Thread Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {(selectedConversation.contact_name || "")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {selectedConversation.contact_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.phone} &middot;{" "}
                    {selectedConversation.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Ara"
                  onClick={handlePhoneCall}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Profili Gor"
                  onClick={handleViewProfile}
                >
                  <User className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {msgLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                      <Skeleton className="h-12 w-48 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : (
                currentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.sent ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-3 py-2",
                        msg.sent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <div
                        className={cn(
                          "mt-1 flex items-center justify-end gap-1",
                          msg.sent
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        <span className="text-[10px]">{msg.time}</span>
                        {msg.sent &&
                          (msg.read ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t p-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  title="Dosya Ekle"
                  onClick={handleAttachment}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Mesajinizi yazin..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && messageInput.trim()) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={!messageInput.trim() || sendMutation.isPending}
                  onClick={handleSendMessage}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 items-center justify-center sm:flex">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-semibold">
                Bir konusma secin
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sol panelden bir konusma secerek mesajlasmaya baslayin
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
