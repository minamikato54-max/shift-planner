import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { notifyAllAssignedStaff } from "@/lib/notifyAssignments";
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken";
import type { AssignmentsByDate, Period } from "@/lib/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ periodId: string }> },
) {
  const { periodId } = await params;
  const adminDb = getAdminDb();

  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const decoded = await verifyFirebaseIdToken(idToken).catch(() => null);
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

  const results = await notifyAllAssignedStaff(
    adminDb,
    period,
    byDate,
    `${period.title}のシフトが確定しました。`,
  );

  await assignmentsRef.update({ notifyResults: results });
  return Response.json({ results });
}
