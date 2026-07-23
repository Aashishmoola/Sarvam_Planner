import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const uuid = z.string().uuid();

export const assignSlotSchema = z
  .object({
    date: dateStr,
    short_term_goal_id: uuid,
    start_time: timeStr,
    end_time: timeStr,
  })
  .refine((v) => v.start_time < v.end_time, {
    message: "End must be after start",
    path: ["end_time"],
  });

export const checkOffSchema = z.object({
  assignment_id: uuid,
  effort_score: z.number().int().min(1).max(5), // strict — required
  journal_mood: z.string().max(500).optional().nullable(),
  journal_technique_tweak: z.string().max(1000).optional().nullable(),
  journal_notes: z.string().max(2000).optional().nullable(),
});

export const crossOffSchema = z.object({
  assignment_id: uuid,
  journal_mood: z.string().max(500).optional().nullable(),
  journal_technique_tweak: z.string().max(1000).optional().nullable(),
  journal_notes: z.string().max(2000).optional().nullable(),
});

export const journalOnlySchema = z.object({
  assignment_id: uuid,
  journal_mood: z.string().max(500).optional().nullable(),
  journal_technique_tweak: z.string().max(1000).optional().nullable(),
  journal_notes: z.string().max(2000).optional().nullable(),
});

export const nonProductiveUpsertSchema = z.object({
  day_plan_id: uuid,
  position: z.number().int().min(0).max(2),
  title: z.string().min(1).max(120),
});

export const nonProductiveResolveSchema = z.object({
  id: uuid,
  action: z.enum(["check", "cross"]),
  journal_notes: z.string().max(2000).optional().nullable(),
});

export type AssignSlotInput = z.infer<typeof assignSlotSchema>;
export type CheckOffInput = z.infer<typeof checkOffSchema>;
export type CrossOffInput = z.infer<typeof crossOffSchema>;
export type JournalOnlyInput = z.infer<typeof journalOnlySchema>;
export type NonProductiveUpsertInput = z.infer<typeof nonProductiveUpsertSchema>;
export type NonProductiveResolveInput = z.infer<typeof nonProductiveResolveSchema>;
