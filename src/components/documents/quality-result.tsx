"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import type { QualityCheckResult, QualityVerdict } from "@/lib/opencv";

interface QualityResultProps {
  result: QualityCheckResult;
  className?: string;
}

const verdictConfig: Record<QualityVerdict, { icon: typeof CheckCircle2; color: string; bg: string; border: string; label: string }> = {
  clear: { icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-900", label: "Image is clear" },
  blurry: { icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-900", label: "Image is too blurry" },
  too_dark: { icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-900", label: "Image is too dark" },
  too_bright: { icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-900", label: "Image is overexposed" },
  low_contrast: { icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-900", label: "Low contrast detected" },
  low_resolution: { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-900", label: "Low resolution" },
  document_not_fully_visible: { icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-900", label: "Document may not be fully visible" },
  multiple_issues: { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-900", label: "Multiple quality issues" },
};

function ScoreBar({ label, score, maxScore, status }: { label: string; score: number; maxScore: number; status: "pass" | "warn" | "fail" }) {
  const percentage = Math.min(100, Math.round((score / maxScore) * 100));
  const colors = {
    pass: "bg-green-500",
    warn: "bg-yellow-500",
    fail: "bg-red-500",
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{typeof score === "number" ? score.toFixed(1) : score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={cn("h-full rounded-full transition-all", colors[status])}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

export function QualityResult({ result, className }: QualityResultProps) {
  const { verdict, isAcceptable, blur, brightness, resolution, visibility, issues, suggestions } = result;
  const vc = verdictConfig[verdict] ?? verdictConfig.clear;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Verdict Banner */}
      <div className={cn("flex items-start gap-3 rounded-lg border p-4", vc.bg, vc.border)}>
        <vc.icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", vc.color)} />
        <div>
          <p className={cn("text-sm font-medium", vc.color)}>{vc.label}</p>
          {isAcceptable ? (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              This image is suitable for OCR processing.
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Please retake the photo with better lighting and steady hands.
            </p>
          )}
        </div>
      </div>

      {/* Score Bars */}
      <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Quality Scores
        </h4>
        <ScoreBar
          label="Sharpness"
          score={blur.score}
          maxScore={300}
          status={blur.isBlurry ? "fail" : blur.score < 200 ? "warn" : "pass"}
        />
        <ScoreBar
          label="Brightness"
          score={brightness.average}
          maxScore={255}
          status={brightness.isTooDark || brightness.isTooBright ? "fail" : brightness.hasLowContrast ? "warn" : "pass"}
        />
        <ScoreBar
          label="Resolution"
          score={resolution.megapixels}
          maxScore={3}
          status={resolution.isTooSmall ? "fail" : resolution.megapixels < 1 ? "warn" : "pass"}
        />
      </div>

      {/* Issues & Suggestions */}
      {issues.length > 0 && (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Issues Found
          </h4>
          <ul className="space-y-2">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                {issue}
              </li>
            ))}
          </ul>

          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Suggestions
          </h4>
          <ul className="space-y-2">
            {suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Visibility Detail */}
      {!visibility.likelyFullFrame && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-400">
          <strong>Note:</strong> The document edges appear uniform, which may indicate the document
          doesn&apos;t fully fill the frame. Try moving the camera closer.
        </div>
      )}
    </div>
  );
}
