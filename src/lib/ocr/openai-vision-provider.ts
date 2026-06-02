import type { OcrProvider, OcrProviderConfig } from "./ocr-provider";
import type { OcrExtractionResult, ExtractedFields } from "./types";
import type { DocumentType } from "@/types";

/**
 * OpenAI Vision OCR provider.
 *
 * Uses GPT-4o (or compatible vision model) to extract structured data
 * from document images. The model is prompted to return JSON matching
 * the expected field schema for the given document type.
 *
 * Usage:
 * ```ts
 * const provider = new OpenAiVisionProvider({ apiKey: process.env.OPENAI_API_KEY! });
 * const result = await provider.processImage(base64Image, "identity_card");
 * ```
 *
 * Environment variables required:
 * - OPENAI_API_KEY: Your OpenAI API key
 *
 * Note: This provider sends image data to OpenAI's API.
 * Ensure compliance with data protection regulations for client documents.
 */
export class OpenAiVisionProvider implements OcrProvider {
  readonly name = "openai-vision";

  private apiKey: string;
  private model: string;

  constructor(config?: OcrProviderConfig) {
    this.apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = config?.model ?? "gpt-4o";

    if (!this.apiKey) {
      console.warn(
        "[OpenAiVisionProvider] No API key configured. Set OPENAI_API_KEY environment variable or pass it in the constructor."
      );
    }
  }

  async processImage(
    imageBuffer: string,
    documentType: DocumentType,
    config?: OcrProviderConfig
  ): Promise<OcrExtractionResult<ExtractedFields>> {
    const apiKey = config?.apiKey ?? this.apiKey;
    const model = config?.model ?? this.model;

    if (!apiKey) {
      throw new Error(
        "OpenAI API key is not configured. Set OPENAI_API_KEY environment variable."
      );
    }

    // Build the prompt based on document type
    const systemPrompt = this.buildSystemPrompt(documentType);

    // Strip data:image/... prefix if present
    const base64Data = imageBuffer.includes(",")
      ? imageBuffer.split(",")[1]
      : imageBuffer;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Data}`,
                    detail: "high",
                  },
                },
                { type: "text", text: "Extract the document fields from this image." },
              ],
            },
          ],
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("OpenAI returned empty response");
      }

      // Parse the JSON response
      const parsed = JSON.parse(content);

      return {
        provider: this.name,
        confidence: parsed.confidence ?? 0.85,
        fields: parsed.fields ?? parsed,
        rawText: parsed.raw_text ?? parsed.rawText ?? "",
        fieldConfidence: parsed.field_confidence ?? parsed.fieldConfidence ?? {},
      } as OcrExtractionResult<ExtractedFields>;
    } catch (err) {
      throw new Error(
        `OpenAI Vision OCR failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  async processPdf(
    pdfBuffer: string,
    documentType: DocumentType,
    config?: OcrProviderConfig
  ): Promise<OcrExtractionResult<ExtractedFields>> {
    // For PDFs, we would need to convert to images first.
    // For now, throw a clear error about the limitation.
    throw new Error(
      "PDF processing via OpenAI Vision is not yet supported. " +
        "Convert the PDF to images first or use a different provider."
    );
  }

  private buildSystemPrompt(documentType: DocumentType): string {
    const fieldDescriptions: Record<string, string> = {
      identity_card:
        "Extract from a Romanian identity card (Carte de Identitate): first_name, last_name, cnp (13 digits), address, series (2 letters), number (6 digits), expiration_date (YYYY-MM-DD). Return as JSON with fields object.",
      car_registration:
        "Extract from a Romanian vehicle registration certificate: registration_number (e.g., 'B 123 ABC'), vin (17 characters), vehicle_type, brand, model, year (number), fuel_type, max_weight (number), engine_capacity (cc, number), power_kw (number), seats (number), civ_series, owner_name. Return as JSON with fields object.",
      car_identity_book:
        "Extract from a Romanian vehicle identity book (Cartea de Identitate a Vehiculului): registration_number, vin, vehicle_type, brand, model, year, fuel_type, max_weight, engine_capacity, power_kw, seats, civ_series, owner_name. Return as JSON with fields object.",
      address_certificate:
        "Extract text from an address certificate document. Return as JSON with text field and key_values object for any identified fields.",
      policy:
        "Extract from an insurance policy document: policy_number, insurer_name, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), premium_amount (number), policy_type (RCA/CASCO/HOME/TRAVEL/HEALTH/OTHER). Return as JSON with fields object.",
      other:
        "Extract all visible text from this document. Return as JSON with text field and key_values object for any identified key-value pairs.",
    };

    return (
      `You are an OCR assistant specialized in Romanian insurance documents. ` +
      `Extract fields as JSON. Include a "confidence" field (0-1) for overall accuracy. ` +
      fieldDescriptions[documentType] ||
      fieldDescriptions.other
    );
  }
}
