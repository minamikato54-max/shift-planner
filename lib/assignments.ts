import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Assignments,
  AssignmentsByDate,
  Availability,
  Shortfall,
} from "@/lib/types";

// `assignments` uses periodId as its own document ID — always fetched
// directly by ID, never via a query.
function assignmentsDoc(periodId: string) {
  return doc(db, "assignments", periodId);
}

export async function getAssignments(
  periodId: string,
): Promise<Assignments | null> {
  const snap = await getDoc(assignmentsDoc(periodId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Assignments;
}

export async function saveDraftAssignments(
  periodId: string,
  byDate: AssignmentsByDate,
  shortfalls: Shortfall[],
  availabilities: Availability[],
): Promise<void> {
  const staffNames = Object.fromEntries(
    availabilities.map((a) => [a.userId, a.userName]),
  );

  await setDoc(
    assignmentsDoc(periodId),
    {
      periodId,
      byDate,
      staffNames,
      shortfalls,
      confirmed: false,
      confirmedAt: null,
    },
    { merge: true },
  );
}

export async function updateDraftByDate(
  periodId: string,
  byDate: AssignmentsByDate,
  shortfalls: Shortfall[],
): Promise<void> {
  await updateDoc(assignmentsDoc(periodId), { byDate, shortfalls });
}

export async function confirmAndNotify(
  periodId: string,
  idToken: string,
): Promise<{ results: Record<string, "sent" | "failed"> }> {
  const res = await fetch(`/api/assignments/${periodId}/confirm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `確定に失敗しました（${res.status}）`);
  }

  return res.json();
}

// Re-sends notifications for an already-confirmed period using its current
// byDate — used after an admin edits assignments post-confirm.
export async function renotify(
  periodId: string,
  idToken: string,
): Promise<{ results: Record<string, "sent" | "failed"> }> {
  const res = await fetch(`/api/assignments/${periodId}/renotify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `再通知に失敗しました（${res.status}）`);
  }

  return res.json();
}
