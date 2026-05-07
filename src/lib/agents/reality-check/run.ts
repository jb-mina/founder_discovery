import Anthropic from "@anthropic-ai/sdk";
import type { Hypothesis, OnePager, ProblemCard, SolutionHypothesis } from "@prisma/client";
import { z } from "zod";
import {
  COLD_INVESTOR_SYSTEM,
  HONEST_FRIEND_SYSTEM,
  SOCRATIC_Q_SYSTEM,
  MODERATOR_SYSTEM,
  buildInvestorContext,
  buildFriendContext,
  buildSocraticContext,
  buildModeratorContext,
  buildModeratorMessage,
} from "./prompt";
import {
  coldInvestorOutputSchema,
  honestFriendOutputSchema,
  socraticQOutputSchema,
  moderatorOutputSchema,
  type ColdInvestorOutput,
  type HonestFriendOutput,
  type SocraticQOutput,
  type ModeratorOutput,
  type RealityCheckOutput,
} from "./schema";

const client = new Anthropic();

// Per-persona model/temperature/max_tokens. Diversification within a single
// vendor: investor low temp for consistency, socratic high temp for question
// divergence, moderator on Opus for synthesis quality. CLAUDE.md §5 model
// guidance: opus-4-7 for "복잡 추론" — moderator is exactly that.
const PERSONA_CONFIG = {
  coldInvestor: {
    model: "claude-sonnet-4-6" as const,
    temperature: 0.3,
    max_tokens: 1024,
    system: COLD_INVESTOR_SYSTEM,
  },
  honestFriend: {
    model: "claude-sonnet-4-6" as const,
    temperature: 0.7,
    max_tokens: 1024,
    system: HONEST_FRIEND_SYSTEM,
  },
  socraticQ: {
    model: "claude-sonnet-4-6" as const,
    temperature: 1.0,
    max_tokens: 1024,
    system: SOCRATIC_Q_SYSTEM,
  },
  moderator: {
    model: "claude-opus-4-7" as const,
    temperature: 0.4,
    max_tokens: 2048,
    system: MODERATOR_SYSTEM,
  },
} as const;

type PersonaConfig = (typeof PERSONA_CONFIG)[keyof typeof PERSONA_CONFIG];

// Same JSON extraction as validation-designer/run.ts: strip markdown fence,
// parse, fallback to first {...} match. Models occasionally still wrap JSON
// in fences despite system instructions, so the regex fallback is required.
function extractJson(rawText: string): unknown {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(
        `Reality Check: no JSON object in response. raw: ${rawText.slice(0, 500)}`,
      );
    }
    return JSON.parse(match[0]);
  }
}

async function callPersonaWithRetry<T>(
  personaName: string,
  cfg: PersonaConfig,
  userMessage: string,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const attempt = async (): Promise<T> => {
    const response = await client.messages.create({
      model: cfg.model,
      max_tokens: cfg.max_tokens,
      temperature: cfg.temperature,
      system: cfg.system,
      messages: [{ role: "user", content: userMessage }],
    });
    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const parsed = extractJson(rawText);
    return schema.parse(parsed);
  };

  try {
    return await attempt();
  } catch (firstErr) {
    // One retry on parse/zod failure with the same input — temperature jitter
    // alone often clears transient JSON glitches. If the second attempt still
    // fails, surface the error so the route returns 502 (no marker fallback).
    try {
      return await attempt();
    } catch (secondErr) {
      const msg = secondErr instanceof Error ? secondErr.message : String(secondErr);
      throw new Error(
        `Reality Check ${personaName} failed twice. last error: ${msg}. first error: ${
          firstErr instanceof Error ? firstErr.message : String(firstErr)
        }`,
      );
    }
  }
}

export async function runRealityCheck(input: {
  card: ProblemCard;
  solution: SolutionHypothesis;
  hypotheses: Hypothesis[];
  onePager: OnePager | null;
}): Promise<RealityCheckOutput> {
  // Personas in parallel — they MUST NOT see each other's outputs (CLAUDE.md
  // §3). Each gets a curated context slice (see prompt.ts buildXxxContext).
  const investorCtx = buildInvestorContext(input);
  const friendCtx = buildFriendContext(input);
  const socraticCtx = buildSocraticContext(input);
  const moderatorCtx = buildModeratorContext(input);

  const [coldInvestor, honestFriend, socraticQ] = (await Promise.all([
    callPersonaWithRetry(
      "coldInvestor",
      PERSONA_CONFIG.coldInvestor,
      investorCtx,
      coldInvestorOutputSchema,
    ),
    callPersonaWithRetry(
      "honestFriend",
      PERSONA_CONFIG.honestFriend,
      friendCtx,
      honestFriendOutputSchema,
    ),
    callPersonaWithRetry(
      "socraticQ",
      PERSONA_CONFIG.socraticQ,
      socraticCtx,
      socraticQOutputSchema,
    ),
  ])) as [ColdInvestorOutput, HonestFriendOutput, SocraticQOutput];

  // Moderator runs after, with full visibility on persona JSON outputs.
  const moderatorMessage = buildModeratorMessage(moderatorCtx, {
    coldInvestor,
    honestFriend,
    socraticQ,
  });
  const moderatorSummary: ModeratorOutput = await callPersonaWithRetry(
    "moderator",
    PERSONA_CONFIG.moderator,
    moderatorMessage,
    moderatorOutputSchema,
  );

  return {
    coldInvestor,
    honestFriend,
    socraticQ,
    moderatorSummary,
    inputContext: moderatorCtx,
  };
}
