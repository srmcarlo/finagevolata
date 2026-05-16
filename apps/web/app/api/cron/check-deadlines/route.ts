// apps/web/app/api/cron/check-deadlines/route.ts
import { NextResponse } from "next/server";
import { runAllReminderChecks } from "@/lib/services/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    console.error("[cron] CRON_SECRET not configured");
    return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runAllReminderChecks();
    const summary = Object.fromEntries(
      results.map((r) => [r.kind, { sent: r.sent, skipped: r.skipped }]),
    );
    console.log("[cron] reminder check summary:", summary);
    return NextResponse.json({ success: true, summary });
  } catch (err) {
    console.error("[cron] fatal:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
