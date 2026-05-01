import type { SelfMapEntry } from "@prisma/client";

export const SYSTEM_PROMPT = `당신은 Self Map Synthesizer입니다. 0to1 창업자의 Self Map 항목들을 관찰해 "이런 사람으로 보입니다"라는 가설을 한 문단으로 합성합니다.

이 에이전트는 질문하지 않습니다(질문은 Self Insight 책임). 솔루션·문제도 제안하지 않습니다(Solution Suggester / Problem Scout 책임). 사용자를 대신해 결정하지 않습니다.

규칙:
- identityStatement: 한국어 1~2문장. "~인 것으로 보입니다 / ~경향이 있어 보입니다" 같은 가설형 어미. "당신은 X입니다" 단정 금지. 20자 이상 400자 이하.
- citedEntryIds: identityStatement의 근거가 된 entry ID를 1개 이상, 최대 8개. 인용 없는 합성 금지.
- tensions: 답변 사이에 명백한 충돌이 있을 때만 (예: "안정 추구"와 "혁신 갈망"). 카테고리가 다르다는 이유만으로 추측 X. 최대 3개. 없으면 빈 배열.
- gaps: 항목이 0~1개인 카테고리만. 이미 충분히 채워진 카테고리는 제외. 최대 3개. 없으면 빈 배열.
- dismissedTensionKeys 입력에 포함된 쌍("idA|idB" sorted)은 tensions에서 제외하세요.
- recentMessages 입력이 있을 때만 threadToResume를 1~2개 산출 (이번 세션에서 미해결로 남은 화제만). recentMessages가 없으면 빈 배열.
- entryTagsByEntryId: 각 SelfMapEntry id별로 그 답변이 다루는 핵심 개념 3~7개를 짧은 한국어 태그로(명사·복합명사 권장). 노드맵의 엣지 산출용이라 다른 답변과 의미가 겹칠 만한 단어를 우선 (예: "정보 과부하", "큐레이션", "자동화"). 카테고리 라벨 자체(관심사·강점·혐오·몰입·네트워크)는 태그로 쓰지 말 것 — 그 정보는 이미 카테고리 컬럼에 있음. 동의어보다 distinct concept. 답변이 너무 짧거나 정보가 부족하면 빈 배열도 허용.
- clusterMeanings: 카테고리별로 그 답변들이 모여 드러내는 패턴을 한 줄(8~120자, 한국어)로 산출. 예: "관심사 → '정보 과부하의 자동 큐레이션'에 일관되게 끌리는 패턴이 보입니다." 가설형 어미 권장. 카테고리당 entry가 2개 미만이면 그 카테고리는 clusterMeanings에서 제외 (한 답변만으로 패턴 단정 금지). 패턴이 약하거나 명백하지 않으면 그 카테고리도 빼세요. 추천·평가가 아닌 관찰만.
- 응답은 JSON 객체만. 마크다운 코드펜스·설명·첫인사 없이 JSON 본문만.`;

export type SynthesizerInput = {
  entries: SelfMapEntry[];
  dismissedTensionKeys?: string[];
  recentMessages?: { role: string; content: string }[];
};

const MAX_ENTRIES_INLINE = 100;

function entriesToText(entries: SelfMapEntry[]): string {
  if (entries.length === 0) return "(아직 항목이 없음)";
  // §7 "Self Map 전체를 매 요청 컨텍스트에 넣지 말 것" 가드.
  // 100개 이상이면 카테고리당 최신 15개씩만 + 카운트.
  if (entries.length <= MAX_ENTRIES_INLINE) {
    return entries
      .map((e) => `- id=${e.id} [${e.category}] Q: ${e.question} | A: ${e.answer}`)
      .join("\n");
  }
  const byCategory = entries.reduce<Record<string, SelfMapEntry[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});
  const lines: string[] = [];
  for (const [cat, list] of Object.entries(byCategory)) {
    const sorted = [...list].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    lines.push(`# ${cat} (총 ${list.length}개, 최신 15개만 표시)`);
    for (const e of sorted.slice(0, 15)) {
      lines.push(`- id=${e.id} Q: ${e.question} | A: ${e.answer}`);
    }
  }
  return lines.join("\n");
}

function recentMessagesToText(messages: { role: string; content: string }[]): string {
  return messages
    .slice(-12) // 최근 12턴만 — 토큰 절약
    .map((m) => `[${m.role}] ${m.content}`)
    .join("\n");
}

export function buildUserMessage(input: SynthesizerInput): string {
  const { entries, dismissedTensionKeys = [], recentMessages } = input;

  const dismissedBlock = dismissedTensionKeys.length > 0
    ? `\n사용자가 "충돌 아니다"라고 dismiss한 쌍 (이 쌍은 tensions에서 제외):\n${dismissedTensionKeys.map((k) => `- ${k}`).join("\n")}\n`
    : "";

  const recentBlock = recentMessages && recentMessages.length > 0
    ? `\n이번 인터뷰 세션의 최근 대화 (threadToResume 산출용):\n${recentMessagesToText(recentMessages)}\n`
    : "";

  const threadFieldHint = recentMessages && recentMessages.length > 0
    ? `\n  "threadToResume": [{ "summary": "...", "relatedEntryIds": ["..."] }],`
    : `\n  "threadToResume": [],`;

  return `다음 Self Map 항목을 관찰해 합성하세요.

Self Map 항목:
${entriesToText(entries)}
${dismissedBlock}${recentBlock}
출력 형식 (JSON):
{
  "identityStatement": "1~2문장 한국어 가설형 합성",
  "citedEntryIds": ["entryId1", "entryId2"],
  "tensions": [{ "entryIdA": "...", "entryIdB": "...", "description": "..." }],
  "gaps": [{ "category": "network", "reason": "..." }],${threadFieldHint}
  "entryTagsByEntryId": { "entryId1": ["태그1", "태그2"], "entryId2": [...] },
  "clusterMeanings": [{ "category": "interests", "oneLine": "..." }]
}`;
}
