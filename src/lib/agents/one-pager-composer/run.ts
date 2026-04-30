import Anthropic from "@anthropic-ai/sdk";
import type { Hypothesis, ProblemCard, SolutionHypothesis } from "@prisma/client";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import {
  onePagerComposerOutputSchema,
  type OnePagerComposerOutput,
} from "./schema";

const client = new Anthropic();

export async function runOnePagerComposer(input: {
  card: ProblemCard;
  solution: SolutionHypothesis;
  hypotheses: Hypothesis[];
}): Promise<OnePagerComposerOutput> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(
        `OnePager Composer: no JSON found in response. raw: ${rawText.slice(0, 500)}`,
      );
    }
    parsed = JSON.parse(jsonMatch[0]);
  }

  return onePagerComposerOutputSchema.parse(parsed);
}
