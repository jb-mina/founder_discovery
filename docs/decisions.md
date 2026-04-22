# Founder Discovery — Decision Log

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
