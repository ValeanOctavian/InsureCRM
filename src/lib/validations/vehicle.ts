import { z } from "zod";

export const vehicleSchema = z.object({
  clientId: z.string().uuid("Client is required"),
  registrationNumber: z
    .string()
    .min(1, "Registration number is required")
    .transform((val) => val.replace(/[^A-Za-z0-9]/g, "").toUpperCase()),
  vin: z.string().optional().nullable(),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce
    .number()
    .int()
    .min(1900, "Invalid year")
    .max(new Date().getFullYear() + 1, "Year cannot be in the future"),
  engineCapacity: z.coerce.number().int().positive("Engine capacity must be positive").optional().nullable(),
  fuelType: z.string().optional().nullable(),
  documentNumber: z.string().optional().nullable(),
});

export const vehicleUpdateSchema = vehicleSchema.partial();

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;
