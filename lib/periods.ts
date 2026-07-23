import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Period, Slot } from "@/lib/types";

const periodsRef = collection(db, "periods");

function sortByStartDateDesc(periods: Period[]): Period[] {
  return [...periods].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
}

export async function listPeriods(): Promise<Period[]> {
  const snap = await getDocs(periodsRef);
  return sortByStartDateDesc(
    snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Period),
  );
}

export async function getPeriod(id: string): Promise<Period | null> {
  const snap = await getDoc(doc(db, "periods", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Period;
}

export async function createPeriod(
  createdBy: string,
  input: { title: string; startDate: string; endDate: string; slots: Slot[] },
): Promise<string> {
  const ref = await addDoc(periodsRef, {
    ...input,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePeriod(
  id: string,
  input: { title: string; startDate: string; endDate: string; slots: Slot[] },
): Promise<void> {
  await updateDoc(doc(db, "periods", id), { ...input });
}

// Deletes the period doc only. Any `availabilities`/`assignments` documents
// referencing this periodId are intentionally left as-is (no cascade
// delete) — out of scope per spec.md, and this app's scale doesn't warrant
// the extra cleanup logic.
export async function deletePeriod(id: string): Promise<void> {
  await deleteDoc(doc(db, "periods", id));
}
