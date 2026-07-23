import { z } from "zod";

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const focusPeriodSchema = z
  .object({
    id: z.string().uuid().optional(),
    label: z.string().min(1).max(40),
    color: hexColor,
    start_time: timeString,
    end_time: timeString,
    intensity: z.enum(["high", "low"]),
    days_of_week: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  })
  .refine((v) => v.start_time !== v.end_time, {
    message: "Start and end must differ",
    path: ["end_time"],
  });

export type FocusPeriodInput = z.infer<typeof focusPeriodSchema>;

// Phase-C follow-up: the focus-hours step is now a paint-the-blocks UI.
// The editor saves an array of contiguous painted runs (one per label),
// each with start/end "HH:MM", a preset color, and a derived intensity.

export const paintedPeriodSchema = z.object({
  label: z.string().min(1).max(40),
  color: hexColor,
  start_time: timeString,
  end_time: timeString,
  intensity: z.enum(["high", "low"]),
});

export const saveFocusPeriodsSchema = z.object({
  periods: z.array(paintedPeriodSchema).max(96),
});

export type PaintedPeriodInput = z.infer<typeof paintedPeriodSchema>;
export type SaveFocusPeriodsInput = z.infer<typeof saveFocusPeriodsSchema>;
