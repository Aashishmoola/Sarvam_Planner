import { z } from "zod";

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM (24h)");

export const limitsSchema = z
  .object({
    max_long_goals: z.coerce.number().int().min(1).max(3),
    max_short_goals: z.coerce.number().int().min(1).max(3),
    max_productive_hours: z.coerce.number().int().min(1).max(12),
    sleep_start: timeString,
    sleep_end: timeString,
    morning_push_at: timeString,
    timezone: z.string().min(1),
  })
  .refine((v) => v.sleep_start !== v.sleep_end, {
    message: "Sleep start and end must differ",
    path: ["sleep_end"],
  });

export type LimitsInput = z.infer<typeof limitsSchema>;
