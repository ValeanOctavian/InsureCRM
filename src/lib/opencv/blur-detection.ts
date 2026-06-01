export interface BlurDetectionResult {
  score: number;
  isBlurry: boolean;
  threshold: number;
}

export interface BlurThresholds {
  /** Below this variance = very blurry (default: 80) */
  veryBlurry: number;
  /** Below this variance = blurry (default: 120) */
  blurry: number;
  /** Above this = sharp (default: 200) */
  sharp: number;
}

const DEFAULT_THRESHOLDS: BlurThresholds = {
  veryBlurry: 80,
  blurry: 120,
  sharp: 200,
};

/**
 * Laplacian kernel (3x3)
 *
 *  0  1  0
 *  1 -4  1
 *  0  1  0
 */
const LAPLACIAN_KERNEL = [
  [0,  1,  0],
  [1, -4,  1],
  [0,  1,  0],
];

/**
 * Analyzes an image for blur using Laplacian variance (pure JS).
 *
 * Higher variance = sharper image.
 * Typical ranges:
 *   - < 80: Very blurry
 *   - 80-120: Blurry
 *   - 120-200: Acceptable
 *   - > 200: Sharp
 *
 * @param imageData - ImageData from a canvas element
 * @param thresholds - Optional custom thresholds
 * @param step - Pixel sampling step (2 = every other pixel, default 2 for performance)
 */
export async function detectBlur(
  imageData: ImageData,
  thresholds: Partial<BlurThresholds> = {},
  step = 2
): Promise<BlurDetectionResult> {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };

  try {
    const variance = computeLaplacianVariance(imageData, step);

    return {
      score: Math.round(variance * 100) / 100,
      isBlurry: variance < t.blurry,
      threshold: t.blurry,
    };
  } catch (err) {
    console.error("Blur detection failed:", err);
    return {
      score: -1,
      isBlurry: true,
      threshold: t.blurry,
    };
  }
}

/**
 * Computes the variance of the Laplacian of an image.
 * Uses every `step`-th pixel for performance (step=2 samples ~25% of pixels
 * which gives reliable results at 4× speed).
 */
function computeLaplacianVariance(imageData: ImageData, step: number): number {
  const { data, width, height } = imageData;
  const lapValues: number[] = [];

  // Process every step-th pixel for performance
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      let lapValue = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = x + kx;
          const py = y + ky;
          const idx = (py * width + px) * 4;

          const gray =
            0.299 * data[idx] +
            0.587 * data[idx + 1] +
            0.114 * data[idx + 2];

          lapValue += gray * LAPLACIAN_KERNEL[ky + 1][kx + 1];
        }
      }

      lapValues.push(lapValue);
    }
  }

  if (lapValues.length === 0) return 0;

  const sum = lapValues.reduce((a, b) => a + b, 0);
  const mean = sum / lapValues.length;

  const squaredDiffs = lapValues.reduce((acc, val) => {
    const diff = val - mean;
    return acc + diff * diff;
  }, 0);
  const variance = squaredDiffs / lapValues.length;

  return variance;
}

/**
 * Returns a human-readable label for a blur score.
 */
export function getBlurLabel(score: number, thresholds = DEFAULT_THRESHOLDS): string {
  if (score < 0) return "Check failed";
  if (score < thresholds.veryBlurry) return "Very blurry";
  if (score < thresholds.blurry) return "Blurry";
  if (score < thresholds.sharp) return "Acceptable";
  return "Sharp";
}

/**
 * Basic heuristic to detect if a document might not fully fill the frame.
 * Checks if the center portion has significantly different brightness/color
 * variance than the edges (suggesting the document is smaller than the frame).
 *
 * This is a simplified check — full document boundary detection would require
 * contour analysis.
 */
export interface DocumentVisibilityResult {
  likelyFullFrame: boolean;
  edgeUniformity: number; // 0-1, higher = more uniform edges (suggesting background)
}

export function checkDocumentVisibility(imageData: ImageData): DocumentVisibilityResult {
  const { data, width, height } = imageData;
  const marginX = Math.floor(width * 0.1);
  const marginY = Math.floor(height * 0.1);

  // Sample edge regions
  const edgePixels: number[] = [];

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const isTop = y < marginY;
      const isBottom = y >= height - marginY;
      const isLeft = x < marginX;
      const isRight = x >= width - marginX;

      if (isTop || isBottom || isLeft || isRight) {
        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        edgePixels.push(gray);
      }
    }
  }

  if (edgePixels.length === 0) {
    return { likelyFullFrame: true, edgeUniformity: 1 };
  }

  // Compute standard deviation of edge brightness (uniformity)
  const edgeMean = edgePixels.reduce((a, b) => a + b, 0) / edgePixels.length;
  const edgeVariance = edgePixels.reduce((acc, v) => acc + (v - edgeMean) ** 2, 0) / edgePixels.length;
  const edgeStdDev = Math.sqrt(edgeVariance);

  // Low std dev + all edges having similar brightness = likely background
  // Normalize so that stdDev < 40 means likely uniform (0.8+ uniformity)
  const uniformity = Math.max(0, Math.min(1, 1 - edgeStdDev / 80));
  const likelyFullFrame = uniformity < 0.7;

  return {
    likelyFullFrame,
    edgeUniformity: Math.round(uniformity * 100) / 100,
  };
}
