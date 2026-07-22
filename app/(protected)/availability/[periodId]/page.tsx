"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import { useAuth } from "@/lib/AuthContext";
import { getAvailability } from "@/lib/availabilities";
import { getPeriod } from "@/lib/periods";
import type { Availability, Period } from "@/lib/types";

export default function AvailabilityDetailPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const { user, appUser } = useAuth();

  const [period, setPeriod] = useState<Period | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [p, a] = await Promise.all([
          getPeriod(periodId),
          getAvailability(periodId, user.uid),
        ]);
        setPeriod(p);
        setAvailability(a);
      } catch (err) {
        console.error("希望提出画面の読み込みに失敗しました", err);
        setError("データの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [periodId, user]);

  if (loading) {
    return <p className="text-sm text-zinc-500">読み込み中...</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!period || !user || !appUser) {
    return <p className="text-sm text-zinc-500">募集期間が見つかりません。</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{period.title}</h1>
        <p className="text-sm text-zinc-500">
          {period.startDate} 〜 {period.endDate}
        </p>
      </div>
      <AvailabilityGrid
        period={period}
        userId={user.uid}
        userName={appUser.displayName}
        initialEntries={availability?.entries ?? {}}
        defaultShift={appUser.defaultShift}
      />
    </div>
  );
}
