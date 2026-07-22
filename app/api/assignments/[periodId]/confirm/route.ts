import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { sendShiftEmail } from "@/lib/mailer";
import { pushLineMessage } from "@/lib/line";
import { buildUserShiftLines, formatShiftMessage } from "@/lib/shiftMessage";
import type { AppUser, AssignmentsByDate, Period } from "@/lib/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ periodId: string }> },
) {
  const { periodId } = await params;
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const decoded = await adminAuth.verifyIdToken(idToken).catch(() => null);
  if (!decoded) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const callerSnap = await adminDb.doc(`users/${decoded.uid}`).get();
  if (callerSnap.data()?.role !== "admin") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const periodSnap = await adminDb.doc(`periods/${periodId}`).get();
  if (!periodSnap.exists) {
    return Response.json({ error: "period not found" }, { status: 404 });
  }
  const period = periodSnap.data() as Period;

  const assignmentsRef = adminDb.doc(`assignments/${periodId}`);

  let byDate: AssignmentsByDate;
  try {
    // Atomic check-and-set, mirroring nomi-check's takeMedicine() transaction
    // pattern, so a double-click never sends duplicate notifications.
    byDate = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(assignmentsRef);
      if (!snap.exists) throw new Error("assignments not found");
      const data = snap.data()!;
      if (data.confirmed) throw new Error("already confirmed");

      tx.update(assignmentsRef, {
        confirmed: true,
        confirmedAt: FieldValue.serverTimestamp(),
      });
      return data.byDate as AssignmentsByDate;
    });
  } catch (err) {
    console.error("シフト確定処理に失敗しました", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "confirm failed" },
      { status: 409 },
    );
  }

  const perUserShifts = buildUserShiftLines(byDate, period.slots);
  const results: Record<string, "sent" | "failed"> = {};

  for (const [uid, shifts] of Object.entries(perUserShifts)) {
    try {
      const userSnap = await adminDb.doc(`users/${uid}`).get();
      const user = userSnap.data() as AppUser | undefined;
      if (!user) throw new Error("user not found");

      const text = formatShiftMessage(period.title, shifts);

      if (user.notifyChannel === "line") {
        if (!user.lineUserId) throw new Error("LINE未連携");
        await pushLineMessage(user.lineUserId, text);
      } else {
        if (!user.email) throw new Error("メールアドレス未設定");
        await sendShiftEmail(
          user.email,
          `${period.title}のシフトが確定しました`,
          text,
        );
      }

      results[uid] = "sent";
    } catch (err) {
      console.error(`スタッフ(${uid})への通知送信に失敗しました`, err);
      results[uid] = "failed";
    }
  }

  await assignmentsRef.update({ notifyResults: results });
  return Response.json({ results });
}
