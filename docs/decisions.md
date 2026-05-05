# My 0to1 — Decision Log

> 작성 원칙: "왜 이 방향인가"를 저장한다. git은 "무엇을 바꿨는지"를 저장한다.
> 한 결정당 5줄 이내. 결정 번호는 추가 순서대로.

---

## ProblemCard 아카이브: stage enum 대신 별도 `archivedAt`, 영구 삭제는 archived 가드
**날짜**: 2026-05-05
**결정**: 검증 허브에 보류·broken이 누적되는 카드를 사용자가 시야에서 빼는 escape hatch가 필요. `ProblemCard.archivedAt: DateTime?` 추가, 활성 리스트 쿼리에 `archivedAt: null` 필터, 별도 `/validation/archive` 페이지에서 복원/영구 삭제 노출. 영구 삭제는 archived 카드에서만 허용 (DELETE `/api/problems/:id` 가드 + UI 분리).
**이유**: stage는 string으로 쓰이는 자유 필드라 `archived`를 그 안에 넣으면 stage 본래 값(seed/series-a 등)을 덮어써 복원 시 정보 손실. 별도 timestamp 필드는 stage·복원 경로와 직교하고 인덱스도 효율적. 영구 삭제 직행은 "발견은 누적이다" 원칙 위반 — 아카이브 단계를 1차 동작으로 강제하면 cascade 손실 위험을 한 번 더 검토하게 됨.
**버리는 것**: ① stage enum 확장 안. ② SolutionHypothesis 단위 아카이브 — 이미 `shelved`로 대체 가능. ③ 자동 아카이브 제안 — 사용자 데이터 누적 후 P1.

---

## Self Map Synthesizer max_tokens 8192 + 모든 fallback 파싱에 try/catch 의무화
**날짜**: 2026-05-04
**결정**: 합성기 응답이 4096에서도 잘려 production 500 발생. 8192로 상향 + `stop_reason === "max_tokens"` 가드 + regex fallback `JSON.parse(jsonMatch[0])`도 try/catch로 감싸 raw SyntaxError가 새지 않게.
**이유**: `entryTagsByEntryId`는 모든 entry 1건당 한국어 태그 배열을 출력해 entries가 많아질수록 출력 크기가 entry 수에 비례. Method Coach 4096 결정(2026-05-04)이 "한국어 풍부 출력은 4096 권장"이었지만 합성기는 entry 수까지 곱해져 더 커짐 — 8192가 30+ entries 기준 안전선.
**신규 규칙**: regex fallback 안의 `JSON.parse`는 항상 try/catch로 감싼다. 안 그러면 truncation을 명시적 에러로 surface하지 못함.

---

## 신규 에이전트 default max_tokens 4096 + stop_reason 가드
**날짜**: 2026-05-04
**결정**: Method Coach가 production에서 "no JSON found" 500을 던졌고, 원인은 한국어 풍부 출력이 2048 토큰을 넘어 응답이 truncate된 것. 4096으로 상향 + `response.stop_reason === "max_tokens"` 가드 추가.
**이유**: 2026-04-22 Validation Plan 파싱 버그 결정에서 "다른 에이전트도 동일 리스크"라고 명시했지만 Method Coach 신설 시 그 교훈을 적용 못 함 — 회귀 방지 위해 신규 에이전트 default를 4096으로 정착. stop_reason 가드는 다음에 같은 일이 발생하면 "JSON 파싱"이 아닌 "truncation"을 정확히 가리키게 함.
**권장**: 신규 에이전트 추가 시 한국어 + JSON + 풍부 출력 조합이면 4096부터 시작, 더 큰 출력은 8192까지 늘리거나 출력을 쪼갠다.

---

## Method Coach: 별도 에이전트 + lazy 생성 + 결정권 없음
**날짜**: 2026-05-04
**결정**: Validation Designer가 처방한 메서드별 실행 가이드는 신규 에이전트 `method-coach`로 분리하고, 사용자가 메서드 칩을 펼칠 때만 lazy 생성·캐시(`MethodGuide` 테이블, `(hypothesisId, method)` unique).
**이유**: Validation Designer 책임은 "축별 메서드 처방 + 시그널". 여기에 "메서드 실행 코칭"을 얹으면 CLAUDE.md "에이전트에 책임 두 개 이상 주입 금지" 위반. 또 2축×3메서드≈6 호출을 검증 허브 진입 시 eager로 돌리면 로딩 폭발 + 사용자가 안 펼치는 가이드도 생성해 비용 낭비.
**경계**: 가이드는 실행 frame + 템플릿 raw material까지만. 최종 질문지·카피·가격은 사용자가 채움(자기결정 원칙).
**버리는 것**: Validation Designer 출력 스키마 확장(통합 에이전트) 안 — 책임 분리가 더 중요.

