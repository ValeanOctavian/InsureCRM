import type { OcrProvider, OcrProviderConfig } from "./ocr-provider";
import type { OcrExtractionResult, ExtractedFields } from "./types";
import type { DocumentType } from "@/types";

/**
 * Google Cloud Vision OCR provider.
 *
 * Uses Google Cloud Vision API for OCR text detection
 * and document field extraction.
 *
 * Note: Full field extraction requires additional post-processing
 * of the raw OCR text, as Vision API returns text blocks/words
 * rather than structured JSON.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS environment variable (path to service account JSON)
 * - Or pass credentials in the constructor
 *
 * TODO: Implement full integration with Google Cloud Vision API
 * when cloud credentials are configured.
 */
export class GoogleVisionProvider implements OcrProvider {
  readonly name = "google-vision";

  private credentials?: Record<string, unknown>;

  constructor(config?: OcrProviderConfig) {
    // Store credentials if provided
    if (config?.apiKey) {
      this.credentials = { apiKey: config.apiKey };
    }
  }

  async processImage(
    _imageBuffer: string,
    _documentType: DocumentType,
    _config?: OcrProviderConfig
  ): Promise<OcrExtractionResult<ExtractedFields>> {
    throw new Error(
      "Google Cloud Vision provider is not yet implemented. " +
        "Set GOOGLE_APPLICATION_CREDENTIALS environment variable and configure " +
        "the @google-cloud/vision package, or use the OpenAI Vision or Mock provider instead."
    );
  }

  async processPdf(
    _pdfBuffer: string,
    _documentType: DocumentType,
    _config?: OcrProviderConfig
  ): Promise<OcrExtractionResult<ExtractedFields>> {
    throw new Error(
      "Google Cloud Vision provider does not yet support PDF processing."
    );
  }
}
