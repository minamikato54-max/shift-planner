import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { AppUser, NotifyChannel } from "@/lib/types";

export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as AppUser;
}

// Called once per login from AuthContext. Creates the user doc with the
// default role "staff" if it doesn't exist yet; admin promotion is a manual
// Firebase Console edit (never done from client code).
export async function ensureUserDoc(user: User): Promise<AppUser> {
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return { uid: existing.id, ...existing.data() } as AppUser;
  }

  const newUser = {
    displayName: user.displayName ?? "",
    email: user.email ?? "",
    role: "staff" as const,
    notifyChannel: "gmail" as const,
    lineUserId: null,
    defaultShift: null,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, newUser);
  return { uid: user.uid, ...newUser, createdAt: null };
}

export async function updateNotifySettings(
  uid: string,
  patch: { notifyChannel: NotifyChannel; lineUserId: string | null },
): Promise<void> {
  await setDoc(doc(db, "users", uid), patch, { merge: true });
}

export async function updateDefaultShift(
  uid: string,
  defaultShift: { start: string; end: string } | null,
): Promise<void> {
  await setDoc(doc(db, "users", uid), { defaultShift }, { merge: true });
}
