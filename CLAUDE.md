# My 0to1 (기존: Founder Discovery) — Claude Code Memory

이 문서는 Claude Code가 이 저장소에서 작업할 때 매번 참조하는 운영 원칙입니다.

**Ground truth 문서**
- 일반 개발 규칙: `agents-inventory.md`
- 제품 스펙: `docs/one-pager.md` · `docs/prd.md`
  
참조 문서에 원칙과 코드의 괴리가 보이면 **침묵으로 메꾸지 말고 먼저 보고할 것.**
모르는 상태를 합리적 추측으로 채운 코드는 이 프로젝트에서 가장 비싼 부채가 된다.

---

## 1. 이 제품이 무엇인가

1인/초기 창업자가 **Self map ↔ Problem universe ↔ Founder-problem fit ↔ Validation backlog**
4단계 루프를 따라, 자신과 맞는 문제를 찾고 시장에서 실제 고객을 찾아 솔루션 핏을 검증하도록 돕는 0 to 1 창업 Copilot.

"사업 아이디어 추천기"가 아닙니다. "초기 0to1 창업자의 의사결정 보조 장치"입니다.
이 구분은 본 문서 전체의 기준선입니다.

---

## 2. 제품 철학 — 코드 제안 전 반드시 확인

- **단순히 아이디어를 생성하지 않는다.** 에이전트는 사용자의 생각을 구조화하고 비교·검증을 돕는다.
  Validation Designer가 만드는 것은 "답"이 아니라 "검증 대상인 문제 및 솔루션 가설"이다.
- **사용자를 대신해 결정하지 않는다.** Fit Judge의 추천은 필터이지 판결이 아니다.
  최종 점수·우선순위·선택은 항상 사용자가 내린다.
- **루프가 끊기면 실패다.** 모든 학습 기록(`LearningLog`)은
  `SelfMap` · `ProblemCard` · `FitEvaluation` 중 하나 이상으로 역류해야 한다.
  새 기능 설계 시 "이 입력이 어디로 흐르는가"를 가장 먼저 답할 것.
- **발견은 누적이다.** 대화·평가·검증은 기본 영속. 삭제는 명시적 사용자 액션으로만.
- **속도보다 납득이다.** 1차 북극성 지표는 "이 문제를 정말 풀어도 되겠다는 확신"이고, 2차 북극성 지표는 "이 문제를 가진 타깃 고객에게 이 솔루션이 실제 작동한다"는 검증이다. 

---

## 3. 에이전트 경계

실제 구현 현황은 `docs/agents-inventory.md`가 ground truth.
아래는 각 에이전트가 지켜야 할 **경계 원칙**이며, 구현 여부와 무관하게 설계 기준으로 유지된다.

**0to1 5단계**

- **Self Insight Agent** — 질문자. 조언·해석·요약·공감 코멘트 금지.
  한 번에 한 질문, 사용자 턴을 기다린다.
- **Problem Scout Agent** — 수집·요약자. 문제 카드에 자기 의견이 섞이면 안 된다.
  출처 URL/날짜 필수. 생성된 URL은 유효성 검증을 거친 후 저장한다.
- **Fit Judge Agent** — 큐레이터. 추천 시 Self map의 특정 엔트리 ID를 근거로 인용한다.
  점수는 사용자만 매긴다.
- **Validation Designer Agent** — 1apger 설계자.
  출력 필드 `solutionHypothesis`는 **검증 대상 가설**이지 답이 아니다
  (UI에서 이 점을 명시할 것). 

**Reality Check — 패널 + 중재 구조**
의도적 설계 선택. 절대 "하나의 통합된 Reality Check Agent"로 병합하지 말 것.
- **냉정한 투자자** — 숫자·시장 규모·재무적 현실성. 감정 배제.
- **솔직한 친구** — 동기·에너지·삶의 맥락. 공감하되 달래지 않는다.
- **소크라테스식 질문자** — 단정 금지. 질문만.
- **중재자** — 세 목소리의 긴장을 드러낸다. 자기 의견 없음. 수렴시키지 말 것.

공통: 세 관점은 서로의 출력을 참조하지 않는다. Moderator만 참조 가능.
비판 시 반드시 반증 질문 또는 다음 액션을 함께 제시.

**에이전트 공통 규칙**

- 모든 응답은 JSON mode + zod 스키마 검증. 자유 텍스트·마커 파싱 금지.
- 새 에이전트 추가 시 `docs/agents-inventory.md` 먼저 업데이트 후 구현.

---

## 4. 데이터 모델

현재 Prisma 스키마 기준. 누락 필드/엔티티는 마이그레이션 대기 상태.

- `SelfMap` 엔트리 — 필드별 `sourceMessageId`(추가 대기).
- `ProblemCard` — `who` / `when` / `why` / `alternatives` / `painPoints` / `source` / `sourceUrl` / `sourceVerifiedAt`(추가 대기) / `stage`.
- `FitEvaluation` — `attraction` · `understanding` · `accessibility` · `motivation` (각 1–5, 평균 = `totalScore`).
- `ValidationPlan` — `solutionHypothesis`(구 `ideaDraft`, 리네이밍 대기) · `interviewQuestions[]` · `experimentMethod` · `successSignals` · `failureSignals` · `timeboxWeeks`(기본 2, 최대 4, 추가 대기).
- `LearningLog`(신설 대기) — `planId` · `format`(interview|observation|poc) · `findings` · `updatesTo[]`.
  현재는 `ValidationPlan.learnings` 문자열 필드에 누적됨.

