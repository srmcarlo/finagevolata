// apps/web/lib/services/reminders.ts
import { prisma } from "@/lib/prisma";
import {
  sendGrantDeadlineReminder,
  sendDocExpiryReminder,
  sendMissingDocsReminder,
  sendClickDayReminder,
  sendPendingReviewReminder,
} from "@/lib/email";

const ONE_DAY_MS = 86_400_000;

function daysFromNow(date: Date): number {
  const diff = date.getTime() - Date.now();
  return Math.round(diff / ONE_DAY_MS);
}

function dayWindow(daysFromNowTarget: number): { gte: Date; lt: Date } {
  const gte = new Date(Date.now() + daysFromNowTarget * ONE_DAY_MS);
  gte.setHours(0, 0, 0, 0);
  const lt = new Date(gte);
  lt.setDate(lt.getDate() + 1);
  return { gte, lt };
}

async function tryLog(
  kind: string,
  referenceId: string,
  threshold: number,
): Promise<boolean> {
  try {
    await prisma.reminderLog.create({
      data: { kind, referenceId, threshold },
    });
    return true;
  } catch {
    return false;
  }
}

type Result = { kind: string; sent: number; skipped: number };

export async function checkGrantDeadlines(): Promise<Result> {
  const thresholds = [30, 15, 7, 1];
  let sent = 0;
  let skipped = 0;

  for (const threshold of thresholds) {
    const window = dayWindow(threshold);
    const practices = await prisma.practice.findMany({
      where: {
        grant: { deadline: { gte: window.gte, lt: window.lt } },
        status: { notIn: ["SUBMITTED", "WON", "LOST"] },
      },
      include: {
        grant: { select: { title: true } },
        company: { select: { email: true } },
      },
    });

    for (const p of practices) {
      const fresh = await tryLog("GRANT_DEADLINE", p.id, threshold);
      if (!fresh) {
        skipped++;
        continue;
      }
      await sendGrantDeadlineReminder({
        to: p.company.email,
        grantTitle: p.grant.title,
        daysLeft: threshold,
      }).catch((e) =>
        console.error("[reminders] sendGrantDeadlineReminder failed:", e),
      );
      sent++;
    }
  }

  return { kind: "GRANT_DEADLINE", sent, skipped };
}

export async function checkDocExpiry(): Promise<Result> {
  const thresholds = [30, 7, 1];
  let sent = 0;
  let skipped = 0;

  for (const threshold of thresholds) {
    const window = dayWindow(threshold);
    const docs = await prisma.practiceDocument.findMany({
      where: {
        expiresAt: { gte: window.gte, lt: window.lt },
        status: { in: ["APPROVED", "UPLOADED"] },
      },
      include: {
        documentType: { select: { name: true } },
        practice: {
          select: {
            company: { select: { email: true } },
            consultant: { select: { email: true } },
          },
        },
      },
    });

    for (const d of docs) {
      const fresh = await tryLog("DOC_EXPIRY", d.id, threshold);
      if (!fresh) {
        skipped++;
        continue;
      }
      await sendDocExpiryReminder({
        to: d.practice.company.email,
        documentName: d.documentType.name,
        daysLeft: threshold,
      }).catch((e) =>
        console.error(
          "[reminders] sendDocExpiryReminder company failed:",
          e,
        ),
      );
      await sendDocExpiryReminder({
        to: d.practice.consultant.email,
        documentName: d.documentType.name,
        daysLeft: threshold,
      }).catch((e) =>
        console.error(
          "[reminders] sendDocExpiryReminder consultant failed:",
          e,
        ),
      );
      sent++;
    }
  }

  return { kind: "DOC_EXPIRY", sent, skipped };
}

