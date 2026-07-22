"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { ensureUserDoc } from "@/lib/users";
import type { AppUser } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  appUser: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tracks the live subscription to the current user's own doc, so it can
    // be torn down whenever auth state changes again (sign-out, different
    // user) rather than leaking a listener per login.
    let unsubDoc: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      unsubDoc?.();
      unsubDoc = undefined;

      setUser(u);
      if (!u) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      try {
        await ensureUserDoc(u);
      } catch (err) {
        console.error("ユーザードキュメントの作成に失敗しました", err);
      }

      // Live-subscribe to the own user doc so a role change made in the
      // Firebase Console (staff -> admin) shows up without re-login.
      unsubDoc = onSnapshot(
        doc(db, "users", u.uid),
        (snap) => {
          setAppUser(
            snap.exists()
              ? ({ uid: snap.id, ...snap.data() } as AppUser)
              : null,
          );
          setLoading(false);
        },
        (err) => {
          console.error("ユーザー情報の取得に失敗しました", err);
          setLoading(false);
        },
      );
    });

    return () => {
      unsubDoc?.();
      unsubAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
