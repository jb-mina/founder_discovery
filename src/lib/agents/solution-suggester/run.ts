import Anthropic from "@anthropic-ai/sdk";
import type { ProblemCard, SelfMapEntry } from "@prisma/client";
import { SYSTEM_PROMPT, buildUserMessage, buildMergeUserMessage } from "./prompt";
import {
  solutionSuggesterOutputSchema,
  solutionMergeOutputSchema,
  type SolutionSuggesterOutput,
  type SolutionMergeOutput,
} from "./schema";

const client = new Anthropic();

function extractJson(rawText: string): unknown {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(
        `Solution Suggester: no JSON found in response. raw: ${rawText.slice(0, 500)}`,
      );
    }
    return JSON.parse(jsonMatch[0]);
  }
}

export async function runSolutionSuggester(input: {
  card: ProblemCard;
  selfMap: SelfMapEntry[];
  existingSolutions: string[];
  problemFindings?: string;
  userPrompt?: string;
}): Promise<SolutionSuggesterOutput> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";
  return solutionSuggesterOutputSchema.parse(extractJson(rawText));
}

export async function runSolutionMerger(input: {
  card: ProblemCard;
  selfMap: SelfMapEntry[];
  existingSolutions: string[];
  problemFindings?: string;
  userPrompt?: string;
  mergeFrom: string[];
}): Promise<SolutionMergeOutput> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildMergeUserMessage(input) }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";
  return solutionMergeOutputSchema.parse(extractJson(rawText));
}
