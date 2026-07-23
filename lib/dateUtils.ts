// Inclusive list of "YYYY-MM-DD" dates from start to end.
//
// Parsed and incremented entirely in UTC (not local time) so the result
// never shifts by a day depending on the browser/server timezone. A plain
// "YYYY-MM-DDT00:00:00" string (no timezone suffix) parses as LOCAL
// midnight, and toISOString() then converts that back to UTC — in JST
// (UTC+9) that silently rolls every date back by one day. Using an
// explicit "Z" suffix and UTC-based increment avoids that entirely.
export function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const last = new Date(`${endDate}T00:00:00Z`);

  while (cursor.getTime() <= last.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

const DAY_OF_WEEK_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// Day-of-week label (e.g. "土") for a "YYYY-MM-DD" date string. Also parsed
// as UTC, matching enumerateDates, so the label always corresponds to the
// date string's own calendar day regardless of local timezone.
export function dayOfWeekLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return DAY_OF_WEEK_LABELS[d.getUTCDay()];
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export type TimeRange = { start: string; end: string };

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return (
    timeToMinutes(a.start) < timeToMinutes(b.end) &&
    timeToMinutes(b.start) < timeToMinutes(a.end)
  );
}

export function containsRange(outer: TimeRange, inner: TimeRange): boolean {
  return (
    timeToMinutes(outer.start) <= timeToMinutes(inner.start) &&
    timeToMinutes(outer.end) >= timeToMinutes(inner.end)
  );
}
