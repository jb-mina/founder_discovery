import type { Hypothesis, OnePager, ProblemCard, SolutionHypothesis } from "@prisma/client";
import { callPersona, type ToolSpec } from "@/lib/llm";
import { getAllPersonaConfigs } from "@/lib/db/reality-check-config";
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

// Per-persona temperature/max_tokens stays vendor-agnostic — investor low
// for consistency, socratic high for question divergence, moderator
// moderate for synthesis. Vendor/model are loaded from DB per call.
const PERSONA_PARAMS = {
  investor: { temperature: 0.3, max_tokens: 1024 },
  friend: { temperature: 0.7, max_tokens: 1024 },
  socratic: { temperature: 1.0, max_tokens: 1024 },
  moderator: { temperature: 0.4, max_tokens: 2048 },
} as const;

// Tool specs: same JSON Schema shape works for both Anthropic input_schema
// and OpenAI-compatible function.parameters via the lib/llm router.
const COLD_INVESTOR_TOOL: ToolSpec = {
  name: "submit_critique",
  description:
    "냉정한 투자자 critique 제출. topRisk, evidenceGap, citedSource, nextAction 4개 필드를 모두 채워야 합니다.",
  inputSchema: {
    type: "object",
    properties: {
      topRisk: { type: "string", description: "필수. 가장 치명적인 약점 1개 (1-2문장)." },
      evidenceGap: { type: "string", description: "필수. 더 강한 증거가 필요한 지점 한 문단." },
      citedSource: {
        type: "string",
        enum: ["existence", "severity", "fit", "willingness", "onepager"],
        description: "필수. 비판 근거가 되는 가설 axis 또는 1-pager.",
      },
      nextAction: { type: "string", description: "필수. 약점을 깰 검증 액션 또는 반증 질문 1개." },
    },
    required: ["topRisk", "evidenceGap", "citedSource", "nextAction"],
  },
};

const HONEST_FRIEND_TOOL: ToolSpec = {
  name: "submit_feedback",
  description:
    "솔직한 친구 평가 제출. strength와 concerns 두 필드를 모두 채워야 합니다. concerns는 최소 1개의 {point, mitigation} 객체 배열입니다 (빈 배열 금지).",
  inputSchema: {
    type: "object",
    properties: {
      strength: { type: "string", description: "필수. 구체적 강점 1개." },
      concerns: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        description: "필수. 걱정되는 점 1-3개 (빈 배열 금지). 각 항목은 {point, mitigation}.",
        items: {
          type: "object",
          properties: {
            point: { type: "string", description: "필수. 걱정되는 점 한 문단." },
            mitigation: { type: "string", description: "필수. 어떻게 확인·완화할지 한 줄." },
          },
          required: ["point", "mitigation"],
        },
      },
    },
    required: ["strength", "concerns"],
  },
};

const SOCRATIC_Q_TOOL: ToolSpec = {
  name: "submit_questions",
  description:
    "소크라테스 질문 제출. unverifiedAssumptions와 questions 두 배열 필드를 모두 채워야 합니다 (빈 배열 금지).",
  inputSchema: {
    type: "object",
    properties: {
      unverifiedAssumptions: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        description: "필수. 검증되지 않은 가정 1-5개 (짧은 명사구).",
        items: { type: "string" },
      },
      questions: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        description: "필수. 가정을 확인하는 날카로운 질문 2-4개. 모든 항목은 ?로 끝나야 함.",
        items: { type: "string" },
      },
    },
    required: ["unverifiedAssumptions", "questions"],
  },
};

const MODERATOR_TOOL: ToolSpec = {
  name: "submit_moderation",
  description:
    "중재자 종합 제출. remainingTensions와 topNextActions 두 배열 필드를 모두 채워야 합니다 (빈 배열 금지).",
  inputSchema: {
    type: "object",
    properties: {
      remainingTensions: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        description: "필수. 세 페르소나 사이에 남아있는 진짜 긴장 1-3개.",
        items: { type: "string" },
      },
      topNextActions: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        description: "필수. 다음 액션 1-3개 (구체적 검증·결정·대화).",
        items: { type: "string" },
      },
    },
    required: ["remainingTensions", "topNextActions"],
  },
};

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

  const configs = await getAllPersonaConfigs();
  const cfgByPersona = new Map(configs.map((c) => [c.persona, c]));

  const investorCfg = cfgByPersona.get("investor")!;
  const friendCfg = cfgByPersona.get("friend")!;
  const socraticCfg = cfgByPersona.get("socratic")!;
  const moderatorCfg = cfgByPersona.get("moderator")!;

  const [coldInvestor, honestFriend, socraticQ] = (await Promise.all([
    callPersona({
      personaName: "coldInvestor",
      vendor: investorCfg.vendor,
      model: investorCfg.model,
      system: COLD_INVESTOR_SYSTEM,
      userMessage: investorCtx,
      temperature: PERSONA_PARAMS.investor.temperature,
      maxTokens: PERSONA_PARAMS.investor.max_tokens,
      tool: COLD_INVESTOR_TOOL,
      schema: coldInvestorOutputSchema,
    }),
    callPersona({
      personaName: "honestFriend",
      vendor: friendCfg.vendor,
      model: friendCfg.model,
      system: HONEST_FRIEND_SYSTEM,
      userMessage: friendCtx,
      temperature: PERSONA_PARAMS.friend.temperature,
      maxTokens: PERSONA_PARAMS.friend.max_tokens,
      tool: HONEST_FRIEND_TOOL,
      schema: honestFriendOutputSchema,
    }),
    callPersona({
      personaName: "socraticQ",
      vendor: socraticCfg.vendor,
      model: socraticCfg.model,
      system: SOCRATIC_Q_SYSTEM,
      userMessage: socraticCtx,
      temperature: PERSONA_PARAMS.socratic.temperature,
      maxTokens: PERSONA_PARAMS.socratic.max_tokens,
      tool: SOCRATIC_Q_TOOL,
      schema: socraticQOutputSchema,
    }),
  ])) as [ColdInvestorOutput, HonestFriendOutput, SocraticQOutput];

  // Moderator runs after, with full visibility on persona structured outputs.
  const moderatorMessage = buildModeratorMessage(moderatorCtx, {
    coldInvestor,
    honestFriend,
    socraticQ,
  });
  const moderatorSummary: ModeratorOutput = await callPersona({
    personaName: "moderator",
    vendor: moderatorCfg.vendor,
    model: moderatorCfg.model,
    system: MODERATOR_SYSTEM,
    userMessage: moderatorMessage,
    temperature: PERSONA_PARAMS.moderator.temperature,
    maxTokens: PERSONA_PARAMS.moderator.max_tokens,
    tool: MODERATOR_TOOL,
    schema: moderatorOutputSchema,
  });

  return {
    coldInvestor,
    honestFriend,
    socraticQ,
    moderatorSummary,
    inputContext: moderatorCtx,
  };
}
