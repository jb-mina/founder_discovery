import Link from "next/link";
import { EmailSignupForm } from "./EmailSignupForm";
import { LandingTracker } from "./LandingTracker";
import { CycleDiagram } from "./CycleDiagram";

export function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <LandingTracker />
      {/* Top bar */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">◐</span>
          <p className="text-sm font-bold tracking-widest text-amber-400">My 0to1</p>
        </div>
        <Link
          href="#email-top"
          data-track-cta="header"
          className="text-xs text-amber-300 hover:text-amber-200 border border-amber-500/60 hover:border-amber-400 hover:bg-amber-500/10 rounded-full px-3 py-1.5 transition-colors"
        >
          초대장 받기
        </Link>
      </header>

      {/* Hero */}
      <section
        data-track-section="hero"
        className="px-6 py-16 md:py-28 max-w-4xl mx-auto text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-4 py-1.5 mb-7">
          <span className="size-1.5 rounded-full bg-amber-400" />
          <span className="text-xs md:text-sm tracking-wider text-amber-300">비공개 베타 · 초대장 신청 중</span>
        </span>
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.15] mb-8">
          &ldquo;무엇을 만들지&rdquo;
          <br />
          혼자 헤매고 있나요?
        </h1>
        <p className="text-base md:text-xl text-white/75 leading-relaxed mb-2">
          나에게 진짜 맞는 문제를 찾고, 시장이 돈을 낼 만한 고통인지까지 검증해주는{" "}
          <span className="text-white font-semibold">개인 전담</span> AI 코치 팀.
        </p>
        <p className="text-base md:text-xl text-white/75 mb-12">
          1인 창업자를 위한{" "}
          <span className="text-white font-semibold">비즈니스 0to1 운영체제</span>.
        </p>
        <EmailSignupForm id="email-top" location="top" />
        <p className="mt-5 text-xs md:text-sm text-white/40">
          초기 베타 슬롯은 한정되어 있어요. 스팸은 보내지 않아요.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs md:text-sm text-white/45">
          <span>· Self Insight Agent</span>
          <span>· Problem Scout</span>
          <span>· Fit Judge</span>
          <span>· Validation Coach</span>
          <span>· Reality Check</span>
        </div>
      </section>

      {/* Two traps */}
      <section
        data-track-section="traps"
        className="px-6 py-20 md:py-24 max-w-6xl mx-auto"
      >
        <p className="text-center text-xs md:text-sm text-amber-400 font-semibold tracking-[0.3em] mb-3">
          왜 이게 어려운가
        </p>
        <h2 className="text-center text-3xl md:text-5xl font-bold mb-14 leading-tight">
          창업자는 두 가지 함정에 차례로 빠집니다
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <TrapCard
            num="01"
            title="솔루션에 끌려가는 함정"
            desc='"문제부터 보라"는 말은 알지만, 트위터·뉴스·사례에서 본 멋진 솔루션이 머리를 채워요. 내가 진짜 풀고 싶은 문제와 그냥 매력적인 문제를 구분하기 어렵죠.'
            bait="✨ 멋진 솔루션 아이디어"
            outcome="내 문제가 아닌 걸 만든다"
          />
          <TrapCard
            num="02"
            title="공감을 지불 의사로 착각하는 함정"
            desc='인터뷰에서 "맞아요, 저도 그래요"를 듣고 검증된 줄 알지만, 출시하면 아무도 돈을 안 내요. 인터뷰는 문제의 존재만 검증할 뿐, 지불할 만한 고통의 크기는 검증하지 못합니다.'
            bait='💬 "맞아요, 저도 그래요"'
            outcome="출시했는데 아무도 안 산다"
          />
        </div>
        <p className="text-center text-sm text-white/50 mt-8">
          결과는 동일합니다 — 몇 달의 시간이 사라지고, 확신은 더 흐려집니다.
        </p>
      </section>

      {/* 4-stage cycle */}
      <section
        data-track-section="cycle"
        className="px-6 py-20 md:py-24 max-w-6xl mx-auto"
      >
        <p className="text-center text-xs md:text-sm text-amber-400 font-semibold tracking-[0.3em] mb-3">
          Core Mechanism
        </p>
        <h2 className="text-center text-3xl md:text-5xl font-bold mb-4 leading-tight">
          네 단계가 끊임없이 순환하며
          <br />
          정교해지는 발견 시스템
        </h2>
        <p className="text-center text-sm md:text-base text-white/55 mb-14">
          일회성 워크북이 아니라, 매번 더 또렷해지는 루프.
        </p>
        <CycleDiagram />
      </section>

      {/* Agent roles */}
      <section
        data-track-section="agents"
        className="px-6 py-20 md:py-24 max-w-6xl mx-auto"
      >
        <p className="text-center text-xs md:text-sm text-amber-400 font-semibold tracking-[0.3em] mb-3">
          04 — Agent Roles
        </p>
        <h2 className="text-center text-3xl md:text-5xl font-bold mb-4">
          0to1 각 단계마다 전담 에이전트
        </h2>
        <p className="text-center text-sm md:text-base text-white/55 mb-12 max-w-2xl mx-auto">
          범용 LLM 한 개가 모든 걸 하지 않습니다. 역할·금지사항·출력 규칙이 분명한 코치들이 당신의 턴을 존중하며 함께 움직입니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AgentCard
            symbol="?"
            name="Self Insight Agent"
            role="질문자"
            desc="조언·해석·요약·공감 코멘트 없이, 한 번에 한 질문씩. 당신의 턴을 기다리며 자기 이해를 구조화합니다."
            tags={["한 번에 한 질문", "조언/요약 금지", "Self Map DB 업데이트"]}
          />
          <AgentCard
            symbol="◈"
            name="Problem Scout Agent"
            role="수집·요약자"
            desc="문제 카드에 자기 의견을 섞지 않습니다. 출처 URL과 날짜는 필수, 생성된 URL은 유효성 검증을 거쳐 저장합니다."
            tags={["의견 배제", "출처 URL/날짜 필수", "URL 유효성 검증"]}
          />
          <AgentCard
            symbol="◇"
            name="Fit Judge Agent"
            role="큐레이터"
            desc="추천할 때 Self Map의 특정 엔트리 ID를 근거로 인용합니다. 점수는 오직 당신만 매깁니다."
            tags={["엔트리 ID 인용", "점수는 사용자가", "근거 기반 추천"]}
          />
          <AgentCard
            symbol="✦"
            name="Validation Designer Agent"
            role="가설 axis별 검증 처방자"
            badge="CORE"
            desc="존재·심각도·핏·지불 의사 각 가설에 대해 추천 메서드와 성공·실패 시그널만 산출. 솔루션 가설 자체는 만들지 않습니다."
            tags={["문제 단위(존재+심각도) 한 호출", "솔루션 단위(핏+지불의사) 한 호출", "성공/실패 시그널 명시"]}
          />
          <AgentCard
            symbol="◐"
            name="Solution Suggester Agent"
            role="솔루션 가설 후보 생성기"
            desc='막막할 때 "후보 받기"로 호출. 서로 다른 각도의 statement 3개를 제안하고, 당신이 골라 편집해 저장해야 등록됩니다 (자기결정 원칙).'
            tags={["후보 3개 제안", "사용자 편집 후 저장", "자기결정 준수"]}
          />
          <AgentCard
            symbol="◬"
            name="Reality Check Panel"
            role="패널 + 중재 구조"
            badge="CORE"
            desc="활성 솔루션 단위로 호출되는 4인 패널. 절대 하나의 agent로 병합되지 않는 의도적 설계입니다."
            tags={[]}
            extra={
              <div className="mt-3 space-y-1.5 text-xs text-white/60">
                <p>
                  <span className="text-white/80 font-medium">냉정한 투자자</span> — 숫자·시장 규모·재무 현실성. 감정 배제.
                </p>
                <p>
                  <span className="text-white/80 font-medium">솔직한 친구</span> — 동기·에너지·삶의 맥락. 공감하되 달래지 않는다.
                </p>
                <p>
                  <span className="text-white/80 font-medium">소크라테스식 질문자</span> — 단정 금지. 질문만.
                </p>
                <p>
                  <span className="text-white/80 font-medium">중재자</span> — 세 목소리의 긴장을 드러낸다. 수렴시키지 않는다.
                </p>
                <p className="pt-2 text-white/40 italic">
                  공통 규칙 — 세 관점은 서로의 출력을 참조하지 않습니다. Moderator만 참조 가능. 비판 시 반드시 반증 질문 또는 다음 액션을 함께 제시합니다.
                </p>
              </div>
            }
          />
        </div>
      </section>

      {/* Real Moat */}
      <section
        data-track-section="moat"
        className="px-6 py-20 md:py-24 max-w-4xl mx-auto"
      >
        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-700/5 p-8 md:p-12">
          <p className="text-xs md:text-sm font-semibold tracking-[0.3em] text-amber-400 mb-5">REAL MOAT</p>
          <h2 className="text-2xl md:text-4xl font-bold mb-6 leading-tight">
            이 시스템의 진짜 해자는
            <br />
            <span className="text-amber-300">누적되는 컨텍스트의 깊이</span>입니다
          </h2>
          <p className="text-base md:text-lg text-white/75 leading-relaxed mb-10">
            Self Map에 쌓이는 본인의 강점·혐오·네트워크, Problem Universe에서 본 시장 케이스, 그동안 깨본 가설과 그 결과 — 이 모든 것이 누적될수록, 같은{" "}
            <span className="text-white font-semibold">&ldquo;이 가설 약한 것 같은데요&rdquo;</span>라는 한마디도 백지에서 나온 것과는{" "}
            <span className="text-white font-semibold">정확도와 설득력이 완전히 달라집니다</span>.
          </p>

          <div className="flex justify-between text-[11px] md:text-xs text-white/45 mb-3">
            <span>얕은 컨텍스트</span>
            <span>→ 깊은 컨텍스트</span>
          </div>
          <div className="space-y-4 mb-10">
            <MoatRow prefix="누적되는" title="Self Context" desc="강점·혐오·네트워크·과거 몰입 경험" fill={65} />
            <MoatRow prefix="살아있는" title="Market Cases" desc="Seed 스타트업이 지금 풀고 있는 문제" fill={75} />
            <MoatRow prefix="검증된 / 깨진" title="Hypotheses" desc="내 손으로 직접 굴려본 실험과 결과" fill={88} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-center">
              <p className="text-xs md:text-sm text-white/45 mb-1">백지 LLM</p>
              <p className="text-sm md:text-base font-semibold text-white/65">매번 처음부터</p>
            </div>
            <div className="rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/25 to-orange-600/15 px-4 py-3.5 text-center">
              <p className="text-xs md:text-sm tracking-[0.2em] text-amber-300 mb-1">MY 0TO1</p>
              <p className="text-sm md:text-base font-semibold text-amber-100">매번 더 또렷하게</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        data-track-section="final_cta"
        className="px-6 py-24 md:py-28 max-w-4xl mx-auto text-center"
      >
        <p className="text-amber-400 text-3xl mb-4">◐</p>
        <h2 className="text-3xl md:text-5xl font-bold mb-5 leading-tight">
          꼭 맞는 문제와 고객을 찾고,
          <br />
          빠른 검증으로 확신을 쌓으세요
        </h2>
        <p className="text-base md:text-lg text-white/65 mb-2">
          시장이 돈을 낼 만한 고통을 발견할 때까지.
        </p>
        <p className="text-base md:text-lg text-white/65 mb-10">
          첫 시즌 비공개 베타에 함께할 창업자를 모십니다.
        </p>
        <EmailSignupForm id="email-bottom" location="bottom" />
        <p className="mt-4 text-xs text-white/40">
          초기 베타 슬롯은 한정되어 있어요. 스팸은 보내지 않아요.
        </p>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/5 text-center text-xs text-white/30">
        <p>© 2026 My 0to1 · 1인 창업자를 위한 비즈니스 0to1 운영체제</p>
      </footer>
    </div>
  );
}

