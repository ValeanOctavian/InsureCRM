"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => {},
});

export function Dialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled
    ? controlledOnOpenChange!
    : setUncontrolledOpen;

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
  asChild,
  onClick,
}: {
  children: React.ReactNode;
  asChild?: boolean;
  onClick?: () => void;
}) {
  const { onOpenChange } = React.useContext(DialogContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        onClick?.();
        onOpenChange(true);
      },
    });
  }

  return (
    <button type="button" onClick={() => onOpenChange(true)}>
      {children}
    </button>
  );
}

export function DialogContent({
  children,
  className,
  showClose = true,
}: {
  children: React.ReactNode;
  className?: string;
  showClose?: boolean;
}) {
  const { open, onOpenChange } = React.useContext(DialogContext);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Panel */}
      <div
        className={cn(
          "relative z-50 w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950",
          className
        )}
      >
        {showClose && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 space-y-1.5", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-50",
        className
      )}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-sm text-zinc-500 dark:text-zinc-400",
        className
      )}
    >
      {children}
    </p>
  );
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-6 flex items-center justify-end gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within a Dialog");
  return ctx;
}
