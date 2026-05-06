import { z } from "zod";

export const solutionCandidateSchema = z.object({
  statement: z.string().min(10),
  angle: z.string().min(1), // 한 줄 평 — 이 후보의 차별점/전제
});

export type SolutionCandidate = z.infer<typeof solutionCandidateSchema>;

export const solutionSuggesterOutputSchema = z.object({
  candidates: z.array(solutionCandidateSchema).length(3),
});

export type SolutionSuggesterOutput = z.infer<typeof solutionSuggesterOutputSchema>;

export const solutionMergeOutputSchema = z.object({
  candidate: solutionCandidateSchema,
});

export type SolutionMergeOutput = z.infer<typeof solutionMergeOutputSchema>;
