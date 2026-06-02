import type { OcrProvider, OcrProviderConfig } from "./ocr-provider";
import type { OcrExtractionResult, ExtractedFields } from "./types";
import type { DocumentType } from "@/types";

const MOCK_NAMES = [
  { first: "Andrei", last: "Popescu" },
  { first: "Maria", last: "Ionescu" },
  { first: "Ion", last: "Georgescu" },
  { first: "Elena", last: "Dumitrescu" },
  { first: "Mihai", last: "Stan" },
  { first: "Ana", last: "Dobre" },
  { first: "Cristian", last: "Radu" },
  { first: "Gabriela", last: "Munteanu" },
];

const MOCK_BRANDS = ["BMW", "Audi", "Mercedes-Benz", "Volkswagen", "Dacia", "Toyota", "Ford", "Opel"];
const MOCK_MODELS: Record<string, string[]> = {
  BMW: ["X5", "320i", "M3", "X3", "520d"],
  Audi: ["A4", "Q5", "A6", "Q7", "A3"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLC", "A-Class", "S-Class"],
  Volkswagen: ["Golf", "Passat", "Tiguan", "Polo", "Arteon"],
  Dacia: ["Sandero", "Duster", "Logan", "Spring", "Jogger"],
  Toyota: ["Corolla", "RAV4", "Camry", "Yaris", "C-HR"],
  Ford: ["Focus", "Kuga", "Fiesta", "Puma", "Mustang"],
  Opel: ["Corsa", "Astra", "Grandland", "Mokka", "Insignia"],
};
const MOCK_FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid"];
const MOCK_INSURERS = ["Allianz", "Groupama", "Axa", "Generali", "Asirom", "Omniasig", "City Insurance", "Euroins"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  const date = new Date(start + Math.random() * (end - start));
  return date.toISOString().split("T")[0];
}

/**
 * Mock OCR provider that generates realistic-looking extraction results.
 * Used for development and testing the OCR review UI.
 *
 * To switch to a real provider, configure the OCR pipeline to use
 * OpenAiVisionProvider or GoogleVisionProvider instead.
 */
export class MockOcrProvider implements OcrProvider {
  readonly name = "mock";

  async processImage(
    _imageBuffer: string,
    documentType: DocumentType,
    _config?: OcrProviderConfig
  ): Promise<OcrExtractionResult<ExtractedFields>> {
    // Simulate processing delay (200-800ms)
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 600));

    return this.generateResult(documentType);
  }

  async processPdf(
    _pdfBuffer: string,
    documentType: DocumentType,
    _config?: OcrProviderConfig
  ): Promise<OcrExtractionResult<ExtractedFields>> {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
    return this.generateResult(documentType);
  }

  private generateResult(documentType: DocumentType): OcrExtractionResult<ExtractedFields> {
    const person = pickRandom(MOCK_NAMES);

    switch (documentType) {
      case "identity_card":
        return {
          provider: "mock",
          confidence: 0.92 + Math.random() * 0.07,
          fields: {
            first_name: person.first,
            last_name: person.last,
            cnp: `${randomInt(100, 999)}${randomInt(100, 999)}${randomInt(100, 999)}${randomInt(100, 999)}`,
            address: `Str. ${pickRandom(["Libertății", "Mihai Viteazu", "Unirii", "Principala", "Republicii"])} nr. ${randomInt(1, 100)}, ${pickRandom(["București", "Cluj-Napoca", "Timișoara", "Iași", "Brașov"])}`,
            series: pickRandom(["RT", "BU", "CT", "IS", "BV"]),
            number: `${randomInt(100000, 999999)}`,
            expiration_date: randomDate(2025, 2035),
          },
          rawText: `CARTE DE IDENTITATE\nNume: ${person.last}\nPrenume: ${person.first}\nCNP: ${randomInt(100, 999)}${randomInt(100, 999)}${randomInt(100, 999)}${randomInt(100, 999)}\nDomiciliu: Str. Exemplu nr. 10`,
          fieldConfidence: {
            first_name: 0.98,
            last_name: 0.97,
            cnp: 0.85,
            address: 0.82,
            series: 0.95,
            number: 0.94,
            expiration_date: 0.88,
          },
        };

      case "car_registration":
      case "car_identity_book": {
        const brand = pickRandom(MOCK_BRANDS);
        const model = pickRandom(MOCK_MODELS[brand] || ["Unknown"]);
        return {
          provider: "mock",
          confidence: 0.88 + Math.random() * 0.1,
          fields: {
            registration_number: `${pickRandom(["B", "CJ", "TM", "IS", "BV", "CT"])} ${randomInt(10, 999)} ${pickRandom(["ABC", "XYZ", "RST", "LMN", "DEF"])}`,
            vin: `WBA${pickRandom(["3A5", "4B6", "2C7", "1D8"])}${randomInt(100000, 999999)}`,
            brand,
            model,
            year: randomInt(2018, 2025),
            engine_capacity: pickRandom([1598, 1997, 2498, 2993, 1499, 1995]),
            fuel_type: pickRandom(MOCK_FUEL_TYPES),
            owner_name: `${person.first} ${person.last}`,
            vehicle_type: pickRandom(["Autoturism", "Autoutilitara", "Motocicleta"]),
            max_weight: randomInt(1200, 3500),
            power_kw: randomInt(50, 300),
            seats: pickRandom([2, 5, 7]),
            civ_series: `CIV${randomInt(100000, 999999)}`,
          },
          rawText: `CERTIFICAT DE ÎNMATRICULARE\nNr. înmatriculare: B 123 ABC\nMarca: ${brand}\nModel: ${model}\nAn: ${randomInt(2018, 2025)}`,
          fieldConfidence: {
            registration_number: 0.92,
            vin: 0.78,
            brand: 0.97,
            model: 0.95,
            year: 0.96,
            engine_capacity: 0.83,
            fuel_type: 0.81,
            owner_name: 0.93,
          },
        };
      }

      case "policy":
        return {
          provider: "mock",
          confidence: 0.85 + Math.random() * 0.12,
          fields: {
            policy_number: `POL-${randomInt(100000, 999999)}-${new Date().getFullYear()}`,
            insurer_name: pickRandom(MOCK_INSURERS),
            start_date: randomDate(2024, 2025),
            end_date: randomDate(2025, 2026),
            premium_amount: randomInt(500, 5000),
            policy_type: pickRandom(["RCA", "CASCO", "HOME"]),
          },
          rawText: `POLIȚĂ DE ASIGURARE\nNr. poliță: POL-${randomInt(100000, 999999)}-2024\nAsigurător: ${pickRandom(MOCK_INSURERS)}\nPrimă: ${randomInt(500, 5000)} RON`,
          fieldConfidence: {
            policy_number: 0.94,
            insurer_name: 0.91,
            start_date: 0.87,
            end_date: 0.86,
            premium_amount: 0.79,
            policy_type: 0.90,
          },
        };

      default:
        return {
          provider: "mock",
          confidence: 0.70,
          fields: {
            text: "Extracted text from document...",
            key_values: { "Document Type": documentType },
          },
          rawText: "Raw OCR output for generic document...",
          fieldConfidence: {},
        };
    }
  }
}
