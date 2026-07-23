"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PeriodForm from "@/components/PeriodForm";
import { getPeriod } from "@/lib/periods";
import type { Period } from "@/lib/types";

export default function EditPeriodPage() {
  const { periodId } = useParams<{ periodId: string }>();

  const [period, setPeriod] = useState<Period | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setPeriod(await getPeriod(periodId));
      } catch (err) {
        console.error("募集期間の取得に失敗しました", err);
        setError("募集期間の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [periodId]);

  if (loading) return <p className="text-sm text-zinc-500">読み込み中...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!period)
    return <p className="text-sm text-zinc-500">募集期間が見つかりません。</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">募集期間の編集</h1>
      <PeriodForm editingPeriod={period} />
    </div>
  );
}
