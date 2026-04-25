import { z } from "zod";

export const HYPOTHESIS_AXES = ["existence", "severity", "fit", "willingness"] as const;
export type HypothesisAxis = (typeof HYPOTHESIS_AXES)[number];

export const VALIDATION_METHODS = [
  "interview",
  "observation",
  "smoke_test",
  "fake_door",
  "prepayment",
  "concierge",
] as const;
export type ValidationMethod = (typeof VALIDATION_METHODS)[number];

export const PROBLEM_AXES = ["existence", "severity"] as const;
export const SOLUTION_AXES = ["fit", "willingness"] as const;

export const hypothesisPrescriptionSchema = z.object({
  axis: z.enum(HYPOTHESIS_AXES),
  prescribedMethods: z.array(z.enum(VALIDATION_METHODS)).min(1).max(3),
  successSignals: z.string().min(1),
  failureSignals: z.string().min(1),
});

export type HypothesisPrescription = z.infer<typeof hypothesisPrescriptionSchema>;

export const validationDesignerOutputSchema = z.object({
  hypotheses: z.array(hypothesisPrescriptionSchema).min(1),
});

export type ValidationDesignerOutput = z.infer<typeof validationDesignerOutputSchema>;
