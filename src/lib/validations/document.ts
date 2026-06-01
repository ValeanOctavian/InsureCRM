import { z } from "zod";

export const documentSchema = z.object({
  clientId: z.string().uuid("Client is required"),
  vehicleId: z.string().uuid().optional().nullable(),
  type: z.enum([
    "identity_card",
    "car_registration",
    "car_identity_book",
    "address_certificate",
    "policy",
    "other",
  ]),
});

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export type DocumentInput = z.infer<typeof documentSchema>;
