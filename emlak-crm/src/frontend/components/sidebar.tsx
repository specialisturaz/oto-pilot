"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Building2,
  HandshakeIcon,
  Calendar,
  MessageSquare,
  Globe,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CheckSquare,
  Zap,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore, useAuthStore } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/musteriler", label: "Musteriler", icon: Users },
  { href: "/ilanlar", label: "Ilanlar", icon: Building2 },
  { href: "/satislar", label: "Satislar", icon: HandshakeIcon },
  { href: "/gorevler", label: "Gorevler", icon: CheckSquare },
  { href: "/takvim", label: "Takvim", icon: Calendar },
  { href: "/mesajlar", label: "Mesajlar", icon: MessageSquare },
  { href: "/portallar", label: "Portallar", icon: Globe },
  { href: "/eslestirme", label: "Eslestirme", icon: Zap },
  { href: "/talep-havuzu", label: "Talep Havuzu", icon: Megaphone },
  { href: "/raporlar", label: "Raporlar", icon: BarChart3 },
  { href: "/belgeler", label: "Belgeler", icon: FileText },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all duration-300",
        sidebarCollapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            E
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-bold tracking-tight">
              Emlak <span className="text-primary">CRM</span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* User Info */}
      <div className="border-t p-3">
        <div
          className={cn(
            "flex items-center gap-3",
            sidebarCollapsed && "justify-center"
          )}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback>
              {user?.firstName && user?.lastName
                ? `${user.firstName[0]}${user.lastName[0]}`.toLocaleUpperCase('tr-TR')
                : "U"}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="flex flex-1 items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {user?.firstName ? `${user.firstName} ${user.lastName}` : "Kullanici"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.role || "Danisman"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={logout}
                title="Cikis Yap"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
