/**
 * Image quality detection utilities.
 *
 * All detection is implemented in pure JavaScript (canvas ImageData),
 * no OpenCV.js WASM dependency needed.
 */

export { detectBlur, getBlurLabel } from "./blur-detection";
export type { BlurDetectionResult, BlurThresholds } from "./blur-detection";

export { detectBrightness, getBrightnessLabel } from "./brightness-detection";
export type { BrightnessResult, BrightnessThresholds } from "./brightness-detection";

export { checkResolution, getResolutionLabel } from "./resolution-detection";
export type { ResolutionResult, ResolutionThresholds } from "./resolution-detection";

export { checkImageQuality } from "./quality-check";
export type { QualityCheckResult, QualityVerdict, QualityCheckThresholds } from "./quality-check";
