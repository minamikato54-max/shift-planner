import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { notifyAllAssignedStaff } from "@/lib/notifyAssignments";
import type { AssignmentsByDate, Period } from "@/lib/types";

// Re-sends notifications for an ALREADY-confirmed period, using whatever
// `byDate` currently holds — used when an admin edits assignments (e.g.
// swaps someone out) after the initial confirm/notify already went out.
// Unlike /confirm, this can be called repeatedly (no "already sent" guard);
// each call overwrites `notifyResults` with the latest outcome. Note: a
// staff member entirely REMOVED from byDate after being notified once does
// not get an explicit "you're no longer scheduled" message — they simply
// stop appearing in the next notification. Re-notify only tells people
// their CURRENT assignment, not what changed.
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
  const assignmentsSnap = await assignmentsRef.get();
  const assignmentsData = assignmentsSnap.data();
  if (!assignmentsSnap.exists || !assignmentsData?.confirmed) {
    return Response.json({ error: "not yet confirmed" }, { status: 409 });
  }
  const byDate = assignmentsData.byDate as AssignmentsByDate;

  const results = await notifyAllAssignedStaff(
    adminDb,
    period,
    byDate,
    `${period.title}のシフト内容が更新されました。`,
  );

  await assignmentsRef.update({ notifyResults: results });
  return Response.json({ results });
}
