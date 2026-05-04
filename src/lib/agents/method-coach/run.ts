import Anthropic from "@anthropic-ai/sdk";
import type { ProblemCard, SolutionHypothesis } from "@prisma/client";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import { methodCoachOutputSchema, type MethodCoachOutput } from "./schema";
import type { HypothesisAxis, ValidationMethod } from "@/lib/agents/validation-designer/schema";

const client = new Anthropic();

export async function runMethodCoach(input: {
  card: ProblemCard;
  axis: HypothesisAxis;
  method: ValidationMethod;
  successSignals: string;
  failureSignals: string;
  findings: string;
  solution?: Pick<SolutionHypothesis, "statement"> | null;
}): Promise<MethodCoachOutput> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  // Korean output of steps + template + channels + watchOuts easily exceeds
  // 2048 tokens; bumping max_tokens alone fixes most cases, but a tighter
  // prompt or a larger budget could still hit the cap. Surface truncation
  // explicitly so the caller doesn't see "no JSON found" and chase a ghost.
  if (response.stop_reason === "max_tokens") {
    throw new Error(
      "Method Coach: response truncated (max_tokens reached). Try regenerating.",
    );
  }

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
        `Method Coach: no JSON found in response. raw: ${rawText.slice(0, 500)}`,
      );
    }
    parsed = JSON.parse(jsonMatch[0]);
  }

  return methodCoachOutputSchema.parse(parsed);
}
