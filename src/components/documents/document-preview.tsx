"use client";

import { cn } from "@/lib/utils";
import { FileText, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DocumentPreviewProps {
  file: File;
  previewUrl: string;
  className?: string;
}

export function DocumentPreview({ file, previewUrl, className }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const isPdf = file.type === "application/pdf";
  const isImage = file.type.startsWith("image/");

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isImage ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
              {file.name}
            </p>
            <p className="text-xs text-zinc-500">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        </div>

        {isImage && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              disabled={zoom <= 0.25}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-xs text-zinc-500">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        {isImage ? (
          <div className="flex items-center justify-center p-2" style={{ minHeight: 200, maxHeight: 400 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={file.name}
              style={{
                transform: `scale(${zoom})`,
                maxWidth: "100%",
                maxHeight: 380,
                objectFit: "contain",
              }}
              className="rounded transition-transform duration-200"
            />
          </div>
        ) : isPdf ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-3 h-12 w-12 text-zinc-400" />
            <p className="text-sm text-zinc-500">PDF preview not available</p>
            <p className="text-xs text-zinc-400">File will be processed server-side</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-3 h-12 w-12 text-zinc-400" />
            <p className="text-sm text-zinc-500">Preview not available for this file type</p>
          </div>
        )}
      </div>
    </div>
  );
}
