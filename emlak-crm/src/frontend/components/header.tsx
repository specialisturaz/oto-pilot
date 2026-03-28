"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Bell,
  Menu,
  Moon,
  Sun,
  User,
  Settings,
  LogOut,
  CheckCheck,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import { cn, formatRelativeDate } from "@/lib/utils";
import { useAuthStore, useUIStore } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  // Fetch unread notification count
  const { data: notifData } = useQuery({
    queryKey: ["unread-notification-count"],
    queryFn: async () => {
      const res = await api.get("/api/v1/notifications/unread-count");
      return res.data?.data || res.data;
    },
    retry: 1,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = notifData?.unread_count ?? notifData?.count ?? notifData?.unreadCount ?? (typeof notifData === "number" ? notifData : 0);

  // Fetch recent notifications for dropdown
  const { data: notificationsData } = useQuery({
    queryKey: ["recent-notifications"],
    queryFn: async () => {
      const res = await api.get("/api/v1/notifications?limit=20&sortBy=created_at&sortOrder=desc");
      const payload = res.data?.data || res.data;
      return (payload?.data || payload?.items || payload) as Notification[];
    },
    retry: 1,
    refetchInterval: 30000,
    enabled: notifOpen,
  });

  const notifications: Notification[] = Array.isArray(notificationsData) ? notificationsData : [];

  // Mark single notification as read
  const markReadMutation = useMutation({
    mutationFn: async (notifId: string) => {
      await api.patch(`/api/v1/notifications/${notifId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
      queryClient.invalidateQueries({ queryKey: ["recent-notifications"] });
    },
  });

  // Mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/api/v1/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
      queryClient.invalidateQueries({ queryKey: ["recent-notifications"] });
    },
  });

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.link) {
      setNotifOpen(false);
      router.push(notif.link);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleSearch = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && searchQuery.trim()) {
        router.push(`/musteriler?search=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [searchQuery, router]
  );

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Ara... (musteri, ilan, adres)"
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications Dropdown */}
        <Popover.Root open={notifOpen} onOpenChange={setNotifOpen}>
          <Popover.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-[10px]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 w-[380px] rounded-lg border bg-popover text-popover-foreground shadow-lg animate-fade-in"
              align="end"
              sideOffset={8}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-sm font-semibold">Bildirimler</h3>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Tumunu okundu isaretle
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bell className="mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm">Bildirim bulunmuyor</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-0.5 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50 last:border-b-0",
                        !notif.isRead && "bg-accent/20"
                      )}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-tight">
                          {!notif.isRead && (
                            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary" />
                          )}
                          {notif.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatRelativeDate(notif.createdAt)}
                        </span>
                      </div>
                      {notif.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notif.body}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* User Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback>
                  {user?.firstName && user?.lastName
                    ? `${user.firstName[0]}${user.lastName[0]}`.toLocaleUpperCase('tr-TR')
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline-block">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : "Kullanici"}
              </span>
            </Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-fade-in"
              align="end"
              sideOffset={8}
            >
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent"
                onSelect={() => router.push("/ayarlar")}
              >
                <User className="h-4 w-4" />
                Profil
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent"
                onSelect={() => router.push("/ayarlar")}
              >
                <Settings className="h-4 w-4" />
                Ayarlar
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10"
                onSelect={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Cikis Yap
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
