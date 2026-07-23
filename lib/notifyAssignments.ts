import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { sendShiftEmail } from "@/lib/mailer";
import { pushLineMessage } from "@/lib/line";
import { buildUserShiftLines, formatShiftMessage } from "@/lib/shiftMessage";
import type { AppUser, AssignmentsByDate, Period } from "@/lib/types";

// Shared by both the initial confirm route and the re-notify route (used
// when an admin edits assignments after confirming) — same per-user
// send loop, only the message headline differs.
export async function notifyAllAssignedStaff(
  adminDb: Firestore,
  period: Period,
  byDate: AssignmentsByDate,
  headline: string,
): Promise<Record<string, "sent" | "failed">> {
  const perUserShifts = buildUserShiftLines(byDate, period.slots);
  const results: Record<string, "sent" | "failed"> = {};

  for (const [uid, shifts] of Object.entries(perUserShifts)) {
    try {
      const userSnap = await adminDb.doc(`users/${uid}`).get();
      const user = userSnap.data() as AppUser | undefined;
      if (!user) throw new Error("user not found");

      const text = formatShiftMessage(period.title, shifts, headline);

      if (user.notifyChannel === "line") {
        if (!user.lineUserId) throw new Error("LINE未連携");
        await pushLineMessage(user.lineUserId, text);
      } else {
        if (!user.email) throw new Error("メールアドレス未設定");
        await sendShiftEmail(
          user.email,
          `${period.title}のシフトについて`,
          text,
        );
      }

      results[uid] = "sent";
    } catch (err) {
      console.error(`スタッフ(${uid})への通知送信に失敗しました`, err);
      results[uid] = "failed";
    }
  }

  return results;
}
