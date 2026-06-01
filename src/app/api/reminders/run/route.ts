import { NextResponse } from "next/server";

/**
 * POST /api/reminders/run
 *
 * Cron-friendly endpoint that runs the full reminder scheduler.
 * Checks all time windows (30, 14, 7, 1 day) and sends pending reminders.
 *
 * Usage:
 *   curl -X POST https://your-domain.com/api/reminders/run
 *   curl -X POST https://your-domain.com/api/reminders/run -H "Authorization: Bearer <CRON_SECRET>"
 *
 * For cron job setup (e.g., GitHub Actions, cron-job.org, Vercel Cron):
 *   Schedule: "0 8 * * *" (every day at 8 AM)
 *   URL: https://your-domain.com/api/reminders/run
 *
 * Response:
 *   { success: true, data: { windows: {...}, total: {...} } }
 *   { success: false, error: "..." }
 */
export async function POST(request: Request) {
  try {
    // Optional: Simple API key check for cron jobs
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const token = authHeader?.replace("Bearer ", "");
      if (token !== cronSecret) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Dynamic import to avoid requiring all deps at module load
    const { runFullScheduler } = await import("@/features/reminders/scheduler");

    const result = await runFullScheduler();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Scheduler run failed",
      },
      { status: 500 }
    );
  }
}
