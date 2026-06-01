"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";
import { useEffect, useCallback } from "react";

interface SheetContextValue {
  open: boolean;
  onClose: () => void;
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  onClose: () => {},
});

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used within a Sheet");
  }
  return context;
}

// ─── Sheet Root ───

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  const onClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <SheetContext.Provider value={{ open, onClose }}>
      {children}
    </SheetContext.Provider>
  );
}

// ─── Sheet Trigger ───

export function SheetTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { onClose } = useSheet();
  // If asChild is true, clone the child element with onClick
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onClick: onClose } as any);
  }
  return <>{children}</>;
}

// ─── Sheet Content ───

interface SheetContentProps {
  children: React.ReactNode;
  className?: string;
  side?: "left" | "right";
}

export function SheetContent({
  children,
  className,
  side = "right",
}: SheetContentProps) {
  const { open, onClose } = useSheet();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed inset-y-0 flex w-full max-w-lg flex-col bg-white shadow-xl dark:bg-zinc-950",
          side === "right" && "right-0",
          side === "left" && "left-0",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Sheet Header ───

export function SheetHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 space-y-1.5", className)}>
      {children}
    </div>
  );
}

// ─── Sheet Title ───

export function SheetTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-lg font-semibold text-zinc-900 dark:text-zinc-50",
        className
      )}
    >
      {children}
    </h2>
  );
}

// ─── Sheet Description ───

export function SheetDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)}>
      {children}
    </p>
  );
}

// ─── Sheet Footer ───

export function SheetFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-6 flex items-center justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800",
        className
      )}
    >
      {children}
    </div>
  );
}
