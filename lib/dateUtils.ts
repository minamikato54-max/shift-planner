// Inclusive list of "YYYY-MM-DD" dates from start to end.
export function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const last = new Date(`${endDate}T00:00:00`);

  while (cursor.getTime() <= last.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
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
