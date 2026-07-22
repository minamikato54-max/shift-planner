import { containsRange, enumerateDates, rangesOverlap } from "@/lib/dateUtils";
import type {
  Availability,
  AssignmentsByDate,
  Period,
  Shortfall,
  Slot,
} from "@/lib/types";

export type DraftResult = {
  byDate: AssignmentsByDate;
  shortfalls: Shortfall[];
};

// Deterministic, non-solver assignment: for each date x slot, pick staff whose
// declared "ok" range for that date fully contains the slot's time window,
// preferring whoever has the fewest assignments so far this period (simple
// load balancing). Ties break by `availabilities` order (expected to be
// pre-sorted by createdAt ascending = submission order). Same-day slots are
// only excluded when their time ranges actually overlap — a person whose
// declared range spans two adjacent slots (e.g. 08:00-16:00 covering both a
// 09:00-13:00 and 13:00-18:00 slot) may legally be picked for both.
export function generateDraftAssignments(
  period: Period,
  availabilities: Availability[],
): DraftResult {
  const dates = enumerateDates(period.startDate, period.endDate);
  const byDate: AssignmentsByDate = {};
  const shortfalls: Shortfall[] = [];
  const countByUser = new Map<string, number>();

  for (const date of dates) {
    const assignedRangesToday = new Map<
      string,
      { start: string; end: string }[]
    >();
    byDate[date] = {};

    for (const slot of period.slots) {
      const picked = pickCandidatesForSlot(
        slot,
        date,
        availabilities,
        assignedRangesToday,
        countByUser,
      );

      byDate[date][slot.name] = picked;
      if (picked.length < slot.requiredCount) {
        shortfalls.push({
          date,
          slotName: slot.name,
          required: slot.requiredCount,
          assigned: picked.length,
        });
      }
    }
  }

  return { byDate, shortfalls };
}

function pickCandidatesForSlot(
  slot: Slot,
  date: string,
  availabilities: Availability[],
  assignedRangesToday: Map<string, { start: string; end: string }[]>,
  countByUser: Map<string, number>,
): string[] {
  const candidates = availabilities
    .filter((a) => {
      const entry = a.entries[date];
      if (!entry || entry.status !== "ok") return false;
      if (!containsRange(entry, slot)) return false;

      const rangesToday = assignedRangesToday.get(a.userId) ?? [];
      return !rangesToday.some((r) => rangesOverlap(r, slot));
    })
    .map((a) => a.userId);

  const ordered = stableSortByCount(candidates, countByUser);
  const picked = ordered.slice(0, slot.requiredCount);

  for (const uid of picked) {
    countByUser.set(uid, (countByUser.get(uid) ?? 0) + 1);
    const ranges = assignedRangesToday.get(uid) ?? [];
    ranges.push({ start: slot.start, end: slot.end });
    assignedRangesToday.set(uid, ranges);
  }

  return picked;
}

// Sorts ascending by countByUser while preserving relative order for ties
// (Array#sort is stable per spec since ES2019).
function stableSortByCount(
  uids: string[],
  countByUser: Map<string, number>,
): string[] {
  return [...uids].sort(
    (a, b) => (countByUser.get(a) ?? 0) - (countByUser.get(b) ?? 0),
  );
}
