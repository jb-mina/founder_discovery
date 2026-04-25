import Anthropic from "@anthropic-ai/sdk";
import type { ProblemCard, SelfMapEntry } from "@prisma/client";
import {
  SYSTEM_PROMPT,
  buildProblemAxisMessage,
  buildSolutionAxisMessage,
} from "./prompt";
import {
  validationDesignerOutputSchema,
  type ValidationDesignerOutput,
} from "./schema";

const client = new Anthropic();

async function callDesigner(userMessage: string): Promise<ValidationDesignerOutput> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
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
        `Validation Designer: no JSON found in response. raw: ${rawText.slice(0, 500)}`,
      );
    }
    parsed = JSON.parse(jsonMatch[0]);
  }

  return validationDesignerOutputSchema.parse(parsed);
}

export async function designProblemAxes(
  card: ProblemCard,
  selfMap: SelfMapEntry[],
): Promise<ValidationDesignerOutput> {
  const result = await callDesigner(buildProblemAxisMessage(card, selfMap));
  const axes = new Set(result.hypotheses.map((h) => h.axis));
  if (!axes.has("existence") || !axes.has("severity")) {
    throw new Error("Validation Designer: problem axes must include both existence and severity");
  }
  return result;
}

export async function designSolutionAxes(input: {
  card: ProblemCard;
  selfMap: SelfMapEntry[];
  solutionStatement: string;
  problemFindings?: string;
}): Promise<ValidationDesignerOutput> {
  const result = await callDesigner(buildSolutionAxisMessage(input));
  const axes = new Set(result.hypotheses.map((h) => h.axis));
  if (!axes.has("fit") || !axes.has("willingness")) {
    throw new Error("Validation Designer: solution axes must include both fit and willingness");
  }
  return result;
}
