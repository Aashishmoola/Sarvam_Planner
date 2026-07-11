import { z } from "zod";

export const mottosSchema = z.object({
  mottos: z
    .array(
      z.object({
        position: z.number().int().min(0).max(4),
        text: z.string().min(1).max(200),
      }),
    )
    .length(5, "Exactly 5 mottos are required"),
});

export type MottosInput = z.infer<typeof mottosSchema>;
