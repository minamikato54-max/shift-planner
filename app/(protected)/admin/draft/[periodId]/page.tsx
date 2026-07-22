"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import DraftShiftBoard from "@/components/DraftShiftBoard";
import { getAssignments } from "@/lib/assignments";
import { listAvailabilitiesForPeriod } from "@/lib/availabilities";
import { getPeriod } from "@/lib/periods";
import type { Assignments, Availability, Period } from "@/lib/types";

export default function AdminDraftPage() {
  const { periodId } = useParams<{ periodId: string }>();

  const [period, setPeriod] = useState<Period | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [assignments, setAssignments] = useState<Assignments | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, a, existing] = await Promise.all([
          getPeriod(periodId),
          listAvailabilitiesForPeriod(periodId),
          getAssignments(periodId),
        ]);
        setPeriod(p);
        setAvailabilities(a);
        setAssignments(existing);
      } catch (err) {
        console.error("下書きシフト画面の読み込みに失敗しました", err);
        setError("データの読み込みに失敗しました。");
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
      <h1 className="text-xl font-bold">{period.title} — 下書きシフト</h1>
      <DraftShiftBoard
        period={period}
        availabilities={availabilities}
        initialAssignments={assignments}
      />
    </div>
  );
}
