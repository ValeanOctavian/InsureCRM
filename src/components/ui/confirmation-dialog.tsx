"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => Promise<void> | void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
}: ConfirmationDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onOpenChange(false);
    }
  };

  const confirmStyles = {
    danger:
      "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
    warning:
      "bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-500 dark:hover:bg-yellow-600",
    info: "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                variant === "danger"
                  ? "bg-red-100 dark:bg-red-950"
                  : variant === "warning"
                    ? "bg-yellow-100 dark:bg-yellow-950"
                    : "bg-blue-100 dark:bg-blue-950"
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${
                  variant === "danger"
                    ? "text-red-600 dark:text-red-400"
                    : variant === "warning"
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-blue-600 dark:text-blue-400"
                }`}
              />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={confirmStyles[variant]}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
