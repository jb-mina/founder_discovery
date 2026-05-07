import { z } from "zod";

// RC moves to per-persona JSON slots so each role's output is structurally
// scoped — investor can't drift into "응원" copy, friend can't drift into
// "MOIC/시장 규모" claims, socratic can't slip a verdict in. Each persona
// model call returns one of these schemas; the API route json-stringifies
// each slot into the existing RealityCheck text columns (no schema rename).

export const PERSONA_KEYS = ["coldInvestor", "honestFriend", "socraticQ", "moderator"] as const;
export type PersonaKey = (typeof PERSONA_KEYS)[number];

export const CITED_SOURCES = [
  "existence",
  "severity",
  "fit",
  "willingness",
  "onepager",
] as const;
export type CitedSource = (typeof CITED_SOURCES)[number];

export const coldInvestorOutputSchema = z.object({
  topRisk: z.string().min(1),
  evidenceGap: z.string().min(1),
  citedSource: z.enum(CITED_SOURCES),
  nextAction: z.string().min(1),
});
export type ColdInvestorOutput = z.infer<typeof coldInvestorOutputSchema>;

export const honestFriendOutputSchema = z.object({
  strength: z.string().min(1),
  // Prompt asks for exactly 2 concerns; allow 1-3 so a near-miss output
  // (model returns 1 strong concern, or splits into 3) doesn't fail zod.
  concerns: z
    .array(
      z.object({
        point: z.string().min(1),
        mitigation: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
});
export type HonestFriendOutput = z.infer<typeof honestFriendOutputSchema>;

export const socraticQOutputSchema = z.object({
  unverifiedAssumptions: z.array(z.string().min(1)).min(1).max(5),
  // Prompt asks for exactly 3 questions; allow 2-4 so model variance
  // doesn't trip zod and lose otherwise valid output.
  questions: z.array(z.string().min(1)).min(2).max(4),
});
export type SocraticQOutput = z.infer<typeof socraticQOutputSchema>;

export const moderatorOutputSchema = z.object({
  remainingTensions: z.array(z.string().min(1)).min(1).max(3),
  topNextActions: z.array(z.string().min(1)).min(1).max(3),
});
export type ModeratorOutput = z.infer<typeof moderatorOutputSchema>;

// Wrapper returned by runRealityCheck(). Slots stay as parsed objects so the
// API route can JSON.stringify each into its existing String column. The
// inputContext field captures the moderator-level (full) context for audit.
export const realityCheckOutputSchema = z.object({
  coldInvestor: coldInvestorOutputSchema,
  honestFriend: honestFriendOutputSchema,
  socraticQ: socraticQOutputSchema,
  moderatorSummary: moderatorOutputSchema,
  inputContext: z.string(),
});
export type RealityCheckOutput = z.infer<typeof realityCheckOutputSchema>;
