"use client";

import { useState, useCallback } from "react";

export interface ImageQualityState {
  loading: boolean;
  score: number | null;
  isClear: boolean | null;
  error: string | null;
}

/**
 * Hook that provides image quality assessment during document upload.
 * Will integrate with OpenCV.js and Transformers.js in Module 12.
 */
export function useImageQuality() {
  const [state, setState] = useState<ImageQualityState>({
    loading: false,
    score: null,
    isClear: null,
    error: null,
  });

  const assessImage = useCallback(async (_file: File) => {
    setState({ loading: true, score: null, isClear: null, error: null });

    try {
      // TODO: Run OpenCV.js blur detection + Transformers.js quality check
      // For now, we return a passing result

      // Simulate async processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      setState({
        loading: false,
        score: 0.95,
        isClear: true,
        error: null,
      });
    } catch (err) {
      setState({
        loading: false,
        score: null,
        isClear: null,
        error: err instanceof Error ? err.message : "Failed to assess image quality",
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      score: null,
      isClear: null,
      error: null,
    });
  }, []);

  return { ...state, assessImage, reset };
}
