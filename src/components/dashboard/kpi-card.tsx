import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  trend?: {
    direction: "up" | "down";
    value: string;
  };
  variant?: "default" | "warning" | "danger" | "success";
  className?: string;
}

const variantStyles = {
  default: "border-zinc-200 dark:border-zinc-800",
  warning: "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20",
  danger: "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
  success: "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
};

const iconVariants = {
  default: "text-zinc-500 dark:text-zinc-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  danger: "text-red-600 dark:text-red-400",
  success: "text-green-600 dark:text-green-400",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-zinc-950",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <p
            className={cn(
              "text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50",
              variant === "danger" && "text-red-700 dark:text-red-400",
              variant === "warning" && "text-yellow-700 dark:text-yellow-400",
              variant === "success" && "text-green-700 dark:text-green-400"
            )}
          >
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.direction === "up"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {trend.direction === "up" ? "↑" : "↓"} {trend.value}
              </span>
              <span className="text-xs text-zinc-400">vs last month</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800",
              iconVariants[variant]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
