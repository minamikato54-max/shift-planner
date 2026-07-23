import { dayOfWeekLabel, enumerateDates } from "@/lib/dateUtils";
import type { AssignmentsByDate, Period, Shortfall } from "@/lib/types";

type Props = {
  period: Period;
  byDate: AssignmentsByDate;
  staffNames: Record<string, string>;
  shortfalls?: Shortfall[];
};

// Read-only date x slot grid. Reused by the admin draft screen (wrapped with
// edit controls) and the all-staff confirmed-shift view (as-is).
export default function ShiftBoardTable({
  period,
  byDate,
  staffNames,
  shortfalls = [],
}: Props) {
  const dates = enumerateDates(period.startDate, period.endDate);
  const shortfallKey = (date: string, slotName: string) =>
    `${date}__${slotName}`;
  const shortfallSet = new Set(
    shortfalls.map((s) => shortfallKey(s.date, s.slotName)),
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 border-b border-zinc-200 bg-white px-3 py-2 text-left dark:border-zinc-800 dark:bg-zinc-950">
              日付
            </th>
            {period.slots.map((slot) => (
              <th
                key={slot.name}
                className="border-b border-zinc-200 px-3 py-2 text-left whitespace-nowrap dark:border-zinc-800"
              >
                {slot.name}（{slot.start}〜{slot.end}／{slot.requiredCount}人）
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((date) => (
            <tr key={date}>
              <td className="sticky left-0 border-b border-zinc-200 bg-white px-3 py-2 font-medium whitespace-nowrap dark:border-zinc-800 dark:bg-zinc-950">
                {date}（{dayOfWeekLabel(date)}）
              </td>
              {period.slots.map((slot) => {
                const uids = byDate[date]?.[slot.name] ?? [];
                const isShort = shortfallSet.has(shortfallKey(date, slot.name));
                return (
                  <td
                    key={slot.name}
                    className={`border-b border-zinc-200 px-3 py-2 align-top dark:border-zinc-800 ${
                      isShort ? "bg-amber-50 dark:bg-amber-950/40" : ""
                    }`}
                  >
                    {uids.length === 0 ? (
                      <span className="text-zinc-400">-</span>
                    ) : (
                      <ul>
                        {uids.map((uid) => (
                          <li key={uid}>{staffNames[uid] ?? uid}</li>
                        ))}
                      </ul>
                    )}
                    {isShort && (
                      <p className="mt-1 text-xs text-amber-600">
                        不足 {slot.requiredCount - uids.length}人
                      </p>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
