import { dayOfWeekLabel, enumerateDates } from "@/lib/dateUtils";
import type { Availability, Period } from "@/lib/types";

type Props = {
  period: Period;
  availabilities: Availability[];
};

export default function SubmissionsTable({ period, availabilities }: Props) {
  const dates = enumerateDates(period.startDate, period.endDate);

  if (availabilities.length === 0) {
    return <p className="text-sm text-zinc-500">まだ提出がありません。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 border-b border-zinc-200 bg-white px-3 py-2 text-left dark:border-zinc-800 dark:bg-zinc-950">
              スタッフ
            </th>
            {dates.map((date) => (
              <th
                key={date}
                className="border-b border-zinc-200 px-3 py-2 text-left whitespace-nowrap dark:border-zinc-800"
              >
                {date}（{dayOfWeekLabel(date)}）
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {availabilities.map((a) => (
            <tr key={a.id}>
              <td className="sticky left-0 border-b border-zinc-200 bg-white px-3 py-2 font-medium whitespace-nowrap dark:border-zinc-800 dark:bg-zinc-950">
                {a.userName}
              </td>
              {dates.map((date) => {
                const entry = a.entries[date];
                return (
                  <td
                    key={date}
                    className="border-b border-zinc-200 px-3 py-2 whitespace-nowrap dark:border-zinc-800"
                  >
                    {!entry ? (
                      <span className="text-zinc-400">-</span>
                    ) : entry.status === "ng" ? (
                      <span className="text-red-500">✕</span>
                    ) : (
                      <span>
                        {entry.start}〜{entry.end}
                      </span>
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
