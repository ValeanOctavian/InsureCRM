// OCR Provider Abstraction
export { processDocument, resetProvider } from "./ocr-pipeline";
export type { OcrPipelineOptions, OcrProviderName } from "./ocr-pipeline";

// Provider Interface
export type { OcrProvider, OcrProviderConfig } from "./ocr-provider";

// Provider Implementations
export { MockOcrProvider } from "./mock-ocr-provider";
export { OpenAiVisionProvider } from "./openai-vision-provider";
export { GoogleVisionProvider } from "./google-vision-provider";

// Types
export {
  getFieldsForDocumentType,
} from "./types";
export type {
  OcrExtractionResult,
  ExtractedFields,
  FieldDefinition,
  IdentityCardFields,
  CarRegistrationFields,
  PolicyDocumentFields,
} from "./types";
