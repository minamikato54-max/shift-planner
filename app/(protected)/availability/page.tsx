"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listPeriods } from "@/lib/periods";
import type { Period } from "@/lib/types";

export default function AvailabilityListPage() {
  const [periods, setPeriods] = useState<Period[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">希望提出</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {periods === null && !error && (
        <p className="text-sm text-zinc-500">読み込み中...</p>
      )}
      {periods?.length === 0 && (
        <p className="text-sm text-zinc-500">募集期間がまだありません。</p>
      )}
      <ul className="flex flex-col gap-2">
        {periods?.map((period) => (
          <li key={period.id}>
            <Link
              href={`/availability/${period.id}`}
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
