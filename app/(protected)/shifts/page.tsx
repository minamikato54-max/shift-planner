"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAssignments } from "@/lib/assignments";
import { listPeriods } from "@/lib/periods";
import type { Period } from "@/lib/types";

export default function ShiftsListPage() {
  const [periods, setPeriods] = useState<Period[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const allPeriods = await listPeriods();
        // Small-scale app (single workplace, limited number of periods) —
        // a direct getDoc-by-ID check per period is cheap and keeps
        // `periods` from needing a duplicated/denormalized confirmed flag
        // that could drift out of sync with `assignments`.
        const checks = await Promise.all(
          allPeriods.map(async (p) => ({
            period: p,
            assignments: await getAssignments(p.id),
          })),
        );
        setPeriods(
          checks.filter((c) => c.assignments?.confirmed).map((c) => c.period),
        );
      } catch (err) {
        console.error("確定シフト一覧の取得に失敗しました", err);
        setError("確定シフト一覧の取得に失敗しました。");
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">確定シフト</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {periods === null && !error && (
        <p className="text-sm text-zinc-500">読み込み中...</p>
      )}
      {periods?.length === 0 && (
        <p className="text-sm text-zinc-500">
          確定済みのシフトはまだありません。
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {periods?.map((period) => (
          <li key={period.id}>
            <Link
              href={`/shifts/${period.id}`}
              className="block rounded-md border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span className="font-medium">{period.title}</span>
              <span className="ml-2 text-sm text-zinc-500">
                {period.startDate} 〜 {period.endDate}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
