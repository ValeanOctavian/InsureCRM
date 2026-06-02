import type { DocumentType } from "@/types";

// ─── Identity Card Fields ───

export interface IdentityCardFields {
  first_name: string;
  last_name: string;
  cnp: string;
  address: string;
  series: string;
  number: string;
  expiration_date: string;
}

// ─── Car Registration Fields ───

export interface CarRegistrationFields {
  registration_number: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  engine_capacity: number;
  fuel_type: string;
  owner_name: string;
  vehicle_type?: string;
  max_weight?: number;
  power_kw?: number;
  seats?: number;
  civ_series?: string;
}

// ─── Policy Fields ───

export interface PolicyDocumentFields {
  policy_number: string;
  insurer_name: string;
  start_date: string;
  end_date: string;
  premium_amount: number;
  policy_type: string;
}

// ─── Generic Fields ───

export interface GenericDocumentFields {
  text: string;
  key_values: Record<string, string>;
}

// ─── Union of all possible extraction results ───

export type ExtractedFields =
  | IdentityCardFields
  | CarRegistrationFields
  | PolicyDocumentFields
  | GenericDocumentFields;

// ─── Mapping from document type to fields ───

export interface OcrExtractionResult<T = ExtractedFields> {
  /** The provider that performed the OCR */
  provider: string;
  /** Overall confidence score 0-1 */
  confidence: number;
  /** Extracted fields specific to the document type */
  fields: T;
  /** Raw OCR text before field parsing */
  rawText: string;
  /** Per-field confidence scores */
  fieldConfidence: Partial<Record<keyof T, number>>;
}

// ─── Field Schema for dynamic rendering ───

export interface FieldDefinition {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "email";
  required: boolean;
  /** For policies: maps to DB column in policies table */
  targetColumn?: string;
  /** For clients: maps to DB column in clients table */
  targetTable?: "clients" | "vehicles" | "policies";
}

/**
 * Returns the field definitions for a given document type.
 * Used by the review screen to dynamically render editable fields.
 */
export function getFieldsForDocumentType(type: DocumentType): FieldDefinition[] {
  switch (type) {
    case "identity_card":
      return [
        { name: "first_name", label: "First Name", type: "text", required: true, targetTable: "clients", targetColumn: "first_name" },
        { name: "last_name", label: "Last Name", type: "text", required: true, targetTable: "clients", targetColumn: "last_name" },
        { name: "cnp", label: "CNP", type: "text", required: true, targetTable: "clients", targetColumn: "cnp" },
        { name: "address", label: "Address", type: "text", required: false, targetTable: "clients", targetColumn: "address" },
        { name: "series", label: "Series", type: "text", required: false },
        { name: "number", label: "Number", type: "text", required: false },
        { name: "expiration_date", label: "Expiration Date", type: "date", required: true },
      ];
    case "car_registration":
    case "car_identity_book":
      return [
        { name: "registration_number", label: "Registration Number", type: "text", required: true, targetTable: "vehicles", targetColumn: "registration_number" },
        { name: "vin", label: "VIN", type: "text", required: false, targetTable: "vehicles", targetColumn: "vin" },
        { name: "vehicle_type", label: "Vehicle Type", type: "text", required: false, targetTable: "vehicles", targetColumn: "type" },
        { name: "brand", label: "Brand", type: "text", required: true, targetTable: "vehicles", targetColumn: "brand" },
        { name: "model", label: "Model", type: "text", required: true, targetTable: "vehicles", targetColumn: "model" },
        { name: "year", label: "Year", type: "number", required: true, targetTable: "vehicles", targetColumn: "year" },
        { name: "fuel_type", label: "Fuel Type", type: "text", required: false, targetTable: "vehicles", targetColumn: "fuel_type" },
        { name: "max_weight", label: "Max Weight (kg)", type: "number", required: false, targetTable: "vehicles", targetColumn: "max_weight" },
        { name: "engine_capacity", label: "Engine Capacity (cc)", type: "number", required: false, targetTable: "vehicles", targetColumn: "engine_capacity" },
        { name: "power_kw", label: "Power (KW)", type: "number", required: false, targetTable: "vehicles", targetColumn: "power_kw" },
        { name: "seats", label: "Seats", type: "number", required: false, targetTable: "vehicles", targetColumn: "seats_number" },
        { name: "civ_series", label: "CIV Series", type: "text", required: false, targetTable: "vehicles", targetColumn: "civ_series" },
        { name: "owner_name", label: "Owner Name", type: "text", required: true },
      ];
    case "policy":
      return [
        { name: "policy_number", label: "Policy Number", type: "text", required: true, targetTable: "policies", targetColumn: "policy_number" },
        { name: "insurer_name", label: "Insurer", type: "text", required: true, targetTable: "policies", targetColumn: "insurer_name" },
        { name: "start_date", label: "Start Date", type: "date", required: true, targetTable: "policies", targetColumn: "start_date" },
        { name: "end_date", label: "End Date", type: "date", required: true, targetTable: "policies", targetColumn: "end_date" },
        { name: "premium_amount", label: "Premium Amount", type: "number", required: true, targetTable: "policies", targetColumn: "premium_amount" },
        { name: "policy_type", label: "Policy Type", type: "text", required: true, targetTable: "policies", targetColumn: "type" },
      ];
    default:
      return [
        { name: "text", label: "Extracted Text", type: "text", required: false },
      ];
  }
}