---

## Validating list bucket: 부모 SolutionHypothesis.status를 SSoT로 사용
**날짜**: 2026-05-04
**결정**: `deriveListStatus`의 "검증 완료" 판정을 자식 hypothesis 둘 다 confirmed → 부모에 `status === "confirmed"` 솔루션 존재 여부로 변경.
**이유**: PR #46 "활성화로 원복" escape hatch가 부모=active + 자식=confirmed라는 새 상태 조합을 만들었는데, 자식 status로 bucket을 판정하면 사용자의 명시적 원복 의도가 무시되고 "검증 완료" 탭에 잘못 카테고리화됨. CLAUDE.md 원칙(부모 status가 사용자 의도의 SSoT)과 정렬.
**유지**: Stepper(`axisStatusFor`)는 자식 status 그대로 — 검증 findings는 보존된다는 정보 시각화. Bucket(부모 의도)와 Stepper(축별 진행)의 분리는 의도적.

---

## 1-pager 게이팅 완화: problemConfirmed 제거
**날짜**: 2026-05-04
**결정**: 1-pager 생성/재생성 게이트를 `problemConfirmed && solution.status === "active"`에서 `solution.status === "active"`로 축소.
**이유**: 실사용 결과 문제 검증이 끝나기 전에도 솔루션 발상이 떠오르면 1-pager 초안과 패널 검토를 통해 비즈니스 사고를 빠르게 정리하고 싶다는 니즈 발견. 검증 완료를 강제하면 탐색 흐름이 끊김. 1-pager는 어차피 가설 문서이지 결론서가 아니므로 조기 작성을 막을 이유 없음.
**유지**: 활성 상태 게이팅은 보류/완료/깨짐 솔루션의 1-pager 신규 생성·재생성을 막는 용도로 그대로 유지(viewing은 항상 허용).

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

## 1-pager는 솔루션 단위 (1:1) — problem 단위 아님
**날짜**: 2026-04-30
**결정**: `OnePager` 엔티티는 `SolutionHypothesis`와 1:1 unique. 한 problem 아래 활성 솔루션이 N개여도 각각 자기 1-pager를 가짐.
**이유**: 솔루션마다 MVP 범위·비용·수익화 가설이 다름. problem 단위 1개로 묶으면 솔루션 비교(병렬 active 허용 결정과 정합)가 깨짐. 솔루션이 broken으로 떨어지면 그 1-pager도 함께 의미 없어지므로 cascade도 자연스러움.
**버리는 것**: problem 단위 1-pager의 "한 문제에 대한 종합적 사업화 사고" 응집감. 솔루션 비교가 더 우선이라 판단.

---

## RC FK는 SolutionHypothesis 유지 — 1-pager로 이전 안 함
**날짜**: 2026-04-30
**결정**: 1-pager 도입 후에도 `RealityCheck.solutionHypothesisId` FK 그대로. RC는 OnePager가 있으면 입력 컨텍스트에 10 섹션을 추가로 주입할 뿐, 부착 단위는 솔루션.
**이유**: RC는 개념적으로 *솔루션에 대한 비판*이고 1-pager는 그 솔루션의 *상세 표현*. FK를 옮기면 1-pager 없는 솔루션의 RC 이력이 끊기고, RC를 다시 돌릴 때 1-pager 없는 케이스가 별도 코드 경로로 분기됨. 하위호환과 스키마 안정성을 위해 입력 풍부화로만 처리.
**버리는 것**: "RC는 1-pager에 대한 평가"라는 더 정확한 개념적 정렬. 대신 RC inputContext에 1-pager 포함 여부를 기록해 사후 분석 가능.

---

