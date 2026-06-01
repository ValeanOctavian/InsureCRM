import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success:
    "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950 dark:text-green-400 dark:ring-green-400/20",
  warning:
    "bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-950 dark:text-yellow-400 dark:ring-yellow-400/20",
  danger:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-400 dark:ring-red-400/20",
  info:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-400/20",
  neutral:
    "bg-zinc-50 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-400/20",
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolvedVariant: StatusVariant =
    variant ??
    (status === "active" || status === "done" || status === "clear" || status === "issued"
      ? "success"
      : status === "expired" || status === "cancelled" || status === "failed" || status === "rejected"
        ? "danger"
        : status === "pending" || status === "in_progress" || status === "blurry" || status === "expiring_soon" || status === "requested" || status === "documents_needed"
          ? "warning"
          : status === "sent" || status === "renewed" || status === "paid"
            ? "info"
            : "neutral");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variantStyles[resolvedVariant],
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
