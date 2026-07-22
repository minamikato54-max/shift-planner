"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

export default function NavBar() {
  const { appUser } = useAuth();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          Shift Planner
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            ホーム
          </Link>
          <Link href="/availability" className="hover:underline">
            希望提出
          </Link>
          <Link href="/shifts" className="hover:underline">
            確定シフト
          </Link>
          <Link href="/profile" className="hover:underline">
            プロフィール
          </Link>
          {appUser?.role === "admin" && (
            <Link href="/admin/periods" className="hover:underline">
              管理者メニュー
            </Link>
          )}
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="text-zinc-500 hover:underline"
          >
            サインアウト
          </button>
        </nav>
      </div>
    </header>
  );
}