function TrapCard({
  num,
  title,
  desc,
  bait,
  outcome,
}: {
  num: string;
  title: string;
  desc: string;
  bait: string;
  outcome: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] pt-9 pb-7 px-6 md:px-8">
      {/* Hazard tape */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-3"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #f59e0b 0px, #f59e0b 12px, #1f2937 12px, #1f2937 24px)",
        }}
      />
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/20 text-amber-400 text-base font-bold">
            !
          </span>
          <p className="text-sm md:text-base font-bold tracking-wider text-amber-400">
            TRAP {num}
          </p>
        </div>
        <span className="text-[10px] md:text-xs text-white/40 border border-white/15 rounded-md px-2 py-0.5 tracking-[0.2em]">
          PITFALL
        </span>
      </div>

      <p className="text-lg md:text-2xl font-bold mb-4 leading-snug">{title}</p>
      <p className="text-base text-white/65 leading-relaxed mb-7">{desc}</p>

      <div className="border-t border-dashed border-white/10 pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/80">
            {bait}
          </span>
          <span className="text-amber-400/70 text-base">↓</span>
          <span className="inline-flex items-center rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-200">
            {outcome}
          </span>
        </div>
        <div className="mt-3 flex justify-between text-[11px] text-white/35 tracking-wide">
          <span>미끼</span>
          <span>→ 빠진다</span>
          <span>결과</span>
        </div>
      </div>
    </div>
  );
}

