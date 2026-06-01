import { MockOcrProvider } from "./mock-ocr-provider";
import { OpenAiVisionProvider } from "./openai-vision-provider";
import { GoogleVisionProvider } from "./google-vision-provider";
import type { OcrProvider } from "./ocr-provider";
import type { OcrExtractionResult, ExtractedFields } from "./types";
import type { DocumentType } from "@/types";

export type OcrProviderName = "mock" | "openai-vision" | "google-vision";

/**
 * OCR Pipeline configuration.
 *
 * Set the active provider by:
 * 1. Changing the `providerName` default below
 * 2. Setting the `NEXT_PUBLIC_OCR_PROVIDER` environment variable
 * 3. Passing options to `processDocument()`
 */
export interface OcrPipelineOptions {
  providerName?: OcrProviderName;
  apiKey?: string;
}

const DEFAULT_PROVIDER: OcrProviderName =
  (process.env.NEXT_PUBLIC_OCR_PROVIDER as OcrProviderName) || "mock";

/**
 * Creates an OCR provider instance by name.
 */
function createProvider(name: OcrProviderName): OcrProvider {
  switch (name) {
    case "mock":
      return new MockOcrProvider();
    case "openai-vision":
      return new OpenAiVisionProvider({ apiKey: process.env.OPENAI_API_KEY });
    case "google-vision":
      return new GoogleVisionProvider();
    default:
      return new MockOcrProvider();
  }
}

// Lazy-loaded provider singleton
let currentProvider: OcrProvider | null = null;

function getProvider(name: OcrProviderName): OcrProvider {
  if (!currentProvider || name !== DEFAULT_PROVIDER) {
    currentProvider = createProvider(name);
  }
  return currentProvider;
}

/**
 * Process a document through the OCR pipeline.
 *
 * @param fileBuffer - Base64-encoded file data
 * @param documentType - Type of document being processed
 * @param options - Pipeline configuration
 * @returns Structured extraction result
 */
export async function processDocument(
  fileBuffer: string,
  documentType: DocumentType,
  options?: OcrPipelineOptions
): Promise<OcrExtractionResult<ExtractedFields>> {
  const providerName = options?.providerName ?? DEFAULT_PROVIDER;
  const provider = getProvider(providerName);

  // Detect if this is a PDF by checking the base64 header
  const isPdf = fileBuffer.startsWith("data:application/pdf") ||
    fileBuffer.startsWith("JVBER"); // Raw PDF marker

  if (isPdf && provider.processPdf) {
    return provider.processPdf(fileBuffer, documentType);
  }

  return provider.processImage(fileBuffer, documentType);
}

/**
 * Reset the current provider (useful for testing or changing config).
 */
export function resetProvider(): void {
  currentProvider = null;
}

export { MockOcrProvider, OpenAiVisionProvider };
