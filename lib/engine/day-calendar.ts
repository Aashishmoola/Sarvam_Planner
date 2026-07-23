// Pure calendar math for the daily view. No Supabase or React imports.
// All times are represented as minutes from 00:00 (0..1440).

export type DaySlot = {
  type: "slot";
  startMinutes: number;
  endMinutes: number;
  isSleep: boolean;
};

export type SleepBand = {
  type: "sleep";
  startMinutes: number;
  endMinutes: number;
};

export type DayItem = DaySlot | SleepBand;

export type FocusPeriodLite = {
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  intensity: "high" | "low";
  color: string;
  days_of_week: number[];
};

export type RenderItem<T> =
  | { kind: "sleep"; startMinutes: number; endMinutes: number }
  | { kind: "slot"; startMinutes: number; endMinutes: number }
  | { kind: "assignment"; startMinutes: number; endMinutes: number; assignment: T };

export const SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = 48;
export const MINUTES_PER_DAY = 1440;

export function minutesToHHMM(m: number): string {
  const mm = ((m % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(mm / 60);
  const min = mm % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

/** True if the half-open slot [start, end) is inside the sleep window. */
function slotInWindow(
  slotStart: number,
  slotEnd: number,
  winStart: number,
  winEnd: number,
): boolean {
  if (winStart === winEnd) return false; // no window
  if (winStart < winEnd) {
    // Non-wrapping (e.g. a daytime nap).
    return slotStart >= winStart && slotEnd <= winEnd;
  }
  // Wrapping past midnight: [winStart, 1440) ∪ [0, winEnd).
  return slotStart >= winStart || slotEnd <= winEnd;
}

/**
 * Build 48 half-hour slots from 00:00 to 24:00, marking which fall in the
 * user's sleep window. Sleep window is given as "HH:MM" and may wrap midnight.
 */
export function buildDayGrid(config: {
  sleep_start: string;
  sleep_end: string;
}): DaySlot[] {
  const winStart = hhmmToMinutes(config.sleep_start);
  const winEnd = hhmmToMinutes(config.sleep_end);

  const slots: DaySlot[] = [];
  for (let i = 0; i < SLOTS_PER_DAY; i++) {
    const startMinutes = i * SLOT_MINUTES;
    const endMinutes = startMinutes + SLOT_MINUTES;
    slots.push({
      type: "slot",
      startMinutes,
      endMinutes,
      isSleep: slotInWindow(startMinutes, endMinutes, winStart, winEnd),
    });
  }
  return slots;
}

/** Merge consecutive sleep slots into single bands; keep waking slots as-is. */
export function collapseSleepBands(slots: DaySlot[]): DayItem[] {
  const items: DayItem[] = [];
  for (const slot of slots) {
    if (slot.isSleep) {
      const last = items[items.length - 1];
      if (last && last.type === "sleep" && last.endMinutes === slot.startMinutes) {
        last.endMinutes = slot.endMinutes;
        continue;
      }
      items.push({
        type: "sleep",
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
      });
      continue;
    }
    items.push({ ...slot });
  }
  return items;
}

/** True if a focus period (which may wrap midnight) covers the slot [s, e). */
function periodCoversSlot(
  slotStart: number,
  slotEnd: number,
  perStart: number,
  perEnd: number,
): boolean {
  if (perStart === perEnd) return false;
  if (perStart < perEnd) {
    return slotStart >= perStart && slotEnd <= perEnd;
  }
  return slotStart >= perStart || slotEnd <= perEnd;
}

export function slotFocusForDayOfWeek(
  slot: { startMinutes: number; endMinutes: number },
  periods: FocusPeriodLite[],
  dayOfWeek: number,
): { period: FocusPeriodLite | null; intensity: "high" | "low" | null } {
  for (const period of periods) {
    if (!period.days_of_week.includes(dayOfWeek)) continue;
    const ps = hhmmToMinutes(period.start_time);
    const pe = hhmmToMinutes(period.end_time);
    if (periodCoversSlot(slot.startMinutes, slot.endMinutes, ps, pe)) {
      return { period, intensity: period.intensity };
    }
  }
  return { period: null, intensity: null };
}

/** off-focus when the slot is not in a high-intensity period. */
export function isSlotOffFocus(
  slot: { startMinutes: number; endMinutes: number },
  periods: FocusPeriodLite[],
  dayOfWeek: number,
): boolean {
  const { intensity } = slotFocusForDayOfWeek(slot, periods, dayOfWeek);
  return intensity !== "high";
}

/** Clamp a [start, end) minute range to 30-minute grid boundaries. */
export function snapToGrid(startMinutes: number, endMinutes: number): {
  start: number;
  end: number;
} {
  const start = Math.round(startMinutes / SLOT_MINUTES) * SLOT_MINUTES;
  let end = Math.round(endMinutes / SLOT_MINUTES) * SLOT_MINUTES;
  if (end <= start) end = start + SLOT_MINUTES;
  return { start, end };
}

/**
 * Walk the day left-to-right, emitting collapsed sleep bands, assignment
 * cards (spanning their full duration), and empty 30-min slots. Assignments
 * must not overlap; the walk advances past each assignment's end.
 */
export function layoutDay<T extends { startMinutes: number; endMinutes: number }>(
  items: DayItem[],
  assignments: T[],
): RenderItem<T>[] {
  const sorted = [...assignments].sort((a, b) => a.startMinutes - b.startMinutes);
  const renderItems: RenderItem<T>[] = [];

  let minute = 0;
  let slotIdx = 0;
  let assignIdx = 0;

  while (minute < MINUTES_PER_DAY) {
    // Skip / emit day-items that end at or before the current minute.
    while (slotIdx < items.length && items[slotIdx].endMinutes <= minute) {
      slotIdx++;
    }

    const nextAssignment = sorted[assignIdx];
    if (nextAssignment && nextAssignment.startMinutes <= minute) {
      renderItems.push({
        kind: "assignment",
        startMinutes: nextAssignment.startMinutes,
        endMinutes: nextAssignment.endMinutes,
        assignment: nextAssignment,
      });
      minute = nextAssignment.endMinutes;
      assignIdx++;
      continue;
    }

    const item = items[slotIdx];
    if (!item) break;

    if (item.type === "sleep") {
      if (item.startMinutes <= minute) {
        renderItems.push({
          kind: "sleep",
          startMinutes: item.startMinutes,
          endMinutes: item.endMinutes,
        });
        minute = item.endMinutes;
        slotIdx++;
        continue;
      }
    }

    // Empty waking slot — emit one 30-min slot and advance.
    if (item.type === "slot") {
      const start = Math.max(item.startMinutes, minute);
      const end = start + SLOT_MINUTES;
      renderItems.push({ kind: "slot", startMinutes: start, endMinutes: end });
      minute = end;
      if (minute >= item.endMinutes) slotIdx++;
      continue;
    }

    // Sleep band starting after current minute — fill the waking gap first.
    if (minute < item.startMinutes) {
      const end = Math.min(item.startMinutes, minute + SLOT_MINUTES);
      renderItems.push({ kind: "slot", startMinutes: minute, endMinutes: end });
      minute = end;
    }
  }

  return renderItems;
}

/** Completion % = checked / (checked + crossed + auto_failed), for today only. */
export function completionPct(assignments: {
  status: string;
}[]): number | null {
  const resolved = assignments.filter((a) =>
    ["checked", "crossed", "auto_failed"].includes(a.status),
  );
  if (resolved.length === 0) return null;
  const checked = resolved.filter((a) => a.status === "checked").length;
  return Math.round((checked / resolved.length) * 100);
}
