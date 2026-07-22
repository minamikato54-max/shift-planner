import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
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
