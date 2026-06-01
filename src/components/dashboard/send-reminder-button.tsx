"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { sendReminderNow } from "@/features/reminders/actions";
import { Bell, BellRing, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface SendReminderButtonProps {
  policyId: string;
  clientName: string;
  variant?: "icon" | "full";
}

export function SendReminderButton({
  policyId,
  clientName,
  variant = "icon",
}: SendReminderButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    setSending(true);
    setStatus("idle");
    setMessage(null);

    const result = await sendReminderNow(policyId);

    if (result.success) {
      setStatus("sent");
      setMessage(result.message ?? "Reminder sent");
      router.refresh();
    } else {
      setStatus("error");
      setMessage(result.error ?? "Failed to send");
    }

    setSending(false);

    // Reset status after 3 seconds
    setTimeout(() => {
      setStatus("idle");
      setMessage(null);
    }, 3000);
  }, [policyId, router]);

  if (variant === "icon") {
    return (
      <button
        onClick={handleSend}
        disabled={sending || status === "sent"}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        title={`Send renewal reminder to ${clientName}`}
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "sent" ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSend}
        disabled={sending || status === "sent"}
        size="sm"
        variant={status === "sent" ? "outline" : "default"}
        className="gap-2"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "sent" ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <BellRing className="h-4 w-4" />
        )}
        {sending
          ? "Sending..."
          : status === "sent"
            ? "Sent!"
            : "Send Reminder"}
      </Button>
      {message && (
        <p
          className={`text-xs ${
            status === "sent" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