## 1-pager는 AI 드래프트 → 사용자 편집 (스캐폴드 X)
**날짜**: 2026-04-30
**결정**: OnePager Composer가 10 섹션을 한국어 풀 텍스트 초안으로 생성. 사용자는 그 초안을 편집. 빈 섹션 + 질문 프롬프트만 주는 스캐폴드 방식 폐기.
**이유**: 0to1 단계의 핵심 마찰은 "빈 캔버스 비용". MVP 비용·운영 모델 같은 사고는 빈칸으로 두면 회피되기 쉬움. AI 초안은 *결정*이 아니라 *시작점* — Solution Suggester가 후보 statement를 던지고 사용자가 편집해 등록하는 패턴과 동일하게 "AI 후보 → 사용자 편집"으로 자기결정 원칙 보존.
**버리는 것**: 스캐폴드 방식의 더 명확한 "AI는 구조만, 내용은 유저" 경계. 대신 책임 경계는 에이전트 프롬프트에서 "초안만 생성, 의견·추천·결정 표현 금지"로 강제.

---

## 1-pager 트리거는 자동 아닌 CTA
**날짜**: 2026-04-30
**결정**: 진입 조건(존재·심각도 confirmed + 솔루션 active) 만족 시 `SolutionValidationBlock` 안에 "1-pager 초안 생성" CTA만 노출. 자동으로 1-pager를 만들거나 모달을 띄우지 않음.
**이유**: 솔루션 statement 한 줄만 가지고 너무 일찍 1-pager로 깊이 들어가면, 정작 핏·지불 의사 검증(인터뷰·관찰)을 안 하고 문서 작성에만 시간 쏟는 함정 발생. CTA는 "병행 가능"의 신호이지 "해야 한다"의 강제가 아님.
**버리는 것**: 자동 트리거의 "사용자가 잊지 않게 강제하는" 보장. 대신 CTA 카피로 "검증과 병행"을 안내.

---

## 1-pager 섹션은 텍스트 컬럼 (JSON 아님)
**날짜**: 2026-04-30
**결정**: `OnePager` 모델의 10 섹션은 각각 `String @db.Text` 컬럼. JSON blob 아님. 주요 리스크 3개·30일 검증 액션도 자유 텍스트(개행 분리 권장)로 저장.
**이유**: 자유 작성 + Prisma 마이그레이션 단순화. 향후 "리스크 3개 슬롯", "검증 액션 체크리스트" 등 구조화 필요시 v2 마이그레이션으로 분해. v1은 사용 패턴 학습이 우선.
**버리는 것**: JSON 구조화의 쿼리·UI 일관성. 대신 텍스트 자유도로 사용자가 자기 방식대로 적도록 허용.

---

## ProblemCard 카테고리는 클라이언트 enum + Scout 출력 강제
**날짜**: 2026-05-01
**결정**: ProblemCard.category는 Prisma 스키마는 그대로 `String @default("")`로 두되, `lib/problem-categories.ts`의 33개 enum(9그룹)을 단일 진실로 둔다. Scout 시스템 프롬프트에 enum 명시 + 미일치 시 빈 문자열 강제, ScoutModal·POST·PATCH 라우트에서 이중 가드. ScoutModal에는 enum 외 도메인을 위한 자유 chip 입력을 추가하되 자유 chip은 query에만 흘러가고 출력 enum은 강제 유지.
**이유**: 기존엔 Scout LLM이 자유 텍스트로 category를 채워 "Mental Health / AI", "Ghost Kitchen" 같은 즉흥 라벨이 누적, Problem Universe 필터가 오염되어 있었음. 입구만 닫고 자연 감쇠를 노릴 수도 있었으나 1회 정리 스크립트(`scripts/normalize-categories.ts`)로 기존 더러운 값을 enum에 매핑하고 매핑 불가는 빈 문자열로 폴백 — 사용자 수동 재분류 대상. enum 미일치 시 LLM에게 "가장 가까운 enum 강제 매칭"을 시키지 않은 이유는 부적합 매칭으로 분류 어색해질 위험 회피.
**버리는 것**: enum 외 도메인의 출력 카테고리(빈 문자열로 들어옴). 추후 enum 확장 시 정리 스크립트만 한 번 더 돌려 정합 유지.

---

