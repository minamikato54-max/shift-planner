"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function HomePage() {
  const { appUser } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">ホーム</h1>
        {appUser && (
          <p className="mt-1 text-sm text-zinc-500">
            {appUser.displayName} さんとしてログイン中（
            {appUser.role === "admin" ? "管理者" : "スタッフ"}）
          </p>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-500">
          スタッフメニュー
        </h2>
        <Link href="/availability" className="text-blue-600 hover:underline">
          シフト希望を提出する
        </Link>
        <Link href="/shifts" className="text-blue-600 hover:underline">
          確定シフトを見る
        </Link>
        <Link href="/profile" className="text-blue-600 hover:underline">
          通知設定・基本勤務時間帯を設定する
        </Link>
      </section>

      {appUser?.role === "admin" && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-500">
            管理者メニュー
          </h2>
          <Link href="/admin/periods" className="text-blue-600 hover:underline">
            募集期間の一覧・作成
          </Link>
        </section>
      )}
    </div>
  );
}
