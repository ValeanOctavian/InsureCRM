import { detectBlur, getBlurLabel, checkDocumentVisibility } from "./blur-detection";
import { detectBrightness, getBrightnessLabel } from "./brightness-detection";
import { checkResolution, getResolutionLabel } from "./resolution-detection";
import type { BlurThresholds } from "./blur-detection";
import type { BrightnessThresholds } from "./brightness-detection";
import type { ResolutionThresholds } from "./resolution-detection";

export type QualityVerdict =
  | "clear"
  | "blurry"
  | "too_dark"
  | "too_bright"
  | "low_contrast"
  | "low_resolution"
  | "document_not_fully_visible"
  | "multiple_issues";

export interface QualityCheckResult {
  /** Final verdict */
  verdict: QualityVerdict;
  /** Whether the image is acceptable for OCR */
  isAcceptable: boolean;
  /** Blur analysis result */
  blur: { score: number; isBlurry: boolean; label: string };
  /** Brightness analysis result */
  brightness: { average: number; isTooDark: boolean; isTooBright: boolean; hasLowContrast: boolean; label: string };
  /** Resolution analysis result */
  resolution: { width: number; height: number; megapixels: number; isTooSmall: boolean; label: string };
  /** Document visibility heuristic */
  visibility: { likelyFullFrame: boolean; edgeUniformity: number };
  /** All issues found (for display) */
  issues: string[];
  /** Suggestions for fixing issues */
  suggestions: string[];
}

export interface QualityCheckThresholds {
  blur?: Partial<BlurThresholds>;
  brightness?: Partial<BrightnessThresholds>;
  resolution?: Partial<ResolutionThresholds>;
}

/**
 * Runs the full quality check pipeline: blur → brightness → resolution → visibility.
 * Returns a composite result with verdict and actionable feedback.
 */
export async function checkImageQuality(
  imageData: ImageData,
  thresholds: QualityCheckThresholds = {}
): Promise<QualityCheckResult> {
  const [blurResult, brightnessResult] = await Promise.all([
    detectBlur(imageData, thresholds.blur),
    detectBrightness(imageData, thresholds.brightness),
  ]);

  const resolutionResult = checkResolution(imageData, thresholds.resolution);
  const visibilityResult = checkDocumentVisibility(imageData);

  const issues: string[] = [];
  const suggestions: string[] = [];

  // Blur assessment
  if (blurResult.isBlurry) {
    issues.push(`Image is ${getBlurLabel(blurResult.score).toLowerCase()}`);
    suggestions.push("Hold the camera steady and ensure good lighting");
    suggestions.push("Make sure the document is flat and in focus");
  }

  // Brightness assessment
  if (brightnessResult.isTooDark) {
    issues.push("Image is too dark");
    suggestions.push("Take the photo in a well-lit area");
    suggestions.push("Avoid shadows on the document");
  }
  if (brightnessResult.isTooBright) {
    issues.push("Image is overexposed (too bright)");
    suggestions.push("Reduce glare by angling the document away from direct light");
  }
  if (brightnessResult.hasLowContrast) {
    issues.push("Low contrast — text may not be readable");
    suggestions.push("Ensure the document is on a contrasting background");
  }

  // Resolution assessment
  if (resolutionResult.isTooSmall) {
    issues.push(`${getResolutionLabel(resolutionResult.megapixels).toLowerCase()}`);
    suggestions.push("Move the camera closer to the document");
    suggestions.push("Use a camera with at least 5MP resolution");
  }

  // Document visibility assessment
  if (!visibilityResult.likelyFullFrame && visibilityResult.edgeUniformity > 0.65) {
    issues.push("Document may not be fully visible in the frame");
    suggestions.push("Move the camera closer so the document fills more of the frame");
    suggestions.push("Ensure all corners of the document are visible");
  }

  // Determine verdict
  let verdict: QualityVerdict = "clear";
  if (issues.length > 1) {
    verdict = "multiple_issues";
  } else if (blurResult.isBlurry) {
    verdict = "blurry";
  } else if (brightnessResult.isTooDark) {
    verdict = "too_dark";
  } else if (brightnessResult.isTooBright) {
    verdict = "too_bright";
  } else if (brightnessResult.hasLowContrast) {
    verdict = "low_contrast";
  } else if (resolutionResult.isTooSmall) {
    verdict = "low_resolution";
  } else if (!visibilityResult.likelyFullFrame) {
    verdict = "document_not_fully_visible";
  }

  return {
    verdict,
    isAcceptable:
      !blurResult.isBlurry &&
      brightnessResult.isAcceptable &&
      !resolutionResult.isTooSmall,
    blur: {
      score: blurResult.score,
      isBlurry: blurResult.isBlurry,
      label: getBlurLabel(blurResult.score),
    },
    brightness: {
      average: brightnessResult.averageBrightness,
      isTooDark: brightnessResult.isTooDark,
      isTooBright: brightnessResult.isTooBright,
      hasLowContrast: brightnessResult.hasLowContrast,
      label: getBrightnessLabel(brightnessResult.averageBrightness),
    },
    resolution: {
      width: resolutionResult.width,
      height: resolutionResult.height,
      megapixels: resolutionResult.megapixels,
      isTooSmall: resolutionResult.isTooSmall,
      label: getResolutionLabel(resolutionResult.megapixels),
    },
    visibility: visibilityResult,
    issues,
    suggestions: [...new Set(suggestions)],
  };
}