function AgentCard({
  symbol,
  name,
  role,
  badge,
  desc,
  tags,
  extra,
}: {
  symbol: string;
  name: string;
  role: string;
  badge?: string;
  desc: string;
  tags: string[];
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-7">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center size-10 rounded-lg bg-amber-500/20 text-xl text-amber-300">
            {symbol}
          </span>
          <div>
            <p className="text-base md:text-lg font-bold text-white leading-tight">{name}</p>
            <p className="text-xs md:text-sm text-amber-400 mt-0.5">{role}</p>
          </div>
        </div>
        {badge && (
          <span className="shrink-0 text-[10px] md:text-xs text-amber-200 bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-400/40 rounded-md px-2 py-0.5 font-semibold tracking-wider">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm md:text-base text-white/65 leading-relaxed mb-4">{desc}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-white/55 bg-white/5 border border-white/10 rounded-md px-2.5 py-1"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {extra}
    </div>
  );
}

function MoatRow({
  prefix,
  title,
  desc,
  fill,
}: {
  prefix: string;
  title: string;
  desc: string;
  fill: number;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-center md:grid-cols-[140px_minmax(0,1fr)_auto]">
      <div className="text-xs md:text-sm text-white/55 whitespace-nowrap">
        <span className="text-white/40">{prefix}</span>{" "}
        <span className="font-semibold text-amber-200">{title}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden md:order-none order-3 col-span-2 md:col-span-1">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
          style={{ width: `${fill}%` }}
        />
      </div>
      <p className="text-xs md:text-sm text-white/55 md:text-right md:whitespace-nowrap">
        {desc}
      </p>
    </div>
  );
}
