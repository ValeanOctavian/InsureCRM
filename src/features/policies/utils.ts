import { isPast, differenceInDays } from "date-fns";

export type ComputedPolicyStatus = "active" | "expiring_soon" | "expired";

/**
 * Calculates the correct policy status based on the end_date.
 *
 * Rules:
 * - If end_date is in the past → "expired"
 * - If end_date is within 30 days from now → "expiring_soon"
 * - Otherwise → "active"
 *
 * This does NOT return "renewed" or "cancelled" since those are
 * manually set by the broker and should be preserved.
 */
export function computePolicyStatus(endDate: string | Date): ComputedPolicyStatus {
  const end = new Date(endDate);
  const now = new Date();

  if (isPast(end)) {
    return "expired";
  }

  if (differenceInDays(end, now) <= 30) {
    return "expiring_soon";
  }

  return "active";
}

/**
 * When saving a policy, use this to determine what status to set.
 * Preserves manual statuses (renewed, cancelled) but auto-calculates
 * the lifecycle statuses (active, expiring_soon, expired).
 */
export function resolvePolicyStatus(
  currentStatus: string,
  endDate: string | Date
): string {
  // Preserve manual statuses
  if (currentStatus === "renewed" || currentStatus === "cancelled") {
    return currentStatus;
  }

  return computePolicyStatus(endDate);
}

/**
 * Returns a human-readable label for days until expiry
 */
export function getDaysUntilExpiryLabel(endDate: string | Date): {
  label: string;
  urgent: boolean;
} {
  const end = new Date(endDate);
  const days = differenceInDays(end, new Date());

  if (days < 0) {
    return { label: `Expired ${Math.abs(days)} days ago`, urgent: true };
  }
  if (days === 0) {
    return { label: "Expires today", urgent: true };
  }
  if (days <= 7) {
    return { label: `${days} day${days === 1 ? "" : "s"} left`, urgent: true };
  }
  if (days <= 30) {
    return { label: `${days} days left`, urgent: false };
  }
  return { label: `${days} days left`, urgent: false };
}
