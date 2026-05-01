# Agents Inventory

> 마지막 갱신: 2026-04-30
> 기준 커밋: `main` 브랜치 현재 상태

---

## 현황 요약

| 상태 | 에이전트 |
|------|----------|
| ✅ 구현됨 | Self Insight, Problem Scout, Fit Judge, Validation Designer, Solution Suggester, Reality Check (3-persona + Moderator) |
| 📋 기획됨 (미구현) | **OnePager Composer** — 솔루션 1-pager 초안 작성. Phase 1~3에서 구현 예정 |
| ❌ 미구현 (PRD 언급) | — |
| ⚠️ PRD 외 추가됨 | Reality Check Moderator (PRD에는 4번째 에이전트로 언급, 별도 API 없이 reality-check route에 통합) |

**핵심 구조적 문제**: 모든 에이전트가 `lib/agents/` 없이 `app/api/*/route.ts` 내부에 인라인 구현되어 있음. CLAUDE.md 6조("에이전트 호출은 `lib/agents/<name>/` 안에 `prompt.ts` + `schema.ts` + `run.ts` 3파일 구조")와 불일치.

---

## 1. Self Insight Agent

| 항목 | 내용 |
|------|------|
| **파일** | `src/app/api/self-insight/route.ts` |
| **PRD 매핑** | Self Map 레이어 — "Self Insight Agent" |
| **UI 호출처** | `src/app/(app)/self-map/page.tsx` |
| **모델** | `claude-sonnet-4-6` |
| **호출 방식** | `messages.stream()` (스트리밍) |

### 시스템 프롬프트 핵심
> "한 번에 하나의 질문만 합니다. 절대 여러 질문을 동시에 하지 마세요."
> "공감하며 대화하되, 막연한 칭찬은 피합니다."

탐색 카테고리: `interests` / `strengths` / `aversions` / `flow` / `network`

### 입력 스키마
```typescript
{
  messages: { role: "user" | "assistant", content: string }[],
  sessionId: string
}
```

### 출력 스키마
- 스트리밍 텍스트 (사용자에게 표시)
- 응답 말미에 `---SAVE---` / `---END---` 블록 삽입 → route에서 파싱 후 DB 저장

```typescript
// 파싱 후 저장되는 구조 (Zod 없음, JSON.parse 직접 사용)
{
  category: string,   // "interests" | "strengths" | "aversions" | "flow" | "network" | "other"
  question: string,
  answer: string,
  tags: string        // 콤마 구분 문자열
}
```

### 문제점
- 출력 포맷이 `---SAVE---` 마커 기반 자유 텍스트 파싱 → CLAUDE.md "에이전트 응답 문자열 파싱 금지. JSON mode + zod로만" 위반
- Self Map 전체(최근 20개)를 context에 주입 → CLAUDE.md "필요한 섹션만 선별 주입" 지침과 경계

---

## 2. Problem Scout Agent

| 항목 | 내용 |
|------|------|
| **파일** | `src/app/api/problems/scout/route.ts` |
| **PRD 매핑** | Problem Universe 레이어 — "Problem Scout Agent" |
| **UI 호출처** | `src/app/(app)/problems/page.tsx` (`ScoutModal`) |
| **모델** | `claude-sonnet-4-6` |
| **호출 방식** | `messages.stream()` (스트리밍) |

### 시스템 프롬프트 핵심
> "YC, Sequoia, a16z 포트폴리오 스타트업이 실제로 풀고 있는 문제를 분석합니다."
> "응답은 반드시 JSON 배열만 반환하세요. 설명 텍스트 없이."

### 입력 스키마
```typescript
{ query: string }
// 기본값: "최근 YC W2025, S2025 배치 중 Consumer와 Productivity 카테고리에서 흥미로운 문제 5개"
```

### 출력 스키마
```typescript
// 스트리밍 JSON 배열 (Zod 없음, 클라이언트에서 정규식 추출 후 JSON.parse)
[
  {
    title: string,
    who: string,
    when: string,
    why: string,
    painPoints: string,
    alternatives: string,
    source: "yc" | "sequoia" | "a16z" | "producthunt" | "appstore" | "manual",
    sourceUrl: string,
    tags: string,
    stage: "seed" | "series-a",
    category: ProblemCategory | ""  // lib/problem-categories.ts의 33개 enum 또는 빈 문자열
  }
]
```