**역류 규칙**: `LearningLog` 저장 트랜잭션 안에서 `updatesTo`에 명시된 엔티티를 함께 업데이트한다.
별도 잡/큐로 미루지 않는다. 구현 위치는 `lib/db/learning-log.ts`.

---

## 5. 기술 스택 & 커맨드

- Next.js App Router + TypeScript (`strict: true`)
- Prisma + PostgreSQL (Neon)
- Anthropic SDK — 기본 `claude-sonnet-4-6`, 복잡 추론은 `claude-opus-4-7`
- UI: Tailwind CSS + shadcn/ui
- 배포: Vercel

커맨드 (도입 예정): `npm run dev` / `npm run db:push` / `npm run db:migrate` / `npm test` / `npm run eval:agents`

---

## 6. 코드 컨벤션

- UI 카피·에이전트 프롬프트는 **한국어**. 코드·변수·파일명·커밋 메시지는 **영어**.
- 서버 컴포넌트 기본. 인터랙션이 필요한 것만 `"use client"`.
- Prisma 쿼리는 `lib/db/`에서만. 컴포넌트·route에서 직접 `prisma.*` 호출 금지. (현재 미준수 — 9번 참조)
- 파일 하나에 한 책임. 400줄 넘어가면 쪼갠다.
- 에이전트 호출은 `lib/agents/<agent-name>/`에 `prompt.ts` + `schema.ts` + `run.ts`. (현재 미준수 — 9번 참조)

---

## 7. 하지 말 것 (반복 실수 로그)

- 에이전트에 "친절한 도우미" 페르소나 주입 금지 → 아이디어 제안으로 드리프트.
- 에이전트 응답을 `---SAVE---` / `---END---` 같은 마커로 구분 금지. JSON mode + zod만.
- 클라이언트에서 정규식으로 응답 추출 금지.
- 시스템 프롬프트 없이 user 메시지로만 에이전트 역할을 지시하지 말 것.
- Fit Judge에 Self Map 전체와 ProblemCard 전체를 동시에 주입하지 말 것. 토큰 폭발.
- Reality Check에서 세 페르소나가 서로의 출력을 참조하게 하지 말 것. Moderator만 참조.
- Reality Check 4개 페르소나를 하나의 파일/프롬프트로 통합하지 말 것.
- `SelfMap` 전체를 매 요청 컨텍스트에 넣지 말 것. 해당 에이전트에 필요한 섹션만.
- Self map 데이터를 로그·분석 툴에 원문 전송 금지. 구조화된 메타데이터까지만.
- 문제 카드 시드를 코드에 하드코딩 금지. `seeds/problem-cards.json`으로만.
- Problem Scout가 생성한 URL을 검증 없이 저장 금지. HEAD 또는 web_fetch로 확인.
- `localStorage` / `sessionStorage` 사용 금지. 상태는 DB 또는 URL 쿼리.
- **필드명 스타일 마이그레이션을 이유로 기존 스키마 이름 변경 금지.** 철학적 의미 변화가 있을 때만.

---

## 8. 작업 시 기본 순서

1. **실제 코드·스키마부터 확인한다.** CLAUDE.md와 다른 점이 보이면 먼저 보고.
2. **어떤 엔티티를 건드리는가?** → 데이터 모델 변경 필요성 확인.
3. **어떤 에이전트의 경계를 건드리는가?** → 프롬프트·스키마 변경 여부.
4. **루프 어느 단계에 꽂히는가?** → 4단계 중 하나 이상에 매핑되어야 함. 매핑 안 되면 이 제품 기능이 아닐 가능성.
5. 구현.
6. 에이전트 변경이 있으면 회귀 테스트. 인벤토리 문서 업데이트.

---

## 9. 결정 기록 원칙

주요 설계 결정은 `docs/decisions.md`에 기록한다.
git은 "무엇을 바꿨는지"를 저장하고, 이 파일은 "왜 그 방향을 선택했는지"를 저장한다.

**기록 대상** — "나중에 왜 이렇게 했지?" 싶을 것들만.
- 두 가지 이상 선택지를 검토하고 하나를 고른 결정
- 하지 않기로 한 결정 (하지 않은 이유가 더 빠르게 사라짐)
- 기술 부채를 의도적으로 수용한 결정

**기록하지 않아도 되는 것** — 버그 픽스, 단순 리팩토링, 명백한 것.

**작성 기준** — 2분 안에 쓸 수 없으면 너무 길게 쓰는 것. 한 결정당 5줄 이내.

**트리거** — Claude Code와 플래닝 후 방향이 정해진 시점
---

## 11. 현재 상태

- **완료**: P0 루프 5개 에이전트.
- **진행**: Zod 마이그레이션, LearningLog 엔티티 신설.
- **다음**: `solutionHypothesis` 리네이밍 + 스키마 필드 추가 3종 묶음, URL 검증, Reality Check 프롬프트 튜닝.
