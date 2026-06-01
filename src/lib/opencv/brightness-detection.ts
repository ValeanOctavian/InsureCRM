export interface BrightnessResult {
  /** Average brightness 0-255 */
  averageBrightness: number;
  /** Standard deviation of brightness (contrast indicator) */
  contrast: number;
  /** Whether the image is too dark */
  isTooDark: boolean;
  /** Whether the image is too bright (overexposed) */
  isTooBright: boolean;
  /** Whether the image has poor contrast */
  hasLowContrast: boolean;
  /** Overall pass/fail for lighting */
  isAcceptable: boolean;
}

export interface BrightnessThresholds {
  /** Below this = too dark (default: 40) */
  darkThreshold: number;
  /** Above this = too bright (default: 220) */
  brightThreshold: number;
  /** Below this = low contrast (default: 30) */
  contrastThreshold: number;
}

const DEFAULT_THRESHOLDS: BrightnessThresholds = {
  darkThreshold: 40,
  brightThreshold: 220,
  contrastThreshold: 30,
};

/**
 * Analyzes image brightness and contrast using pixel data.
 * Works without OpenCV — uses canvas ImageData directly.
 *
 * @param imageData - ImageData from a canvas element
 * @param thresholds - Optional custom thresholds
 */
export async function detectBrightness(
  imageData: ImageData,
  thresholds: Partial<BrightnessThresholds> = {}
): Promise<BrightnessResult> {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const pixels = imageData.data;
  const totalPixels = pixels.length / 4;

  let sumBrightness = 0;
  let sumSquaredBrightness = 0;

  // Process every 4th pixel for performance (skip every other row)
  const step = imageData.width > 1000 ? 8 : 4;

  for (let i = 0; i < pixels.length; i += step * 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // Luminosity formula (perceived brightness)
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    sumBrightness += brightness;
    sumSquaredBrightness += brightness * brightness;
  }

  const sampledPixels = Math.ceil(totalPixels / step);
  const averageBrightness = sumBrightness / sampledPixels;
  const variance =
    sumSquaredBrightness / sampledPixels - averageBrightness * averageBrightness;
  const contrast = Math.sqrt(Math.max(0, variance));

  const isTooDark = averageBrightness < t.darkThreshold;
  const isTooBright = averageBrightness > t.brightThreshold;
  const hasLowContrast = contrast < t.contrastThreshold;

  return {
    averageBrightness: Math.round(averageBrightness * 100) / 100,
    contrast: Math.round(contrast * 100) / 100,
    isTooDark,
    isTooBright,
    hasLowContrast,
    isAcceptable: !isTooDark && !isTooBright && !hasLowContrast,
  };
}

/**
 * Returns a human-readable label for brightness level.
 */
export function getBrightnessLabel(averageBrightness: number): string {
  if (averageBrightness < 30) return "Very dark";
  if (averageBrightness < 50) return "Too dark";
  if (averageBrightness < 80) return "Dark";
  if (averageBrightness < 180) return "Good lighting";
  if (averageBrightness < 220) return "Bright";
  return "Too bright (overexposed)";
}
