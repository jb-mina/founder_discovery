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

// JSON Schemas mirror the zod shapes in schema.ts. Tool input is validated
// by zod afterwards as defense in depth. Tool use eliminates the
// JSON.parse-from-text class of failures (unescaped newlines inside string
// values, smart quotes, trailing commas) that plagued the prior text mode.
const COLD_INVESTOR_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    topRisk: { type: "string" as const, description: "가장 치명적인 약점 1개 (1-2문장)" },
    evidenceGap: { type: "string" as const, description: "더 강한 증거가 필요한 지점" },
    citedSource: {
      type: "string" as const,
      enum: ["existence", "severity", "fit", "willingness", "onepager"],
      description: "비판 근거가 되는 가설 axis 또는 1-pager",
    },
    nextAction: { type: "string" as const, description: "약점을 깰 검증 액션 또는 반증 질문 1개" },
  },
  required: ["topRisk", "evidenceGap", "citedSource", "nextAction"],
};

const HONEST_FRIEND_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    strength: { type: "string" as const, description: "구체적 강점 1개" },
    concerns: {
      type: "array" as const,
      minItems: 1,
      maxItems: 3,
      description: "걱정되는 점 1-3개 (각 mitigation 포함)",
      items: {
        type: "object" as const,
        properties: {
          point: { type: "string" as const, description: "걱정되는 점 한 문단" },
          mitigation: { type: "string" as const, description: "어떻게 확인·완화할지 한 줄" },
        },
        required: ["point", "mitigation"],
      },
    },
  },
  required: ["strength", "concerns"],
};

const SOCRATIC_Q_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    unverifiedAssumptions: {
      type: "array" as const,
      minItems: 1,
      maxItems: 5,
      description: "검증되지 않은 가정 1-5개 (짧은 명사구)",
      items: { type: "string" as const },
    },
    questions: {
      type: "array" as const,
      minItems: 2,
      maxItems: 4,
      description: "가정을 확인하는 날카로운 질문 (모두 ?로 끝나야 함)",
      items: { type: "string" as const },
    },
  },
  required: ["unverifiedAssumptions", "questions"],
};

const MODERATOR_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    remainingTensions: {
      type: "array" as const,
      minItems: 1,
      maxItems: 3,
      description: "세 페르소나 사이에 남아있는 진짜 긴장 1-3개",
      items: { type: "string" as const },
    },
    topNextActions: {
      type: "array" as const,
      minItems: 1,
      maxItems: 3,
      description: "다음 액션 1-3개 (구체적 검증·결정·대화)",
      items: { type: "string" as const },
    },
  },
  required: ["remainingTensions", "topNextActions"],
};

async function callPersona<T>(
  personaName: string,
  cfg: PersonaConfig,
  userMessage: string,
  toolName: string,
  toolDescription: string,
  toolSchema: object,
  zodSchema: z.ZodSchema<T>,
): Promise<T> {
  const attempt = async (model: string): Promise<T> => {
    const response = await client.messages.create({
      model,
      max_tokens: cfg.max_tokens,
      temperature: cfg.temperature,
      system: cfg.system,
      tools: [
        {
          name: toolName,
          description: toolDescription,
          input_schema: toolSchema as Anthropic.Messages.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: toolName },
      messages: [{ role: "user", content: userMessage }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error(
        `${personaName}: model returned no tool_use block (stop_reason=${response.stop_reason})`,
      );
    }

    const result = zodSchema.safeParse(toolUse.input);
    if (!result.success) {
      console.error(
        `[reality-check] ${personaName} (${model}) zod failed on tool input. issues:`,
        JSON.stringify(result.error.issues),
        "input:",
        JSON.stringify(toolUse.input).slice(0, 600),
      );
      throw result.error;
    }
    return result.data;
  };

  try {
    return await attempt(cfg.model);
  } catch (firstErr) {
    console.error(
      `[reality-check] ${personaName} attempt 1 failed (${cfg.model}):`,
      firstErr instanceof Error ? firstErr.message : String(firstErr),
    );
    // Sonnet fallback covers (a) opus tier-unavailability and (b) transient
    // API errors. Same-input retry on the same model rarely clears a
    // deterministic failure.
    try {
      return await attempt("claude-sonnet-4-6");
    } catch (secondErr) {
      const msg = secondErr instanceof Error ? secondErr.message : String(secondErr);
      console.error(
        `[reality-check] ${personaName} attempt 2 failed (claude-sonnet-4-6 fallback):`,
        msg,
      );
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
    callPersona(
      "coldInvestor",
      PERSONA_CONFIG.coldInvestor,
      investorCtx,
      "submit_critique",
      "냉정한 투자자 관점의 critique를 제출합니다.",
      COLD_INVESTOR_TOOL_SCHEMA,
      coldInvestorOutputSchema,
    ),
    callPersona(
      "honestFriend",
      PERSONA_CONFIG.honestFriend,
      friendCtx,
      "submit_feedback",
      "솔직한 친구의 평가를 제출합니다.",
      HONEST_FRIEND_TOOL_SCHEMA,
      honestFriendOutputSchema,
    ),
    callPersona(
      "socraticQ",
      PERSONA_CONFIG.socraticQ,
      socraticCtx,
      "submit_questions",
      "검증되지 않은 가정과 그것을 확인할 질문을 제출합니다.",
      SOCRATIC_Q_TOOL_SCHEMA,
      socraticQOutputSchema,
    ),
  ])) as [ColdInvestorOutput, HonestFriendOutput, SocraticQOutput];

  // Moderator runs after, with full visibility on persona structured outputs.
  const moderatorMessage = buildModeratorMessage(moderatorCtx, {
    coldInvestor,
    honestFriend,
    socraticQ,
  });
  const moderatorSummary: ModeratorOutput = await callPersona(
    "moderator",
    PERSONA_CONFIG.moderator,
    moderatorMessage,
    "submit_moderation",
    "세 페르소나의 의견을 종합한 중재자 결론을 제출합니다.",
    MODERATOR_TOOL_SCHEMA,
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
