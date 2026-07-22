import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Availability, AvailabilityEntry } from "@/lib/types";

const availabilitiesRef = collection(db, "availabilities");

function docId(periodId: string, userId: string): string {
  return `${periodId}_${userId}`;
}

// Sorted client-side (createdAt ascending = submission order) instead of a
// Firestore `orderBy`, so this query only needs the auto-created single-field
// index on `periodId` — never a manual composite index. Mirrors the fix
// nomi-check needed after a past silent onSnapshot failure.
function sortByCreatedAtAsc(items: Availability[]): Availability[] {
  return [...items].sort(
    (a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0),
  );
}

export async function getAvailability(
  periodId: string,
  userId: string,
): Promise<Availability | null> {
  const snap = await getDoc(doc(availabilitiesRef, docId(periodId, userId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Availability;
}

export async function saveAvailability(
  periodId: string,
  userId: string,
  userName: string,
  entries: Record<string, AvailabilityEntry>,
): Promise<void> {
  const ref = doc(availabilitiesRef, docId(periodId, userId));
  const existing = await getDoc(ref);

  await setDoc(
    ref,
    {
      periodId,
      userId,
      userName,
      entries,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}

export async function listAvailabilitiesForPeriod(
  periodId: string,
): Promise<Availability[]> {
  const q = query(availabilitiesRef, where("periodId", "==", periodId));
  const snap = await getDocs(q);
  return sortByCreatedAtAsc(
    snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Availability),
  );
}
