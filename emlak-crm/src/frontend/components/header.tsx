"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Bell,
  Menu,
  Moon,
  Sun,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore, useUIStore } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const [searchQuery, setSearchQuery] = useState("");

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

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => router.push("/ayarlar")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>

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