### 카테고리 enum 강제 (2026-05-01)
- 입력: `ScoutModal`의 관심 분야 chip은 `lib/problem-categories.ts`의 9그룹 33개 enum + 자유 chip 입력 (자유 chip은 query에만 흘러감, 출력 enum은 강제 유지).
- 출력: 시스템 프롬프트에 enum 명시 + 미일치 시 빈 문자열. 클라이언트 import 직전(`ScoutModal`)과 서버 POST(`api/problems/route.ts`)에서 `normalizeProblemCategory`로 이중 가드.
- 관련 1회 정리: `scripts/normalize-categories.ts`로 기존 더러운 값을 enum에 매핑하거나 빈 문자열로 폴백.

### 문제점
- 클라이언트(`problems/page.tsx`)에서 스트리밍 완료 후 `/\[[\s\S]*\]/` 정규식으로 JSON 추출 → 자유 텍스트 파싱 패턴 (`lib/agents/` 이전 + zod 검증은 별건 대기)
- 실제 웹 스크래핑 없이 모델 지식에만 의존 → 출처 URL이 hallucination될 수 있음 (CLAUDE.md "출처 URL/날짜 필수" 지침 달성 어려움)
- 초기 시드 데이터가 `api/problems/seed/route.ts`에 하드코딩 → CLAUDE.md "seeds/problem-cards.json으로만" 위반

---

## 3. Fit Judge Agent

| 항목 | 내용 |
|------|------|
| **파일** | `src/app/api/fit/route.ts` (PUT 핸들러) |
| **PRD 매핑** | Founder-Problem Fit 레이어 — "Fit Judge Agent" |
| **UI 호출처** | `src/app/(app)/fit/page.tsx` |
| **모델** | `claude-sonnet-4-6` |
| **호출 방식** | `client.messages.create()` (비스트리밍) |

### 시스템 프롬프트 핵심
> "Self Map을 기반으로 이 창업자와 Founder-Problem Fit이 가장 높을 것으로 예상되는 문제 ID를 상위 5개 선정하고, 각각 왜 fit이 있는지 한 문장으로 설명해주세요."

(별도 system 프롬프트 없이 user 메시지로 인라인 지시)

### 입력 (PUT)
```typescript
// 입력 body 없음 — route 내부에서 DB 직접 조회
// - prisma.selfMapEntry.findMany()
// - prisma.problemCard.findMany()
```

### 출력 스키마
```typescript
// JSON 파싱 (Zod 없음)
[{ id: string, reason: string }]
```

### POST 핸들러 (평가 저장, AI 없음)
```typescript
{
  problemCardId: string,
  attraction: number,      // 1–5
  understanding: number,   // 1–5
  accessibility: number,   // 1–5
  motivation: number,      // 1–5
  notes: string
}
// totalScore = 평균
```

### 문제점
- Self Map 전체 + Problem Cards 전체를 하나의 프롬프트에 주입 → 카드 수 증가 시 토큰 급증
- CLAUDE.md "Fit Judge의 추천 시 Self map의 어떤 문장이 근거인지 인용 형태로 보여준다" → `reason` 필드가 있으나 Self Map 인용이 아닌 에이전트 자체 설명
- system prompt 없이 user 메시지로 지시 → 에이전트 경계 불명확

---

## 4. Validation Designer Agent

| 항목 | 내용 |
|------|------|
| **파일** | `src/app/api/validation/route.ts` (POST 핸들러) |
| **PRD 매핑** | Validation Backlog 레이어 — "Validation Designer Agent" |
| **UI 호출처** | `src/app/(app)/validation/page.tsx` (`NewPlanModal`) |
| **모델** | `claude-sonnet-4-6` |
| **호출 방식** | `client.messages.create()` (비스트리밍) |

### 시스템 프롬프트 핵심
> "다음 창업자의 Self Map과 선택된 문제에 대한 검증 플랜을 작성해주세요."
> "다음 JSON 형식으로만 응답하세요."

(system 프롬프트 없이 user 메시지 인라인)

### 입력
```typescript
{ problemCardId: string }
// route 내부에서 ProblemCard + SelfMapEntry 전체를 DB 조회 후 주입
```

### 출력 스키마
```typescript
// 정규식 추출 후 JSON.parse (Zod 없음)
{
  ideaDraft: string,
  interviewQuestions: string[],
  experimentMethod: string,
  successSignals: string,
  failureSignals: string,
  weeklySteps: { week: number, actions: string[] }[]
}
```

