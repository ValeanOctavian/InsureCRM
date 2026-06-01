"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requestRenewal } from "@/features/portal/actions";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { Policy } from "@/types";

interface PortalRenewClientProps {
  policies: Policy[];
}

export function PortalRenewClient({ policies }: PortalRenewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPolicyId = searchParams.get("policy") || "";

  const [selectedPolicyId, setSelectedPolicyId] = useState(preselectedPolicyId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!selectedPolicyId) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await requestRenewal(selectedPolicyId);

    if (result.success) {
      setSuccess(result.message || "Renewal request submitted successfully.");
      setSelectedPolicyId("");
      router.refresh();
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [selectedPolicyId, router]);

  return (
    <div className="space-y-4">
      {success && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="renew-policy">Select Policy</Label>
        <Select
          id="renew-policy"
          value={selectedPolicyId}
          onChange={(e) => setSelectedPolicyId(e.target.value)}
          placeholder="Choose a policy to renew"
          options={policies.map((p) => ({
            label: `${p.insurer_name} — ${p.policy_number} (${p.type}, ends ${new Date(p.end_date).toLocaleDateString()})`,
            value: p.id,
          }))}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!selectedPolicyId || loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Renewal Request"
        )}
      </Button>
    </div>
  );
}
