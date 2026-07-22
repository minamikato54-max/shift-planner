"use client";

import { useState } from "react";
import { enumerateDates } from "@/lib/dateUtils";
import { saveAvailability } from "@/lib/availabilities";
import type { AvailabilityEntry, Period } from "@/lib/types";

type Props = {
  period: Period;
  userId: string;
  userName: string;
  initialEntries: Record<string, AvailabilityEntry>;
  defaultShift: { start: string; end: string } | null;
};

export default function AvailabilityGrid({
  period,
  userId,
  userName,
  initialEntries,
  defaultShift,
}: Props) {
  const dates = enumerateDates(period.startDate, period.endDate);

  const [entries, setEntries] = useState<Record<string, AvailabilityEntry>>(
    () => {
      const initial: Record<string, AvailabilityEntry> = {};
      for (const date of dates) {
        initial[date] =
          initialEntries[date] ??
          (defaultShift
            ? { status: "ok", start: defaultShift.start, end: defaultShift.end }
            : { status: "ng" });
      }
      return initial;
    },
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setNg(date: string) {
    setEntries((prev) => ({ ...prev, [date]: { status: "ng" } }));
    setSaved(false);
  }

  function setOk(date: string, start: string, end: string) {
    setEntries((prev) => ({ ...prev, [date]: { status: "ok", start, end } }));
    setSaved(false);
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      await saveAvailability(period.id, userId, userName, entries);
      setSaved(true);
    } catch (err) {
      console.error("希望の保存に失敗しました", err);
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {dates.map((date) => {
          const entry = entries[date];
          const isOk = entry.status === "ok";
          return (
            <div key={date} className="flex flex-wrap items-center gap-3 py-2">
              <span className="w-28 shrink-0 text-sm">{date}</span>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name={`status-${date}`}
                  checked={isOk}
                  onChange={() =>
                    setOk(
                      date,
                      isOk ? entry.start : (defaultShift?.start ?? "09:00"),
                      isOk ? entry.end : (defaultShift?.end ?? "17:00"),
                    )
                  }
                />
                出勤可
              </label>
              {isOk && (
                <span className="flex items-center gap-1">
                  <input
                    type="time"
                    value={entry.start}
                    onChange={(e) => setOk(date, e.target.value, entry.end)}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  〜
                  <input
                    type="time"
                    value={entry.end}
                    onChange={(e) => setOk(date, entry.start, e.target.value)}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </span>
              )}
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name={`status-${date}`}
                  checked={!isOk}
                  onChange={() => setNg(date)}
                />
                出勤不可
              </label>
            </div>
          );
        })}
      </div>

      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {pending ? "保存中..." : "希望を保存する"}
        </button>
        {saved && <p className="mt-2 text-sm text-green-600">保存しました</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
