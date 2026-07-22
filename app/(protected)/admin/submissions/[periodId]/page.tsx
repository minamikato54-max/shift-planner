"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SubmissionsTable from "@/components/SubmissionsTable";
import { listAvailabilitiesForPeriod } from "@/lib/availabilities";
import { getPeriod } from "@/lib/periods";
import type { Availability, Period } from "@/lib/types";

export default function AdminSubmissionsPage() {
  const { periodId } = useParams<{ periodId: string }>();

  const [period, setPeriod] = useState<Period | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, a] = await Promise.all([
          getPeriod(periodId),
          listAvailabilitiesForPeriod(periodId),
        ]);
        setPeriod(p);
        setAvailabilities(a);
      } catch (err) {
        console.error("提出状況の取得に失敗しました", err);
        setError("提出状況の取得に失敗しました。");
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
      <h1 className="text-xl font-bold">{period.title} — 提出状況</h1>
      <SubmissionsTable period={period} availabilities={availabilities} />
    </div>
  );
}
