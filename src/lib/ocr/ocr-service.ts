// OCR service abstraction
// Will be implemented in Module 12 with a provider-agnostic interface

export interface OcrResult {
  text: string;
  confidence: number;
  fields?: Record<string, string>;
  raw?: Record<string, unknown>;
}

export interface OcrServiceOptions {
  provider: "mock" | "google-vision" | "gpt-vision" | "custom";
  language?: string;
}

/**
 * Abstract OCR service that can be swapped between different providers
 * without changing the rest of the application.
 */
export class OcrService {
  private provider: OcrServiceOptions["provider"];

  constructor(options: OcrServiceOptions) {
    this.provider = options.provider;
  }

  async processImage(_imagePath: string, _documentType?: string): Promise<OcrResult> {
    // TODO: Implement OCR processing via the configured provider
    throw new Error("OCR service not yet implemented");
  }

  async processPdf(_filePath: string, _documentType?: string): Promise<OcrResult> {
    // TODO: Implement PDF processing (extract images -> OCR each page)
    throw new Error("PDF OCR not yet implemented");
  }
}