## Self Map 합성 책임은 별도 Synthesizer 에이전트로 분리
**날짜**: 2026-05-01
**결정**: Founder Identity / Tension / Gap 합성을 `src/lib/agents/self-map-synthesizer/`에 신규 에이전트로 둠. Self Insight는 질문자 역할만 유지, 합성·해석에 절대 관여하지 않음.
**이유**: `CLAUDE.md §3` "Self Insight Agent — 질문자. 조언·해석·요약·공감 코멘트 금지"와 §7 "에이전트가 약하게 작동한다면 책임 분리부터 의심한다"의 정신. Validation Designer / Solution Suggester를 분리한 패턴 그대로. 한 에이전트에 두 책임을 주면 인터뷰가 약해지거나 합성이 약해지는 함정 — Solution Suggester 분리 때 이미 확인됨.
**버리는 것**: 한 에이전트로 끝내는 단순성과 토큰 1콜 절감. 대신 합성은 캐시(snapshotKey 기준)로 단발 호출 빈도를 낮춤.

---

## Self Map UX 개편 시퀀스 — 4모드부터, 외부 자극 연결은 후순위
**날짜**: 2026-05-01
**결정**: phase 1은 Synthesizer + 4모드(thread/gap/tension/energy) opening + 끝내기 버튼 + Layer 1(Founder Identity Card) + Layer 3(Tension/Gap 사이드)까지. 외부 자극 연결(5번째 모드 — Problem Universe 활동 연결)·노드맵·시간성 시각화·LearningLog 역류는 별 PR.
**이유**: 외부 자극 연결은 `ProblemCardActivity` 신규 모델이 필요 — Self Map만의 변경이 아니라 Problem Universe와의 결합. PR 단위를 좁혀 리뷰·롤백 안전성과 사용자가 받는 첫 가치(정체성 카드)의 응집감 둘 다 살리는 게 목적. 노드맵은 그래프 라이브러리·태그 N:M 정규화·사용자 편집 UI까지 결정 폭이 커서 Identity/Tension/Gap이 안정된 후 별 PR.
**버리는 것**: 한 번에 비전 전체를 구현하는 응집감. 노드맵을 phase 1에 못 넣는 손실은 "Layer 1+3만으로도 가치 80% 회수" 가정에 베팅.

---

## 인터뷰 종료는 명시적 사용자 액션 ("오늘은 여기까지" 버튼)
**날짜**: 2026-05-01
**결정**: 자동 종료(타이머·메시지 수 임계) 대신 명시적 버튼. 페이지 이탈 시 `InterviewSession.endedAt`은 null로 남고, opening 라우트는 `endedAt is not null`인 세션만 thread 모드 후보로 본다.
**이유**: 자동 종료는 "끝났다"는 사용자 의사를 추정해야 하는데 추정 실패 시 다음 세션의 thread 후보가 false positive로 들어가 인터뷰 품질 저하. 명시 버튼은 "이건 정리해도 돼"라는 사용자 결단을 캡처. 미종료 세션의 메시지(`AgentConversation`)는 그대로 살아있어 데이터 손실 없음 — 단지 thread 메타가 비는 것뿐.
**버리는 것**: 사용자가 매번 버튼을 눌러야 하는 마찰. 미종료 세션의 thread 후보 누락. 후속에서 24h cron으로 자동 endedAt set 옵션 검토.

---

## Self Map 노드맵(Layer 2)은 별 PR
**날짜**: 2026-05-01
**결정**: 카드 리스트 → 정체성 캔버스 전환에서 Layer 2(태그 기반 노드맵 시각화)는 phase 1에 포함하지 않음. Layer 1(Founder Identity Card) + Layer 3(Tension/Gap 사이드)만.
**이유**: 노드맵은 (1) 태그 N:M 정규화 + Tag 엔티티 신설, (2) Synthesizer 태그 추출 후처리 강화, (3) 그래프 라이브러리 도입과 노드 placement·인터랙션 결정, (4) 사용자 편집 UI까지 한 PR이 결정해야 할 폭이 큼. Identity Card / Tension / Gap은 데이터·UI 모두 기존 컴포넌트 패턴 안에서 완결. 데이터(citedEntryIds·tensions)가 안정된 후 시각화 위에 얹는 게 안전.
**버리는 것**: "정체성 캔버스" 비유가 한 PR에 안 닫힘. UI 카피를 phase 1에서 신중히 — "Identity 카드 / 긴장과 갭"으로만 표현하고 "캔버스" 단어는 노드맵 도입 시 노출.

---

