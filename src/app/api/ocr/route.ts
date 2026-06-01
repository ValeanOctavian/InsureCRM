import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";

/**
 * POST /api/ocr
 *
 * Accepts an uploaded document image and returns OCR-extracted data.
 * Currently a placeholder — will integrate with OCR service.
 *
 * Request body: { filePath: string, documentType: string }
 * Response: { success: boolean, data?: Record<string, unknown>, error?: string }
 */
export async function POST(request: Request) {
  // Require broker or admin role
  const auth = await requireApiAuth(["broker"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { filePath, documentType } = body;

    if (!filePath || !documentType) {
      return NextResponse.json(
        { success: false, error: "filePath and documentType are required" },
        { status: 400 }
      );
    }

    // TODO: Implement OCR processing via abstracted OCR service
    return NextResponse.json({
      success: true,
      data: {
        message: "OCR processing not yet implemented",
        filePath,
        documentType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
