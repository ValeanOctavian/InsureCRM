import type { DocumentType } from "@/types";
import type { OcrExtractionResult, ExtractedFields } from "./types";

/**
 * Configuration passed to all OCR providers.
 */
export interface OcrProviderConfig {
  /** Provider-specific API key */
  apiKey?: string;
  /** Model or engine version to use */
  model?: string;
  /** Language hint (e.g., "ron" for Romanian) */
  language?: string;
}

/**
 * Abstract interface for OCR providers.
 *
 * Each provider implements `processImage()` and/or `processPdf()`
 * and returns structured extraction results based on the document type.
 *
 * To add a new provider:
 * 1. Create a new file (e.g., `my-provider.ts`)
 * 2. Implement `OcrProvider` interface
 * 3. Export from `src/lib/ocr/index.ts`
 */
export interface OcrProvider {
  /** Unique provider name */
  readonly name: string;

  /**
   * Process an image file (JPEG, PNG, WebP) and extract fields.
   * @param imageBuffer - Raw image bytes as base64
   * @param documentType - Type of document being processed
   * @param config - Provider configuration
   */
  processImage(
    imageBuffer: string,
    documentType: DocumentType,
    config?: OcrProviderConfig
  ): Promise<OcrExtractionResult<ExtractedFields>>;

  /**
   * Process a PDF document.
   * Default implementation: converts first page to image, then calls processImage.
   * @param pdfBuffer - Raw PDF bytes as base64
   * @param documentType - Type of document being processed
   * @param config - Provider configuration
   */
  processPdf?(
    pdfBuffer: string,
    documentType: DocumentType,
    config?: OcrProviderConfig
  ): Promise<OcrExtractionResult<ExtractedFields>>;
}
