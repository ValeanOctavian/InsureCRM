import { z } from "zod";

export const renewalRequestSchema = z.object({
  clientId: z.string().uuid("Client is required"),
  policyId: z.string().uuid("Policy is required"),
  status: z
    .enum(["requested", "documents_needed", "in_progress", "issued", "cancelled"])
    .default("requested"),
  paymentStatus: z.enum(["unpaid", "paid", "not_required"]).default("not_required"),
});

export const renewalRequestUpdateSchema = renewalRequestSchema.partial();

export type RenewalRequestInput = z.infer<typeof renewalRequestSchema>;
export type RenewalRequestUpdateInput = z.infer<typeof renewalRequestUpdateSchema>;
