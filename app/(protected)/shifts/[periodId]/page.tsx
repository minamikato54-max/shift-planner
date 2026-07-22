"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ShiftBoardTable from "@/components/ShiftBoardTable";
import { getAssignments } from "@/lib/assignments";
import { getPeriod } from "@/lib/periods";
import type { Assignments, Period } from "@/lib/types";

export default function ShiftDetailPage() {
  const { periodId } = useParams<{ periodId: string }>();

  const [period, setPeriod] = useState<Period | null>(null);
  const [assignments, setAssignments] = useState<Assignments | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, a] = await Promise.all([
          getPeriod(periodId),
          getAssignments(periodId),
        ]);
        setPeriod(p);
        setAssignments(a);
      } catch (err) {
        console.error("確定シフトの取得に失敗しました", err);
        setError("確定シフトの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [periodId]);

  if (loading) return <p className="text-sm text-zinc-500">読み込み中...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!period || !assignments?.confirmed) {
    return (
      <p className="text-sm text-zinc-500">
        確定済みのシフトが見つかりません。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{period.title} — 確定シフト</h1>
      <ShiftBoardTable
        period={period}
        byDate={assignments.byDate}
        staffNames={assignments.staffNames}
      />
    </div>
  );
}