### PATCH 핸들러 (AI 없음 — 학습 기록 저장)
```typescript
{ id: string, learnings?: string, status?: "draft" | "active" | "completed" }
```

### 문제점
- `weeklySteps`가 4주 고정 → CLAUDE.md "2주 안에 실행 가능한 스텝만 제안" 지침과 불일치 (4주로 생성)
- LearningLog가 별도 모델 없이 `ValidationPlan.learnings` 문자열 필드에 누적 → CLAUDE.md 데이터 모델의 `LearningLog` 엔티티 미구현
- 학습 저장 시 Self Map / Problem Card 역류 로직 없음 → CLAUDE.md "LearningLog 저장 트랜잭션 안에서 updatesTo에 명시된 엔티티 반드시 업데이트" 위반

---

## 5. Reality Check Agent (3-Persona + Moderator)

| 항목 | 내용 |
|------|------|
| **파일** | `src/app/api/reality-check/route.ts` |
| **PRD 매핑** | (P1) Reality Check Agent — Cold Investor + Honest Friend + Socratic + Moderator |
| **UI 호출처** | `src/app/(app)/validation/page.tsx` (`PlanCard` 내 버튼) |
| **모델** | `claude-sonnet-4-6` × 4 (병렬 3 + 순차 1) |
| **호출 방식** | `client.messages.create()` × 4 (비스트리밍) |

### 페르소나별 시스템 프롬프트 핵심

| 페르소나 | 핵심 |
|----------|------|
| **coldInvestor** | "감정 없이 사실과 데이터로만 판단합니다. 가장 치명적인 약점과 리스크를 지적하세요." |
| **honestFriend** | "응원하지만 거짓말은 하지 않습니다. 좋은 점 1가지 + 걱정되는 점 2가지." |
| **socraticQ** | "직접 평가하지 말고, 검증되지 않은 가정에 대한 날카로운 질문 3개만." |
| **Moderator** | "세 관점을 종합해 창업자에게 가장 중요한 다음 액션 1-2개를 제안하세요." |

### 입력
```typescript
{ validationPlanId: string }
// route 내부에서 ValidationPlan + ProblemCard 조회
```

### 출력 스키마
```typescript
// DB 저장 후 JSON 반환 (Zod 없음)
{
  coldInvestor: string,
  honestFriend: string,
  socraticQ: string,
  moderatorSummary: string,
  inputContext: string
}
```

### 실행 흐름
```
병렬: [coldInvestor, honestFriend, socraticQ] → Promise.all
순차: moderator(세 결과 + 원본 컨텍스트) → 종합
```

### 문제점
- CLAUDE.md "편향 지적 시 반드시 반증 질문을 함께 제시" → coldInvestor/honestFriend가 지적만 하고 반증 질문을 요구하지 않음
- 4번 API 호출 × 512 토큰 = Reality Check 1회당 약 2,048 토큰 출력 → 비용 최적화 여지

---

## 6. OnePager Composer Agent (📋 기획됨, 미구현)

| 항목 | 내용 |
|------|------|
| **계획 파일** | `src/lib/agents/one-pager-composer/{prompt.ts, schema.ts, run.ts}` (CLAUDE.md §6 컨벤션) |
| **PRD 매핑** | Validation 단계 — "OnePager Composer Agent" (P0) |
| **UI 호출처 (예정)** | `src/components/validation/SolutionValidationBlock.tsx` 안의 "1-pager 초안 생성" CTA |
| **모델 (예정)** | `claude-sonnet-4-6` |
| **호출 방식 (예정)** | `client.messages.create()` (비스트리밍, 단일 호출로 10 섹션 생성) |
| **호출 API (예정)** | `POST /api/one-pagers/[solutionHypothesisId]/draft` |

### 책임 경계

- **하는 것**: 입력 컨텍스트(ProblemCard 풀 + SolutionHypothesis statement + 자식 4축 Hypothesis status·findings 요약) 기반으로 10 섹션 1-pager 한국어 초안 생성. 그뿐.
- **하지 않는 것**:
  - 의견·추천·결정 표현 ("이 방향이 좋겠다" 같은 카피 금지)
  - 자유 텍스트 마커 (`---SECTION---` 등) 사용 — JSON mode + zod로만
  - Self map 주입 (CLAUDE.md §7 토큰 폭발 함정)
  - 4축 검증 처방 — Validation Designer 책임. 영역 침범 금지.
  - 트리거 가드 — 진입 조건(존재·심각도 confirmed + 솔루션 active) 검증은 UI/route 레이어에서.

