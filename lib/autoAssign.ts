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

// Nobody is assigned on a 4th consecutive working day — a fixed business
// rule, not configurable per period. "Working day" means assigned to ANY
// slot that day (not per-slot).
const MAX_CONSECUTIVE_DAYS = 3;

// Deterministic, non-solver assignment: for each date x slot, pick staff whose
// declared "ok" range for that date fully contains the slot's time window,
// preferring whoever has the fewest assignments so far this period (simple
// load balancing), while excluding anyone already at the consecutive-day cap.
// Ties break by `availabilities` order (expected to be pre-sorted by
// createdAt ascending = submission order). Same-day slots are only excluded
// when their time ranges actually overlap — a person whose declared range
// spans two adjacent slots (e.g. 08:00-16:00 covering both a 09:00-13:00 and
// 13:00-18:00 slot) may legally be picked for both.
export function generateDraftAssignments(
  period: Period,
  availabilities: Availability[],
): DraftResult {
  const dates = enumerateDates(period.startDate, period.endDate);
  const byDate: AssignmentsByDate = {};
  const shortfalls: Shortfall[] = [];
  const countByUser = new Map<string, number>();
  const consecutiveStreak = new Map<string, number>();
  const allUids = new Set(availabilities.map((a) => a.userId));

  for (const date of dates) {
    const assignedRangesToday = new Map<
      string,
      { start: string; end: string }[]
    >();
    const workedToday = new Set<string>();
    byDate[date] = {};

    // Anyone who already worked the preceding MAX_CONSECUTIVE_DAYS days in a
    // row is excluded today entirely (across every slot), not just from one
    // slot — otherwise they could still rack up a 4th day via a different
    // slot on the same date.
    const blockedByConsecutiveCap = new Set(
      [...consecutiveStreak.entries()]
        .filter(([, streak]) => streak >= MAX_CONSECUTIVE_DAYS)
        .map(([uid]) => uid),
    );

    for (const slot of period.slots) {
      const picked = pickCandidatesForSlot(
        slot,
        date,
        availabilities,
        assignedRangesToday,
        countByUser,
        blockedByConsecutiveCap,
      );

      for (const uid of picked) workedToday.add(uid);
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

    for (const uid of allUids) {
      consecutiveStreak.set(
        uid,
        workedToday.has(uid) ? (consecutiveStreak.get(uid) ?? 0) + 1 : 0,
      );
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
  blockedByConsecutiveCap: Set<string>,
): string[] {
  const candidates = availabilities
    .filter((a) => {
      if (blockedByConsecutiveCap.has(a.userId)) return false;

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
