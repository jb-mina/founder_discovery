import Anthropic from "@anthropic-ai/sdk";
import type { Hypothesis, OnePager, ProblemCard, SolutionHypothesis } from "@prisma/client";
import {
  PERSONAS,
  MODERATOR_SYSTEM,
  buildContext,
  buildModeratorMessage,
  type PersonaKey,
} from "./prompt";
import type { RealityCheckOutput } from "./schema";

const client = new Anthropic();

async function callPersona(persona: PersonaKey, context: string): Promise<string> {
  const p = PERSONAS[persona];
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: p.system,
    messages: [{ role: "user", content: context }],
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function runRealityCheck(input: {
  card: ProblemCard;
  solution: SolutionHypothesis;
  hypotheses: Hypothesis[];
  onePager: OnePager | null;
}): Promise<RealityCheckOutput> {
  const context = buildContext(input);

  // Personas in parallel — they MUST NOT see each other's outputs (CLAUDE.md §3).
  const [coldInvestor, honestFriend, socraticQ] = await Promise.all([
    callPersona("coldInvestor", context),
    callPersona("honestFriend", context),
    callPersona("socraticQ", context),
  ]);

  // Moderator runs after, with full visibility.
  const moderatorResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: MODERATOR_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildModeratorMessage(context, { coldInvestor, honestFriend, socraticQ }),
      },
    ],
  });
  const moderatorSummary =
    moderatorResponse.content[0].type === "text" ? moderatorResponse.content[0].text : "";

  return { coldInvestor, honestFriend, socraticQ, moderatorSummary, inputContext: context };
}
