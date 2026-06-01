import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "card" | "table" | "form" | "text";
  count?: number;
}

export function LoadingSkeleton({
  className,
  variant = "text",
  count = 1,
}: LoadingSkeletonProps) {
  if (variant === "card") {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-8 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("animate-pulse space-y-3", className)}>
        <div className="h-10 w-full rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full rounded-lg bg-zinc-100 dark:bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("animate-pulse space-y-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i}>
            <div className="mb-1 h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-10 w-full rounded-lg bg-zinc-100 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("animate-pulse space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
}
