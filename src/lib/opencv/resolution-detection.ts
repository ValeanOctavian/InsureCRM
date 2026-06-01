export interface ResolutionResult {
  width: number;
  height: number;
  megapixels: number;
  isAcceptable: boolean;
  /** Whether the image is too small for OCR */
  isTooSmall: boolean;
}

export interface ResolutionThresholds {
  /** Minimum width in pixels (default: 800) */
  minWidth: number;
  /** Minimum height in pixels (default: 600) */
  minHeight: number;
  /** Minimum megapixels (default: 0.5) */
  minMegapixels: number;
}

const DEFAULT_THRESHOLDS: ResolutionThresholds = {
  minWidth: 800,
  minHeight: 600,
  minMegapixels: 0.5,
};

/**
 * Checks if an image has sufficient resolution for OCR processing.
 *
 * @param imageData - ImageData from a canvas element
 * @param thresholds - Optional custom thresholds
 */
export function checkResolution(
  imageData: ImageData,
  thresholds: Partial<ResolutionThresholds> = {}
): ResolutionResult {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const width = imageData.width;
  const height = imageData.height;
  const megapixels = (width * height) / 1_000_000;

  const isTooSmall =
    width < t.minWidth || height < t.minHeight || megapixels < t.minMegapixels;

  return {
    width,
    height,
    megapixels: Math.round(megapixels * 100) / 100,
    isAcceptable: !isTooSmall,
    isTooSmall,
  };
}

export function getResolutionLabel(
  megapixels: number
): string {
  if (megapixels < 0.3) return "Very low resolution";
  if (megapixels < 0.5) return "Low resolution";
  if (megapixels < 1) return "Acceptable";
  if (megapixels < 3) return "Good resolution";
  return "High resolution";
}
