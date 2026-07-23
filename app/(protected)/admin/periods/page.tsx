"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deletePeriod, listPeriods } from "@/lib/periods";
import type { Period } from "@/lib/types";

export default function AdminPeriodsPage() {
  const [periods, setPeriods] = useState<Period[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setPeriods(await listPeriods());
      } catch (err) {
        console.error("募集期間の取得に失敗しました", err);
        setError("募集期間の取得に失敗しました。");
      }
    })();
  }, []);

  async function handleDelete(period: Period) {
    if (
      !window.confirm(
        `「${period.title}」を削除します。よろしいですか？（提出済みの希望や下書きシフトは削除されません）`,
      )
    ) {
      return;
    }
    setDeletingId(period.id);
    setError(null);
    try {
      await deletePeriod(period.id);
      setPeriods((prev) => prev?.filter((p) => p.id !== period.id) ?? null);
    } catch (err) {
      console.error("募集期間の削除に失敗しました", err);
      setError("削除に失敗しました。もう一度お試しください。");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">募集期間一覧</h1>
        <Link
          href="/admin/periods/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          新規作成
        </Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {periods === null && !error && (
        <p className="text-sm text-zinc-500">読み込み中...</p>
      )}
      <ul className="flex flex-col gap-2">
        {periods?.map((period) => (
          <li
            key={period.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <span className="font-medium">{period.title}</span>
              <span className="ml-2 text-sm text-zinc-500">
                {period.startDate} 〜 {period.endDate}
              </span>
            </div>
            <div className="flex gap-3 text-sm">
              <Link
                href={`/admin/submissions/${period.id}`}
                className="text-blue-600 hover:underline"
              >
                提出状況
              </Link>
              <Link
                href={`/admin/draft/${period.id}`}
                className="text-blue-600 hover:underline"
              >
                下書きシフト
              </Link>
              <Link
                href={`/admin/periods/${period.id}/edit`}
                className="text-blue-600 hover:underline"
              >
                編集
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(period)}
                disabled={deletingId === period.id}
                className="text-red-600 hover:underline disabled:opacity-50"
              >
                {deletingId === period.id ? "削除中..." : "削除"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
