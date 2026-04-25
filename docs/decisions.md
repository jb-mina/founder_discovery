# My 0to1 — Decision Log

> 작성 원칙: "왜 이 방향인가"를 저장한다. git은 "무엇을 바꿨는지"를 저장한다.
> 한 결정당 5줄 이내. 결정 번호는 추가 순서대로.

---

## Self Map 항목 편집: 모달 방식 (B안)
**날짜**: 2026-04-22
**결정**: 카드 인라인 편집 대신 모달(오버레이) 방식으로 구현. category / question / answer / tags 전 필드 편집 지원.
**이유**: category 변경이 필요해 인라인 방식이 카드 레이아웃을 가변적으로 깨뜨림. 편집 아이콘은 hover 숨김 없이 항상 표시—존재 자체를 알 수 없는 UI는 사용 불가로 판단.
**버리는 것**: A안(인라인 편집)의 화면 전환 없는 단순성.

---

## Light Mode 전환 + CSS 시맨틱 색상 토큰
**날짜**: 2026-04-22
**결정**: 다크 모드(neutral-950)에서 라이트 모드(neutral-50)로 전환. 하드코딩 색상 클래스를 `globals.css` `@theme` 블록의 시맨틱 토큰으로 교체.
**이유**: 사용자 선호(라이트 모드가 더 편함). 전환 과정에서 10개 파일을 각각 수정해야 해 구조적 문제 확인 → 시맨틱 토큰 도입으로 다음 테마 변경 시 `globals.css` 한 곳만 수정하면 전파.
**토큰 구조**: 배경 3단계(canvas/surface/wash), 텍스트 6단계(foreground→subtle), 테두리 2단계(border/border-strong). 의미 있는 색상(violet/green/amber 등)은 그대로 유지.
**Tailwind v4 주의**: `tailwind.config.ts` 없음. `@theme` 블록의 `--color-*` 변수가 자동으로 `bg-*`/`text-*`/`border-*` 유틸리티로 노출됨.

---

## Validation Plan JSON 파싱 버그 수정
**날짜**: 2026-04-22
**결정**: `max_tokens` 2048 → 4096 상향. system prompt 추가, 마크다운 펜스 제거, try/catch 적용.
**이유**: 한국어 ValidationPlan JSON 전체가 2048 토큰을 초과 → Claude가 문자열 중간에서 잘려 JSON.parse throw → 500 반환. 펜스 제거·system prompt는 방어적 추가. 근본 원인은 max_tokens 부족. 다른 에이전트도 동일 리스크 있음(reality-check, fit 등).

---

## Self Insight Zod 전환: 클라이언트 2-step 분리 (B안)
**날짜**: 2026-04-22
**결정**: 스트리밍 대화와 구조화 추출을 분리. `/api/self-insight` (스트리밍) + `/api/self-insight/extract` (별도 호출). 클라이언트가 스트림 완료 이벤트에서 extract를 트리거.
**이유**: 추출 로직(Zod 검증, 프롬프트 튜닝, 재시도)은 대화 UX와 별개로 수정될 일이 잦음. 분리되어 있어야 대화 UX를 건드리지 않고 추출만 개선 가능. 추출 실패가 대화 유실로 이어지지 않음.
**버리는 것**: A안(서버 순차 처리)의 단순성.

---

## Problem Scout 투자 뉴스 데이터 소스 추가
**날짜**: 2026-04-22
**결정**: Tavily API 단일 호출로 뉴스 검색 + 콘텐츠 추출 동시 처리. `include_raw_content: true`로 본문까지 가져와 Claude에게 컨텍스트로 전달.
**이유**: 두 번 호출(검색 → 크롤링) 대신 한 번으로 해결해 레이턴시 절감. 로딩이 10~15초로 길어 `||STAGE||` 프로토콜로 단계별 진행 상태를 스트리밍.
**버리는 것**: 스타트업 랜딩 페이지 별도 크롤링의 정확성.

---

