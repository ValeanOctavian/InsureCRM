import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 text-zinc-50 shadow dark:bg-zinc-50 dark:text-zinc-900",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
        destructive:
          "border-transparent bg-red-500 text-zinc-50 shadow dark:bg-red-900",
        outline: "text-zinc-900 dark:text-zinc-50",
        success:
          "border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
        warning:
          "border-transparent bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
        info: "border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
