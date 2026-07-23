import type { AssignmentsByDate, Slot } from "@/lib/types";

export type UserShiftLine = {
  date: string;
  slotName: string;
  start: string;
  end: string;
};

// Groups `assignments.byDate` (date -> slotName -> uid[]) into per-user shift
// lists, so each staff member's notification only contains their own portion.
export function buildUserShiftLines(
  byDate: AssignmentsByDate,
  slots: Slot[],
): Record<string, UserShiftLine[]> {
  const slotByName = new Map(slots.map((s) => [s.name, s]));
  const result: Record<string, UserShiftLine[]> = {};

  for (const [date, slotAssignments] of Object.entries(byDate)) {
    for (const [slotName, uids] of Object.entries(slotAssignments)) {
      const slot = slotByName.get(slotName);
      if (!slot) continue;

      for (const uid of uids) {
        (result[uid] ??= []).push({
          date,
          slotName,
          start: slot.start,
          end: slot.end,
        });
      }
    }
  }

  for (const lines of Object.values(result)) {
    lines.sort((a, b) => a.date.localeCompare(b.date));
  }

  return result;
}

export function formatShiftMessage(
  periodTitle: string,
  lines: UserShiftLine[],
  headline: string = `${periodTitle}のシフトが確定しました。`,
): string {
  if (lines.length === 0) {
    return `${periodTitle}\n今回、担当のシフトはありません。`;
  }

  const body = lines
    .map((l) => `${l.date} ${l.slotName}（${l.start}〜${l.end}）`)
    .join("\n");

  return `${headline}\n\n${body}`;
}
