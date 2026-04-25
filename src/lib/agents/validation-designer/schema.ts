import { z } from "zod";

export const validationDesignerOutputSchema = z.object({
  ideaDraft: z.string(),
  interviewQuestions: z.array(z.string()),
  experimentMethod: z.string(),
  successSignals: z.string(),
  failureSignals: z.string(),
  weeklySteps: z.array(
    z.object({
      week: z.number(),
      actions: z.array(z.string()),
    }),
  ),
});

export type ValidationDesignerOutput = z.infer<typeof validationDesignerOutputSchema>;
