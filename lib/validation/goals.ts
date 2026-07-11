import { z } from "zod";

export const longTermGoalSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
});

export const shortTermGoalSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
  cycle_length_days: z.union([z.literal(7), z.literal(14), z.literal(21)]),
  parent_long_term_goal_id: z.string().uuid().nullable().optional(),
});

export const goalsSchema = z.object({
  long_term: z.array(longTermGoalSchema).max(3),
  short_term: z.array(shortTermGoalSchema).max(3),
});

export type LongTermGoalInput = z.infer<typeof longTermGoalSchema>;
export type ShortTermGoalInput = z.infer<typeof shortTermGoalSchema>;
export type GoalsInput = z.infer<typeof goalsSchema>;