## Problem Scout 투자 뉴스 sourceUrl: 기사 URL 고정 (A안)
**날짜**: 2026-04-22
**결정**: 뉴스 카드의 sourceUrl은 Tavily가 반환한 기사 URL(`url` 필드)만 사용. 스타트업 웹사이트 URL 추출 시도하지 않음.
**이유**: Claude가 기사 본문에서 스타트업 URL을 찾지 못할 경우 URL을 hallucinate하는 리스크 존재. 기사 URL은 항상 실존이 보장됨. 사용자가 기사를 열면 그 안에서 스타트업 링크를 직접 확인 가능.
**버리는 것**: B안(스타트업 홈페이지 우선 → 없으면 기사 URL)의 직접 링크 편의성.

---

## Problem Universe 상세 패널 + 인라인 Fit 평가
**날짜**: 2026-04-22
**결정**: 카드 클릭 시 우측 슬라이드 패널로 전체 필드 표시. 패널 하단 "Fit 평가하기" 버튼이 /fit 페이지 이동 없이 인라인 모달을 열도록 변경.
**이유**: 이전 구조는 상세 내용을 볼 방법 없이 카드 목록만 표시. "Fit 평가하기" 클릭 시 /fit으로 페이지 이동해 흐름이 단절됨.
**버리는 것**: /fit 페이지로의 이동 CTA — Problem Universe에서 평가까지 한 흐름으로 처리.

---

## Fit 페이지 탭 구조 + 미평가 카드 상세 확인 흐름
**날짜**: 2026-04-22
**결정**: 미평가/평가완료 탭 분리. 미평가 카드 클릭 시 평가 모달 직행 대신 상세 패널을 먼저 열고 패널 하단 "평가하기"로 모달 진입.
**이유**: 기존 클릭 즉시 모달은 어떤 문제인지 확인 없이 평가해야 하는 구조. 상세 패널 먼저 → 평가 순서가 사용자 기대 흐름에 부합.
**버리는 것**: 클릭 즉시 평가 모달의 단계 최소성.

---

## My 0to1 리브랜딩 + 0to1 운영체제로 정체성 확장
**날짜**: 2026-04-25
**결정**: 서비스명을 `Founder Discovery` → `My 0to1`로 변경. 정체성도 "개인용 발견 OS / Discovery Copilot"에서 "**개인용 비즈니스 0to1 운영체제 / 0to1 Copilot**"으로 확장 — 문제·고객 발견에서 멈추지 않고 솔루션 핏 검증까지를 한 제품 안에서 책임진다고 명시.
**이유**: 인터뷰가 "문제 존재"는 검증해도 "지불할 만한 고통"은 검증 못 한다는 함정이 명확해졌고, 발견에서 끝나는 제품은 사용자가 가장 비싸게 실수하는 구간(검증 단계)을 비워둠. 스코프를 0to1 검증까지 확장해야 가치 사슬이 닫힘.
**버리는 것**: "Discovery"라는 좁은 포지셔닝의 메시지 명료성. 대신 검증까지 포함한 0to1 전체 구간의 책임을 진다.

---

## Validation 4가지 가설 축 도입 (1pager 구조 유지)
**날짜**: 2026-04-25
**결정**: ValidationPlan UX의 "한 덩어리 1pager" 골격은 유지. 다만 1pager 내부 입력·구성 요소를 **4가지 핵심 가설(문제 존재 / 심각도 / 솔루션 핏 / 지불 의사)** 축으로 재구성하고, 가설별로 적합한 검증 메서드(인터뷰·관찰·스모크 테스트·페이크 도어·소액 선결제·컨시어지 PoC)를 처방하는 구조로 전환.
**이유**: 기존 "인터뷰·관찰·수기 PoC 1~4주 플랜"은 어떤 가설을 깨는지 모호 → 사용자가 공감("저도 그래요")을 검증으로 착각하는 함정에 그대로 노출됨. 가설 축이 명시돼야 "이 단계에서 무엇이 깨졌는가"를 누적 컨텍스트(Real Moat)에 정확히 적재 가능.
**버리는 것**: 가설별 분리 카드 UI(가장 직관적이지만 1pager의 응집감과 어긋남). 1pager 한 화면 안에 가설 섹션을 배치하는 절충안 채택.
**미정**: 1pager 내 가설 섹션의 정확한 입력 필드와 데이터 모델 마이그레이션은 후속 플래닝에서 결정.

---

