import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as Turkish Lira currency.
 * Example: 1500000 -> "1.500.000 ₺"
 */
export function formatPrice(price: number): string {
  return (
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + " ₺"
  );
}

/**
 * Formats a price with short notation.
 * Example: 1500000 -> "1.5M ₺"
 */
export function formatPriceShort(price: number): string {
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toFixed(1).replace(".", ",")}M ₺`;
  }
  if (price >= 1_000) {
    return `${(price / 1_000).toFixed(0)}K ₺`;
  }
  return formatPrice(price);
}

/**
 * Formats a Turkish phone number.
 * Example: "5551234567" -> "0 (555) 123 45 67"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const digits = cleaned.startsWith("90")
    ? cleaned.slice(2)
    : cleaned.startsWith("0")
      ? cleaned.slice(1)
      : cleaned;

  if (digits.length !== 10) return phone;

  return `0 (${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
}

/**
 * Formats a date in Turkish locale.
 * Example: "2024-03-15" -> "15 Mart 2024"
 */
export function formatDate(date: string | Date, pattern?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern || "d MMMM yyyy", { locale: tr });
}

/**
 * Formats a date as relative time in Turkish.
 * Example: "2 saat önce"
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: tr });
}

/**
 * Formats square meters.
 * Example: 120 -> "120 m²"
 */
export function formatArea(area: number): string {
  return `${area} m²`;
}