### 입력 스키마 (예정)

```typescript
{
  problemCardId: string,           // route에서 솔루션을 통해 조회
  solutionHypothesisId: string,    // path param
}
// 내부에서 DB 조회 후 컨텍스트 구성:
// - ProblemCard 풀 6필드
// - SolutionHypothesis statement
// - Hypothesis[] 4축 (axis · status · findings 200자)
```

### 출력 스키마 (예정, zod)

```typescript
{
  oneLineSummary:        string,  // 한줄 요약
  targetCustomer:        string,  // 타깃 고객
  problem:               string,  // 문제
  solution:              string,  // 솔루션
  mvpScope:              string,  // MVP 범위 (min set of features)
  mvpCostEstimate:       string,  // MVP 구현 비용 추정
  operatingModel:        string,  // 운영 모델
  monetization:          string,  // 수익화 가설
  topRisks:              string,  // 주요 리스크 3개 (자유 텍스트, 줄 분리)
  validationActions30d:  string,  // 30일 이내 검증 액션
}
```

### 생성 시점 정책

- 클라이언트의 명시적 호출(CTA 클릭)에서만 생성 — 자동 트리거 없음
- 기존 OnePager가 있으면 서버는 무조건 덮어씀. 클라이언트 UI에서 confirm 대화창으로 사용자 의사 확인 후 호출.
- 생성 후 사용자가 자유 편집(섹션별 textarea + 저장). 편집 중에는 추가 AI 호출 없음.

### 결정 근거

`docs/decisions.md` 2026-04-30 결정 5건 참조:
- 1-pager는 솔루션 단위(1:1)
- RC FK는 SolutionHypothesis 유지
- AI 드래프트 채택 (스캐폴드 X)
- 트리거는 자동 아닌 CTA
- 섹션은 텍스트 컬럼 (JSON 아님)

---

## 7. PRD 언급 vs 구현 현황

### PRD에 있고 구현된 것 ✅
| PRD 에이전트 | 구현 파일 |
|-------------|-----------|
| Self Insight Agent | `api/self-insight/route.ts` |
| Problem Scout Agent | `api/problems/scout/route.ts` |
| Fit Judge Agent | `api/fit/route.ts` (PUT) |
| Validation Designer Agent | `api/validation/route.ts` (POST) |
| Reality Check — Cold Investor | `api/reality-check/route.ts` |
| Reality Check — Honest Friend | `api/reality-check/route.ts` |
| Reality Check — Socratic | `api/reality-check/route.ts` |
| Reality Check — Moderator | `api/reality-check/route.ts` |

### PRD에 있으나 미구현 ❌
| 기능 | 설명 |
|------|------|
| **OnePager Composer Agent** | 기획 정렬 완료 (2026-04-30). Phase 1~3에서 구현 예정 — 데이터 모델 → 에이전트 → UI |
| Problem Scout 주기적 업데이트 | 웹 크롤링 기반 자동 갱신 (Weekly job) |
| Weekly Digest | 주간 Self Map 변화 요약 + 추천 알림 |
| LearningLog → SelfMap/ProblemCard 역류 | CLAUDE.md 진행 중 항목 |

### 구현됐으나 PRD 외 추가 ⚠️
없음. 단, 아래는 PRD 범위와 경계가 불명확한 항목:
- `api/problems/seed` — 하드코딩 시드 (임시 구현, 운영 코드로 남아있음)

---

## 8. CLAUDE.md 준수 현황

| 원칙 | 현황 |
|------|------|
| `lib/agents/<name>/prompt.ts + schema.ts + run.ts` 3파일 구조 | ❌ 미준수 — 모두 route.ts 인라인 |
| 에이전트 응답: JSON mode + Zod 스키마 검증 | ❌ 미준수 — 정규식 파싱 사용 |
| 시드 데이터: `seeds/problem-cards.json`으로만 | ❌ 미준수 — route.ts 하드코딩 |
| LearningLog → 엔티티 역류 트랜잭션 | ❌ 미구현 |
| Fit Judge: Self Map 인용 형태 근거 표시 | ⚠️ 부분 — reason 필드 있으나 인용 아님 |
| 한 번에 하나의 질문 (Self Insight) | ✅ 프롬프트에 명시 |
| 병렬 호출 (Reality Check) | ✅ Promise.all |
| 아이디어 생성 금지 | ⚠️ Validation Designer의 `ideaDraft` 필드가 경계 |