## DB로 Neon 채택 — 사유 명시화
**날짜**: 2026-04-25
**결정**: Postgres BaaS로 Neon 유지. Supabase의 Auth/Storage/Realtime은 사용하지 않음.
**이유**: 현재는 Postgres만 필요(인증은 단순 패스워드 게이트, 스토리지·실시간 미사용). Neon DB 브랜칭이 Vercel preview 환경과 정합. Postgres 표준 의존이라 lock-in이 낮아 후속 옮김 비용도 작음. Supabase의 batteries-included는 지금 가치보다 학습/관리 비용이 큼.
**버리는 것**: Auth + Storage + Realtime이 한 SDK에 묶이는 편의성. **다음 마일스톤(랜딩 수요검증) 직후 Auth 도입 예정** — 그 시점에 Supabase Auth vs Clerk/Auth.js 재검토.

---

## ValidationPlan 제거 + SolutionHypothesis 1급 엔티티 승격
**날짜**: 2026-04-25
**결정**: `ValidationPlan` 모델 제거. `SolutionHypothesis`(ProblemCard 1:N) 신설. `Hypothesis`는 단일 테이블 + 두 nullable FK(`problemCardId`, `solutionHypothesisId`) 패턴으로 부모 분기. existence/severity는 ProblemCard에, fit/willingness는 SolutionHypothesis에 매달림. `RealityCheck`는 SolutionHypothesis로 FK 이전.
**이유**: 4가설 중 existence/severity는 솔루션 무관(=문제 단위), fit/willingness는 솔루션 의존(=솔루션 단위). 한 ValidationPlan이 두 단위를 묶어 가지면 (a) 솔루션 iteration 시 누적 증거가 끊기고, (b) 솔루션 가설이 검증 계획의 사이드 아웃풋으로 약하게 다뤄지는 두 함정 발생. 솔루션을 1급으로 승격해야 Real Moat(누적 컨텍스트) 정합성이 살아남.
**버리는 것**: 직전 결정 "1pager 한 화면 안에 가설 섹션 배치"를 사실상 뒤집음. 1pager 응집은 ProblemCard 단위 허브 페이지(`/validation/[problemCardId]`)가 담당. 옛 결정은 historical로 남기되, 이 항목 본문이 뒤집은 사유를 짚는다. 기존 ValidationPlan 데이터는 손실 수용(본인 작성 데이터뿐).

---

## 솔루션 가설 입력 방식 — 사용자 직접 입력 + 에이전트 후보 제안 결합
**날짜**: 2026-04-25
**결정**: 사용자가 직접 statement를 입력하거나, Solution Suggester 에이전트로부터 후보 3개를 받아 선택·편집해 저장하는 두 진입점을 제공. 두 진입점은 동일한 입력 폼으로 수렴.
**이유**: "사용자를 대신해 결정하지 않는다" 원칙 준수(직접 입력). 0to1 단계의 막막함 완화(에이전트 후보). 두 길을 같은 폼으로 수렴해 데이터 모델·UI 일관성 유지. 에이전트는 후보 제안에 머물고 선택·편집은 사용자 결정.
**버리는 것**: 에이전트 단독 자동 생성(자기결정 원칙 위반). 사용자 단독 입력만(0to1 막막함 비대응).

---

## 검증 허브를 2탭(문제 / 솔루션) 구조로 채택
**날짜**: 2026-04-25
**결정**: `/validation/[problemCardId]` 허브를 4가설 카드 평탄 배치도, 4탭(가설별)도 아닌 **2탭(문제 / 솔루션) + 섹션 구조**로 결정. Tab 1은 existence + severity 워크스페이스, Tab 2는 솔루션 가설 패널 + fit + willingness + Reality Check.
**이유**: 모바일 너비에서 4탭은 줄바꿈 부담. 사용자 멘탈 모델 = "문제 vs 솔루션" 양분이 자연스러움. existence + severity는 인터뷰 1번으로 함께 검증되는 경우가 많아 같은 탭에서 보는 게 실제 사용 패턴에 부합. **결정적으로**: Tab 1은 솔루션 UI 0건 → 사용자가 검증 안 한 채 솔루션부터 입력하는 흐름을 차단하는 의도가 보존됨.
**버리는 것**: "한 화면에 4가설 한눈에" 응집감(stepper로 보완), 가설 단위 strict 워크스페이스 격리(섹션 분리로 부분 충족).

---

