"use client";

import { useState, useCallback } from "react";
import { checkImageQuality } from "@/lib/opencv";
import type { QualityCheckResult, QualityCheckThresholds } from "@/lib/opencv";

export type DocumentUploadStep = "select" | "preview" | "checking" | "result" | "uploading" | "done" | "error";

export interface DocumentQualityState {
  step: DocumentUploadStep;
  file: File | null;
  previewUrl: string | null;
  quality: QualityCheckResult | null;
  error: string | null;
}

const initialState: DocumentQualityState = {
  step: "select",
  file: null,
  previewUrl: null,
  quality: null,
  error: null,
};

/**
 * Hook that manages the full document upload flow:
 * 1. User selects file
 * 2. Render preview
 * 3. Run OpenCV quality checks (blur, brightness, resolution)
 * 4. Show result → allow retake or proceed to upload
 * 5. Upload to Supabase Storage
 */
export function useDocumentQualityCheck(thresholds?: QualityCheckThresholds) {
  const [state, setState] = useState<DocumentQualityState>(initialState);

  const selectFile = useCallback((file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setState({
      step: "preview",
      file,
      previewUrl,
      quality: null,
      error: null,
    });
  }, []);

  const runQualityCheck = useCallback(async () => {
    if (!state.file || !state.previewUrl) return;

    setState((prev) => ({ ...prev, step: "checking", error: null }));

    try {
      // Load the image into a canvas
      const img = new Image();
      const imageLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = state.previewUrl!;
      });

      const loadedImg = await imageLoadPromise;

      // Create canvas at a reasonable size for processing
      const maxDimension = 1200;
      let width = loadedImg.naturalWidth;
      let height = loadedImg.naturalHeight;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.drawImage(loadedImg, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);

      // Run quality check with configured thresholds
      const quality = await checkImageQuality(imageData, thresholds);

      setState((prev) => ({
        ...prev,
        step: "result",
        quality,
        error: quality.isAcceptable ? null : "Image quality issues detected",
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        step: "error",
        error: err instanceof Error ? err.message : "Failed to check image quality",
      }));
    }
  }, [state.file, state.previewUrl, thresholds]);

  const reset = useCallback(() => {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    setState(initialState);
  }, [state.previewUrl]);

  const retake = useCallback(() => {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    setState(initialState);
  }, [state.previewUrl]);

  const setUploading = useCallback(() => {
    setState((prev) => ({ ...prev, step: "uploading" }));
  }, []);

  const setDone = useCallback(() => {
    setState((prev) => ({ ...prev, step: "done" }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, step: "error", error }));
  }, []);

  return {
    ...state,
    selectFile,
    runQualityCheck,
    reset,
    retake,
    setUploading,
    setDone,
    setError,
  };
}