export async function checkMissingDocsNearDeadline(): Promise<Result> {
  const threshold = 14;
  const cutoff = new Date(Date.now() + threshold * ONE_DAY_MS);
  let sent = 0;
  let skipped = 0;

  const practices = await prisma.practice.findMany({
    where: {
      grant: { deadline: { gt: new Date(), lte: cutoff } },
      status: { notIn: ["SUBMITTED", "WON", "LOST"] },
      documents: { some: { status: "MISSING" } },
    },
    include: {
      grant: { select: { title: true, deadline: true } },
      company: { select: { email: true } },
      documents: { where: { status: "MISSING" }, select: { id: true } },
    },
  });

  // Daily aggregate ping — bucket by calendar day so dedup blocks resend within the same day
  const todayBucket = Math.floor(Date.now() / ONE_DAY_MS);

  for (const p of practices) {
    const missingCount = p.documents.length;
    if (missingCount === 0 || !p.grant.deadline) continue;
    const daysLeft = daysFromNow(p.grant.deadline);

    const fresh = await tryLog("MISSING_DOCS", p.id, todayBucket);
    if (!fresh) {
      skipped++;
      continue;
    }
    await sendMissingDocsReminder({
      to: p.company.email,
      grantTitle: p.grant.title,
      missingCount,
      daysToDeadline: daysLeft,
    }).catch((e) =>
      console.error("[reminders] sendMissingDocsReminder failed:", e),
    );
    sent++;
  }

  return { kind: "MISSING_DOCS", sent, skipped };
}

export async function checkClickDayImminent(): Promise<Result> {
  const thresholds = [7, 3, 1];
  let sent = 0;
  let skipped = 0;

  for (const threshold of thresholds) {
    const window = dayWindow(threshold);
    const practices = await prisma.practice.findMany({
      where: {
        grant: {
          hasClickDay: true,
          clickDayDate: { gte: window.gte, lt: window.lt },
        },
        status: { notIn: ["WON", "LOST"] },
      },
      include: {
        grant: { select: { title: true } },
        company: { select: { email: true } },
        consultant: { select: { email: true } },
      },
    });

    for (const p of practices) {
      const fresh = await tryLog("CLICK_DAY", p.id, threshold);
      if (!fresh) {
        skipped++;
        continue;
      }
      await sendClickDayReminder({
        to: p.company.email,
        grantTitle: p.grant.title,
        daysLeft: threshold,
      }).catch((e) =>
        console.error(
          "[reminders] sendClickDayReminder company failed:",
          e,
        ),
      );
      await sendClickDayReminder({
        to: p.consultant.email,
        grantTitle: p.grant.title,
        daysLeft: threshold,
      }).catch((e) =>
        console.error(
          "[reminders] sendClickDayReminder consultant failed:",
          e,
        ),
      );
      sent++;
    }
  }

  return { kind: "CLICK_DAY", sent, skipped };
}

export async function checkStalePendingReviews(): Promise<Result> {
  const cutoff = new Date(Date.now() - 3 * ONE_DAY_MS);
  let sent = 0;
  let skipped = 0;

  const stale = await prisma.practiceDocument.findMany({
    where: {
      status: "UPLOADED",
      uploadedAt: { lt: cutoff },
    },
    include: {
      practice: {
        select: {
          consultantId: true,
          consultant: { select: { email: true } },
        },
      },
    },
  });

  // Group by consultantId
  type Entry = {
    email: string;
    count: number;
    oldestUploadedAt: Date;
  };
  const byConsultant = new Map<string, Entry>();
  for (const d of stale) {
    if (!d.uploadedAt) continue;
    const cId = d.practice.consultantId;
    const entry = byConsultant.get(cId);
    if (!entry) {
      byConsultant.set(cId, {
        email: d.practice.consultant.email,
        count: 1,
        oldestUploadedAt: d.uploadedAt,
      });
    } else {
      entry.count += 1;
      if (d.uploadedAt < entry.oldestUploadedAt) {
        entry.oldestUploadedAt = d.uploadedAt;
      }
    }
  }

  // Daily aggregate ping — bucket by calendar day so each consultant gets at most one reminder per day
  const todayBucket = Math.floor(Date.now() / ONE_DAY_MS);

  for (const [consultantId, entry] of byConsultant) {
    const fresh = await tryLog("PENDING_REVIEW", consultantId, todayBucket);
    if (!fresh) {
      skipped++;
      continue;
    }
    const oldestDaysAgo = Math.floor(
      (Date.now() - entry.oldestUploadedAt.getTime()) / ONE_DAY_MS,
    );
    await sendPendingReviewReminder({
      to: entry.email,
      pendingCount: entry.count,
      oldestDaysAgo,
    }).catch((e) =>
      console.error("[reminders] sendPendingReviewReminder failed:", e),
    );
    sent++;
  }

  return { kind: "PENDING_REVIEW", sent, skipped };
}

export async function runAllReminderChecks(): Promise<Result[]> {
  return Promise.all([
    checkGrantDeadlines(),
    checkDocExpiry(),
    checkMissingDocsNearDeadline(),
    checkClickDayImminent(),
    checkStalePendingReviews(),
  ]);
}
