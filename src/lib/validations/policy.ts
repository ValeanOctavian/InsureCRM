import { z } from "zod";

export const policySchema = z
  .object({
    clientId: z.string().uuid("Client is required"),
    vehicleId: z.string().uuid().optional().nullable(),
    type: z.enum(["RCA", "CASCO", "HOME", "TRAVEL", "HEALTH", "OTHER"]),
    insurerName: z.string().min(1, "Insurer name is required"),
    policyNumber: z.string().min(1, "Policy number is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    premiumAmount: z.coerce.number().positive("Premium amount must be positive"),
    status: z
      .enum(["active", "expiring_soon", "expired", "renewed", "cancelled"])
      .default("active"),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

export const policyUpdateSchema = policySchema.partial();

export type PolicyInput = z.infer<typeof policySchema>;
export type PolicyUpdateInput = z.infer<typeof policyUpdateSchema>;
