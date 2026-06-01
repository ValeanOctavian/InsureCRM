import { format, formatDistanceToNow, isAfter, isBefore, isPast, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDate(date: Date | string, pattern = "dd/MM/yyyy"): string {
  return format(new Date(date), pattern, { locale: ptBR });
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

export function isExpiringSoon(date: Date | string, daysThreshold = 30): boolean {
  const end = new Date(date);
  return isAfter(end, new Date()) && differenceInDays(end, new Date()) <= daysThreshold;
}

export function isExpired(date: Date | string): boolean {
  return isPast(new Date(date));
}

export function daysUntil(date: Date | string): number {
  return Math.max(0, differenceInDays(new Date(date), new Date()));
}

export function getExpiryStatus(date: Date | string): "expired" | "expiring_soon" | "active" {
  const d = new Date(date);
  if (isPast(d)) return "expired";
  if (differenceInDays(d, new Date()) <= 30) return "expiring_soon";
  return "active";
}

export function addDaysToDate(date: Date | string, days: number): Date {
  return addDays(new Date(date), days);
}