## SolutionHypothesis 상태 자동 도출 (cascade)
**날짜**: 2026-04-25
**결정**: `SolutionHypothesis.status` 중 `broken` / `confirmed`는 자식 `Hypothesis.status`에서 자동 도출. PATCH `/api/hypotheses/:id` 호출 시 `recomputeSolutionStatus`가 부모를 재계산. 사용자가 능동 결정하는 건 `active` / `shelved` 두 가지뿐.
**이유**: 사용자가 솔루션 단위 broken을 직접 누르는 게 어색했음 — 가설 단위에 broken이 이미 있는데 솔루션 단위 broken을 또 명시하는 게 의미 중복. 그리고 broken vs shelved 기준이 사용자 입장에서 모호. 자동 도출하면 검증 결과가 곧 솔루션 상태로 반영되어 직관적.
**버리는 것**: 사용자가 "이 솔루션은 broken이다"를 명시 의사 표시할 수 있는 능동 액션. 대신 fit/willingness 가설을 broken으로 표시하면 솔루션도 자동 broken으로 cascade.

---

## Vercel build에 `prisma migrate deploy` 자동 통합
**날짜**: 2026-04-25
**결정**: `package.json`의 `build` 스크립트를 `prisma migrate deploy && prisma generate && next build`로 변경. 매 Vercel 배포 시 적용 안 된 마이그레이션을 자동 deploy.
**이유**: Phase 1 마이그레이션 적용 시 사용자가 "어떻게 마이그레이션 적용하지?"를 한참 헤맴. `migrate deploy`는 idempotent(이미 적용된 건 건너뜀)라 매 배포 안전. Prisma + Vercel 표준 패턴이고, 향후 마이그레이션 생길 때마다 동일 질문 안 나오게 박아둠.
**버리는 것**: 마이그레이션 적용 시점을 사람이 명시 결정할 수 있는 통제력. 자동화로 약간의 통제력을 빌드 일관성과 교환.

---

## 활성 솔루션 동시 다수 허용 — single-active invariant 폐기
**날짜**: 2026-04-25
**결정**: 한 ProblemCard 아래 여러 SolutionHypothesis가 동시에 `status='active'`일 수 있도록 허용. UI는 활성 솔루션마다 별도 검증 블록(fit + willingness 워크스페이스 + Reality Check)을 vertical stack으로 노출. PATCH `/api/solution-hypotheses/:id`에서 다른 sibling을 자동 demote하던 single-active invariant(직전 결정)는 폐기.
**이유**: 솔루션 탐색 단계에서 사용자는 검증 메서드·시그널·Reality Check를 **여러 후보에 대해 비교한 뒤 어느 솔루션에 시간·비용을 쓸지** 결정한다. 한 번에 하나만 활성이면 두 번째 솔루션의 처방을 보려고 첫 번째를 일부러 보류해야 하는 부자연스러운 UX 발생. 실 사용 후 Mina님 직관 — "병렬 비교가 자연스러운 흐름" — 검증됨.
**버리는 것**: "지금 추구하는 단 하나" 집중 모델의 단순성. 대신 활성 솔루션 N개의 검증 블록이 페이지 길이를 늘리는 비용을 수용.

---

## PostHog 도입 — 메타데이터 전용 + 쿠키 영속화
**날짜**: 2026-04-25
**결정**: PostHog US Cloud 채택. `persistence: 'cookie'`, `disable_session_recording: true`, `autocapture: false`, distinct_id = `u_` + SHA-256(`auth` 쿠키) 또는 anonymous. 이벤트는 `lib/posthog/events.ts` 타입 안전 카탈로그를 통해서만 전송(자유 `posthog.capture()` 금지).
**이유**: 원문(SelfMap·ProblemCard·Hypothesis statement·Reality Check) 유출 방지를 type-level로 강제하려면 autocapture opt-out 모델이 부적합. 쿠키 한정 영속화는 CLAUDE.md `localStorage` 금지 규칙과 정합. 해시 distinct_id는 멀티 디바이스 클러스터링과 invite 코드 기밀성을 동시에 만족.
**버리는 것**: autocapture 클릭 히트맵, 세션 리코딩의 디버깅 가치. 서버 이벤트(`posthog-node`)와 리버스 프록시는 후속.

---
