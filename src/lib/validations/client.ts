import { z } from "zod";

export const clientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  cnp: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  county: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "lead"]).default("active"),
});

export const clientUpdateSchema = clientSchema.partial();

export type ClientInput = z.infer<typeof clientSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