## Self Map 노드맵 — Tag 엔티티 대신 JSON map, cytoscape.js 채택
**날짜**: 2026-05-01
**결정**: 노드맵 phase 2 도입. 별 Tag 엔티티(N:M)를 만들지 않고 `SelfMapSynthesis.entryTagsByEntryId` JSON 컬럼 한 개로 시작. 그래프 라이브러리는 `cytoscape.js + react-cytoscapejs + cose-bilkent` (force-directed 클러스터 레이아웃). 그래프 엣지 = 사용자 수동 `SelfMapEntry.tags`(콤마)와 Synthesizer 자동 entryTagsByEntryId의 union 교집합 ≥ 1.
**이유**: 노드맵 첫 릴리스에 Tag별 메타(별명·색깔·정의)는 불필요. JSON map은 마이그레이션 1줄(ADD COLUMN), 후에 사용 패턴을 보고 Tag 엔티티로 정규화 가능. cytoscape는 cose-bilkent 클러스터링이 사용자 비전("자연스럽게 클러스터 형성")에 직결 — D3 직접·react-force-graph보다 ROI 높음. 두 출처를 union하는 이유는 LLM 추출이 약한 entry를 사용자가 보완하고, 사용자가 안 적은 개념을 LLM이 보완하는 양방향 시너지.
**버리는 것**: Tag별 메타데이터(태그 정의·색깔). 시간이 지나 동일 태그 변형(`자동화` vs `자동화 도구`)이 누적되면 정규화 스크립트 필요할 수 있음 — 그 시점에 Tag 엔티티 마이그레이션 검토.

---

## Self Map 페이지 모드 토글 (인터뷰 ↔ 캔버스) + selfMapView 폐기
**날짜**: 2026-05-01
**결정**: 사이드 안 List/Map 토글(`selfMapView`)을 폐기하고 페이지 단위 `pageMode "interview" | "canvas"` 토글로 통합. 캔버스 모드에선 채팅 영역 숨기고 노드맵을 풀폭으로 메인 panel(데스크톱) 또는 사이드 인라인(모바일)에 배치. NodeMap height는 `420px 고정` → 부모가 결정(`h-full`)하고 ResizeObserver로 `cy.resize() + cy.fit()` 호출. cose-bilkent 옵션도 큰 캔버스에 맞춰 `nodeRepulsion 4500→6500, idealEdgeLength 80→100` 튜닝. 노드 라벨은 8자 truncate하고 호버 시 footer에 전체 질문 표시.
**이유**: PR #38 production에서 노드맵 컨테이너가 사이드 폭(28~32rem) 안에 갇혀 cose-bilkent가 노드/라벨을 겹치게 배치. 사이드 폭만 늘리면 채팅 영역이 깎임. 페이지 모드로 분리하면 두 영역이 각자 풀폭을 받을 수 있고, 사용자 원래 비전(plan §3 "두 모드 스위치")과도 일치. 모바일 탭바도 채팅/맵 → 인터뷰/캔버스로 통합해 일관된 멘탈 모델.
**버리는 것**: 사이드 안 미니 노드맵 동시 가시성. 데스크톱 캔버스 모드에선 채팅이 사라지므로 진행 중 인터뷰 흐름은 일시 단절 — 노드 클릭 → 자동 인터뷰 모드 전환 + 카드 스크롤로 모드 간 흐름을 연결.

---

## 노드맵 클러스터 의미는 카테고리 단위 한 줄로 (compound 박스 라벨에 통합)
**날짜**: 2026-05-01
**결정**: Self Map Synthesizer 출력에 `clusterMeanings: { category, oneLine }[]` 추가. cose-bilkent compound 박스 라벨을 "카테고리\n의미한줄" 두 줄로 렌더해 캔버스에서 같은 카테고리 노드들이 모이는 영역의 의미가 한눈에 보이도록.
**이유**: PR #39 production에서 사용자 피드백 — 노드맵이 "그냥 시각화"이고 클러스터별 의미가 안 보임. 별도 cytoscape overlay div로 의미를 placement하면 pan/zoom 동기화 비용 큼. compound 노드 label에 통합하면 cytoscape가 노드 위치 결정 → 의미가 박스 위에 자동 배치 + 폰트는 카테고리(13px) vs 의미(11px)로 위계 표현. 한 카테고리 entry 2개 미만이면 의미 산출 안 함(약한 패턴 단정 회피, 프롬프트에 가드).
**버리는 것**: 카테고리 경계를 넘는 cross-category 클러스터의 의미는 표현 못 함 (예: 관심사·강점에 걸쳐 있는 패턴). 그건 identityStatement가 이미 풀 텍스트로 다룸. 카테고리별 의미는 보조 lens로.

---
