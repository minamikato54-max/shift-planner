import type { Timestamp } from "firebase/firestore";

export type Role = "staff" | "admin";
export type NotifyChannel = "gmail" | "line";

export type AppUser = {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  notifyChannel: NotifyChannel;
  lineUserId: string | null;
  defaultShift: { start: string; end: string } | null;
  createdAt: Timestamp | null;
};

export type Slot = {
  name: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  requiredCount: number;
};

export type Period = {
  id: string;
  title: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  slots: Slot[];
  createdBy: string;
  createdAt: Timestamp | null;
};

export type AvailabilityEntry =
  { status: "ok"; start: string; end: string } | { status: "ng" };

export type Availability = {
  id: string;
  periodId: string;
  userId: string;
  userName: string;
  entries: Record<string, AvailabilityEntry>;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type AssignmentsByDate = Record<string, Record<string, string[]>>;

export type Shortfall = {
  date: string;
  slotName: string;
  required: number;
  assigned: number;
};

export type Assignments = {
  id: string;
  periodId: string;
  byDate: AssignmentsByDate;
  staffNames: Record<string, string>;
  shortfalls: Shortfall[];
  confirmed: boolean;
  confirmedAt: Timestamp | null;
  notifyResults?: Record<string, "sent" | "failed">;
};
