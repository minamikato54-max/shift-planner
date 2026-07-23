"use client";

import { useState } from "react";
import ShiftBoardTable from "@/components/ShiftBoardTable";
import NotifyResultsList from "@/components/NotifyResultsList";
import { generateDraftAssignments } from "@/lib/autoAssign";
import { dayOfWeekLabel, enumerateDates } from "@/lib/dateUtils";
import {
  confirmAndNotify,
  renotify,
  saveDraftAssignments,
  updateDraftByDate,
} from "@/lib/assignments";
import { auth } from "@/lib/firebase";
import type {
  Assignments,
  AssignmentsByDate,
  Availability,
  Period,
  Shortfall,
} from "@/lib/types";

type Props = {
  period: Period;
  availabilities: Availability[];
  initialAssignments: Assignments | null;
};

function recomputeShortfalls(
  period: Period,
  byDate: AssignmentsByDate,
): Shortfall[] {
  const shortfalls: Shortfall[] = [];
  for (const date of Object.keys(byDate)) {
    for (const slot of period.slots) {
      const assigned = byDate[date]?.[slot.name]?.length ?? 0;
      if (assigned < slot.requiredCount) {
        shortfalls.push({
          date,
          slotName: slot.name,
          required: slot.requiredCount,
          assigned,
        });
      }
    }
  }
  return shortfalls;
}

export default function DraftShiftBoard({
  period,
  availabilities,
  initialAssignments,
}: Props) {
  const [byDate, setByDate] = useState<AssignmentsByDate>(
    initialAssignments?.byDate ?? {},
  );
  const [staffNames] = useState<Record<string, string>>(
    initialAssignments?.staffNames ??
      Object.fromEntries(availabilities.map((a) => [a.userId, a.userName])),
  );
  const [shortfalls, setShortfalls] = useState<Shortfall[]>(
    initialAssignments?.shortfalls ?? [],
  );
  const [confirmed, setConfirmed] = useState(
    initialAssignments?.confirmed ?? false,
  );
  const [notifyResults, setNotifyResults] = useState(
    initialAssignments?.notifyResults,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDraft = Object.keys(byDate).length > 0;
  const dates = enumerateDates(period.startDate, period.endDate);

  async function handleGenerate() {
    setPending(true);
    setError(null);
    try {
      const result = generateDraftAssignments(period, availabilities);
      await saveDraftAssignments(
        period.id,
        result.byDate,
        result.shortfalls,
        availabilities,
      );
      setByDate(result.byDate);
      setShortfalls(result.shortfalls);
    } catch (err) {
      console.error("下書きの自動生成に失敗しました", err);
      setError("自動生成に失敗しました。もう一度お試しください。");
    } finally {
      setPending(false);
    }
  }

  async function persist(nextByDate: AssignmentsByDate) {
    const nextShortfalls = recomputeShortfalls(period, nextByDate);
    setPending(true);
    setError(null);
    try {
      await updateDraftByDate(period.id, nextByDate, nextShortfalls);
      setByDate(nextByDate);
      setShortfalls(nextShortfalls);
    } catch (err) {
      console.error("下書きの更新に失敗しました", err);
      setError("更新に失敗しました。もう一度お試しください。");
    } finally {
      setPending(false);
    }
  }

  function removeStaff(date: string, slotName: string, uid: string) {
    const next: AssignmentsByDate = {
      ...byDate,
      [date]: {
        ...byDate[date],
        [slotName]: (byDate[date]?.[slotName] ?? []).filter((u) => u !== uid),
      },
    };
    void persist(next);
  }

  function addStaff(date: string, slotName: string, uid: string) {
    if (!uid) return;
    const current = byDate[date]?.[slotName] ?? [];
    if (current.includes(uid)) return;
    const next: AssignmentsByDate = {
      ...byDate,
      [date]: { ...byDate[date], [slotName]: [...current, uid] },
    };
    void persist(next);
  }

  async function handleConfirm() {
    if (!auth.currentUser) return;
    setPending(true);
    setError(null);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const { results } = await confirmAndNotify(period.id, idToken);
      setConfirmed(true);
      setNotifyResults(results);
    } catch (err) {
      console.error("シフトの確定に失敗しました", err);
      setError(err instanceof Error ? err.message : "確定に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  async function handleRenotify() {
    if (!auth.currentUser) return;
    setPending(true);
    setError(null);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const { results } = await renotify(period.id, idToken);
      setNotifyResults(results);
    } catch (err) {
      console.error("再通知に失敗しました", err);
      setError(err instanceof Error ? err.message : "再通知に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!confirmed && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={pending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {hasDraft ? "下書きを再生成する" : "下書きを自動生成する"}
          </button>
          {hasDraft && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="rounded-md border border-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white"
            >
              この内容で確定して通知する
            </button>
          )}
        </div>
      )}
      {confirmed && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-green-600">
            確定済みです。下の「手動調整」で内容を変更した場合は、再通知ボタンで全員に最新の内容を送り直せます。
          </p>
          <button
            type="button"
            onClick={handleRenotify}
            disabled={pending}
            className="rounded-md border border-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white"
          >
            変更を全員に再通知する
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {hasDraft && (
        <ShiftBoardTable
          period={period}
          byDate={byDate}
          staffNames={staffNames}
          shortfalls={shortfalls}
        />
      )}

      {hasDraft && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-500">手動調整</h2>
          {dates.map((date) => (
            <div key={date} className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                {date}（{dayOfWeekLabel(date)}）
              </p>
              {period.slots.map((slot) => {
                const uids = byDate[date]?.[slot.name] ?? [];
                return (
                  <div
                    key={slot.name}
                    className="ml-4 flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span className="w-20 shrink-0 text-zinc-500">
                      {slot.name}
                    </span>
                    {uids.map((uid) => (
                      <span
                        key={uid}
                        className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800"
                      >
                        {staffNames[uid] ?? uid}
                        <button
                          type="button"
                          onClick={() => removeStaff(date, slot.name, uid)}
                          className="text-zinc-500 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        addStaff(date, slot.name, e.target.value);
                        e.target.value = "";
                      }}
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="" disabled>
                        + 追加
                      </option>
                      {availabilities
                        .filter((a) => !uids.includes(a.userId))
                        .map((a) => (
                          <option key={a.userId} value={a.userId}>
                            {a.userName}
                          </option>
                        ))}
                    </select>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {notifyResults && (
        <NotifyResultsList results={notifyResults} staffNames={staffNames} />
      )}
    </div>
  );
}
