"use client";

import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { auth, googleProvider } from "@/lib/firebase";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  async function handleLogin() {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("ログインに失敗しました", err);
      setError("ログインに失敗しました。もう一度お試しください。");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Shift Planner</h1>
        <p className="mt-2 text-sm text-zinc-500">
          シフト希望提出・自動割当・通知アプリ
        </p>
      </div>
      <button
        type="button"
        onClick={handleLogin}
        className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
      >
        Googleでログイン
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
