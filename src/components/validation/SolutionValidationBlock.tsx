"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  Scale,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { AxisWorkspace, type AxisWorkspaceData } from "@/components/validation/AxisWorkspace";
import { OnePagerSection, type OnePagerData } from "@/components/validation/OnePagerSection";
import {
  SOLUTION_STATUS_LABELS,
  SOLUTION_STATUS_VARIANTS,
  type HypothesisStatus,
  type SolutionStatus,
} from "@/lib/validation-labels";
import {
  coldInvestorOutputSchema,
  honestFriendOutputSchema,
  socraticQOutputSchema,
  moderatorOutputSchema,
  type ColdInvestorOutput,
  type HonestFriendOutput,
  type SocraticQOutput,
  type ModeratorOutput,
} from "@/lib/agents/reality-check/schema";
import { track } from "@/lib/posthog/events";

// Hypothesis row enriched with updatedAt so we can pick the most-recently-
// edited tool as the default tab. Optional because the field flows through
// the API as a string but isn't part of AxisWorkspaceData proper.
type AxisData = AxisWorkspaceData & { updatedAt?: string };

export type SolutionBlockData = {
  id: string;
  statement: string;
  source: string;
  status: string;
  fit: AxisData | null;
  willingness: AxisData | null;
  realityCheck: {
    id: string;
    coldInvestor: string;
    honestFriend: string;
    socraticQ: string;
    moderatorSummary: string;
    createdAt: string;
  } | null;
  onePager: OnePagerData | null;
};

type TabKey = "fit" | "willingness" | "onepager" | "reality";

const TAB_LABELS: Record<TabKey, string> = {
  fit: "핏 검증",
  willingness: "지불 검증",
  onepager: "1-pager",
  reality: "패널 검토",
};

const HYP_STATUS_KO: Record<HypothesisStatus, string> = {
  not_started: "시작 전",
  in_progress: "진행 중",
  broken: "깨짐",
  confirmed: "확인됨",
};

// Tab dot color reflects the underlying tool's status. The dot is the
// status indicator — there is no separate status row above the tabs.
function tabDotClass(tab: TabKey, solution: SolutionBlockData): string {
  if (tab === "fit" || tab === "willingness") {
    const s = (tab === "fit" ? solution.fit?.status : solution.willingness?.status) ?? "not_started";
    if (s === "confirmed") return "bg-green-500";
    if (s === "broken") return "bg-red-500";
    if (s === "in_progress") return "bg-amber-500";
    return "bg-canvas border border-border-strong";
  }
  if (tab === "onepager") {
    return solution.onePager ? "bg-violet-500" : "bg-canvas border border-border-strong";
  }
  return solution.realityCheck ? "bg-blue-500" : "bg-canvas border border-border-strong";
}

function tabAriaLabel(tab: TabKey, solution: SolutionBlockData): string {
  const label = TAB_LABELS[tab];
  if (tab === "fit" || tab === "willingness") {
    const s = ((tab === "fit" ? solution.fit?.status : solution.willingness?.status) ??
      "not_started") as HypothesisStatus;
    return `${label}: ${HYP_STATUS_KO[s]}`;
  }
  if (tab === "onepager") return `1-pager: ${solution.onePager ? "초안 있음" : "미생성"}`;
  return `패널 검토: ${solution.realityCheck ? "결과 있음" : "미실행"}`;
}

// Default tab heuristic: pick whichever tool was most recently touched
// (status PATCH, findings save, 1-pager edit/draft, RC run). Falls back to
// "fit" when nothing has activity yet. Evaluated once on mount via lazy
// init; later state updates don't reset the chosen tab.
function defaultTab(solution: SolutionBlockData): TabKey {
  const entries: { key: TabKey; ts: number }[] = [];
  if (solution.fit?.updatedAt) entries.push({ key: "fit", ts: Date.parse(solution.fit.updatedAt) });
  if (solution.willingness?.updatedAt)
    entries.push({ key: "willingness", ts: Date.parse(solution.willingness.updatedAt) });
  if (solution.onePager) {
    const ts = solution.onePager.lastEditedAt ?? solution.onePager.draftGeneratedAt;
    if (ts) entries.push({ key: "onepager", ts: Date.parse(ts) });
  }
  if (solution.realityCheck)
    entries.push({ key: "reality", ts: Date.parse(solution.realityCheck.createdAt) });
  entries.sort((a, b) => b.ts - a.ts);
  return entries[0]?.key ?? "fit";
}

export function SolutionValidationBlock({
  solution,
  defaultExpanded = true,
  onChanged,
}: {
  solution: SolutionBlockData;
  defaultExpanded?: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<TabKey>(() => defaultTab(solution));
  const [pendingStatus, setPendingStatus] = useState<SolutionStatus | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);

  async function setStatus(next: SolutionStatus) {
    setPendingStatus(next);
    await fetch(`/api/solution-hypotheses/${solution.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await onChanged();
    setPendingStatus(null);
  }

  const status = solution.status as SolutionStatus;
  const isAi = solution.source === "ai_suggested";
  const tabKeys = Object.keys(TAB_LABELS) as TabKey[];

  // Header action varies by current status. broken/confirmed are normally
  // auto-derived from child Hypothesis status (see recomputeSolutionStatus),
  // but a manual "활성화로 원복" escape hatch is exposed for human-error
  // recovery — re-running cascade only happens when a child status changes,
  // so this revert sticks until the user actually edits a child.
  const action: { label: string; target: SolutionStatus; title: string } | null =
    status === "active"
      ? { label: "보류", target: "shelved", title: "이 솔루션을 보류" }
      : status === "shelved"
        ? { label: "활성화", target: "active", title: "이 솔루션을 다시 활성화" }
        : { label: "활성화로 원복", target: "active", title: "상태를 활성으로 되돌립니다 (자식 가설 상태 유지)" };

  // Card styling shifts with status so cards visually separate against
  // the section background. Active = violet accent on white surface
  // (the user's current focus). Inactive = neutral border + slightly
  // muted surface so they recede in the inactive section's wash backdrop.
  const cardClass =
    status === "active"
      ? "rounded-2xl border border-violet-300 bg-surface shadow-sm overflow-hidden"
      : "rounded-2xl border border-border bg-surface/80 overflow-hidden";

  return (
    <div className={cardClass}>
      {/* Header — uses a hidden full-width toggle button as the click
          target so nested interactive controls (action button) remain
          legal HTML. The toggle is layered under the visual content. */}
      <div className="relative p-4 md:p-5 hover:bg-wash transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "솔루션 접기" : "솔루션 펼치기"}
          className="absolute inset-0 w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-2xl"
        />
        <div className="relative pointer-events-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge variant={SOLUTION_STATUS_VARIANTS[status]}>{SOLUTION_STATUS_LABELS[status]}</Badge>
                {isAi && (
                  <span className="inline-flex items-center gap-1 text-xs text-tertiary">
                    <Sparkles size={10} /> 에이전트 후보
                  </span>
                )}
              </div>
              <p className="text-sm text-body whitespace-pre-wrap">{solution.statement}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
              <button
                type="button"
                onClick={() => setStatus(action.target)}
                disabled={pendingStatus !== null}
                className="text-xs rounded-lg border border-border bg-canvas hover:bg-wash px-2.5 py-1 text-tertiary disabled:opacity-40"
                title={action.title}
              >
                {pendingStatus !== null ? <Loader2 size={12} className="animate-spin" /> : action.label}
              </button>
              <span aria-hidden className="text-tertiary">
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </div>
          </div>

          {status === "broken" && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 mt-3">
              <AlertTriangle size={12} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">
                검증으로 깨짐 — 새 솔루션 가설을 시도하거나 자식 가설을 수정해 다시 검증하세요
              </p>
            </div>
          )}

          {status === "confirmed" && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 mt-3">
              <CheckCircle2 size={12} className="text-green-600 mt-0.5 shrink-0" />
              <p className="text-xs text-green-700">
                핏·지불 의사 모두 확인됨 — 필요 시 자식 가설을 수정하면 상태가 자동 재계산됩니다
              </p>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <>
      {/* 4-tab segmented control. Tab dot = tool status. grid-cols-4 keeps
          equal width on every viewport (375px+) without overflow risk. */}
      <div className="border-t border-border bg-wash/60">
        <div
          role="tablist"
          aria-label="솔루션 도구"
          className="grid grid-cols-4"
        >
          {tabKeys.map((k) => {
            const active = tab === k;
            return (
              <button
                key={k}
                role="tab"
                aria-selected={active}
                aria-label={tabAriaLabel(k, solution)}
                onClick={() => setTab(k)}
                className={`flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-medium border-b-2 transition-colors min-h-[44px] ${
                  active
                    ? "border-violet-600 text-violet-700 bg-surface"
                    : "border-transparent text-tertiary hover:text-secondary"
                }`}
              >
                <span
                  aria-hidden
                  className={`inline-block w-2 h-2 rounded-full shrink-0 ${tabDotClass(k, solution)}`}
                />
                <span className="truncate">{TAB_LABELS[k]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tab content */}
      <div className="bg-surface p-4 md:p-5">
        {tab === "fit" && (
          <AxisWorkspace
            hypothesis={solution.fit}
            onUpdated={onChanged}
            loadingPlaceholder="처방 생성 중..."
            hideAxisHeader
          />
        )}
        {tab === "willingness" && (
          <AxisWorkspace
            hypothesis={solution.willingness}
            onUpdated={onChanged}
            loadingPlaceholder="처방 생성 중..."
            hideAxisHeader
          />
        )}
        {tab === "onepager" && (
          <OnePagerSection
            solutionHypothesisId={solution.id}
            triggerMet={solution.status === "active"}
            onePager={solution.onePager}
            onChanged={onChanged}
          />
        )}
        {tab === "reality" && (
          <RealityCheckSection solution={solution} onChanged={onChanged} />
        )}
      </div>
        </>
      )}
    </div>
  );
}

// Slots are JSON-stringified server-side (post-2026-05-07). Older rows still
// hold free-text — we try-parse and fall back to raw markdown rendering so
// nothing breaks on legacy data. Once all rows are migrated, the fallback is
// dead code that can be deleted.
function tryParseSlot<T>(raw: string, schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }):
  | { kind: "structured"; data: T }
  | { kind: "legacy"; raw: string } {
  try {
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (result.success && result.data !== undefined) {
      return { kind: "structured", data: result.data };
    }
  } catch {
    // fall through
  }
  return { kind: "legacy", raw };
}

type FeedbackSlot = "investor" | "friend" | "socratic" | "moderator";

function RealityCheckSection({
  solution,
  onChanged,
}: {
  solution: SolutionBlockData;
  onChanged: () => void | Promise<void>;
}) {
  const [running, setRunning] = useState(false);
  const [showPersonas, setShowPersonas] = useState(false);

  async function runRealityCheck() {
    setRunning(true);
    await fetch("/api/reality-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solutionHypothesisId: solution.id }),
    });
    await onChanged();
    setRunning(false);
  }

  const rc = solution.realityCheck;
  // Reality Check prompts critique the 1-pager. The server keeps a fallback
  // path for null onePager (degraded persona context), but gating here
  // signals intent — run after the 1-pager exists, not before.
  const onePagerReady = solution.onePager !== null;

  return (
    <div>
      {/* Action row — short description + run button. Wraps on narrow widths. */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <p className="text-xs text-muted flex-1 min-w-[12rem]">
          냉정한 투자자·솔직한 친구·소크라테스 3 페르소나가 1-pager를 비판적으로 검토하고
          모더레이터가 종합합니다.
        </p>
        <button
          onClick={runRealityCheck}
          disabled={running || !onePagerReady}
          className="flex items-center gap-1.5 text-xs rounded-lg border border-border bg-canvas hover:bg-wash px-2.5 py-1.5 text-tertiary disabled:opacity-40 shrink-0"
          title={!onePagerReady ? "1-pager 초안을 먼저 생성해주세요" : undefined}
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          {rc ? "재실행" : "실행"}
        </button>
      </div>

      {!onePagerReady ? (
        <p className="text-xs text-subtle">
          1-pager 초안을 먼저 생성해주세요. 패널 검토는 1-pager 내용을 비판적으로 읽습니다.
        </p>
      ) : !rc ? (
        <p className="text-xs text-subtle">아직 실행된 패널 검토가 없습니다.</p>
      ) : (
        <RealityCheckResults
          rc={rc}
          showPersonas={showPersonas}
          onTogglePersonas={() => setShowPersonas((v) => !v)}
        />
      )}
    </div>
  );
}

function RealityCheckResults({
  rc,
  showPersonas,
  onTogglePersonas,
}: {
  rc: NonNullable<SolutionBlockData["realityCheck"]>;
  showPersonas: boolean;
  onTogglePersonas: () => void;
}) {
  const moderator = tryParseSlot<ModeratorOutput>(rc.moderatorSummary, moderatorOutputSchema);
  const investor = tryParseSlot<ColdInvestorOutput>(rc.coldInvestor, coldInvestorOutputSchema);
  const friend = tryParseSlot<HonestFriendOutput>(rc.honestFriend, honestFriendOutputSchema);
  const socratic = tryParseSlot<SocraticQOutput>(rc.socraticQ, socraticQOutputSchema);

  return (
    <div className="space-y-3">
      {/* Moderator first — always visible */}
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
        <div className="flex items-center gap-1 mb-2 text-violet-600">
          <Scale size={12} />
          <p className="text-xs font-medium">중재자 종합</p>
        </div>
        {moderator.kind === "structured" ? (
          <ModeratorView data={moderator.data} />
        ) : (
          <Markdown content={moderator.raw} className="text-body" />
        )}
        <FeedbackWidget rcId={rc.id} slot="moderator" mode="stars" />
      </div>

      {/* Personas — toggleable */}
      <button
        onClick={onTogglePersonas}
        className="flex items-center gap-1 text-xs text-tertiary hover:text-secondary"
      >
        {showPersonas ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        페르소나 3개 의견 {showPersonas ? "접기" : "펼치기"}
      </button>

      {showPersonas && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PersonaCard
            icon={Zap}
            label="냉정한 투자자"
            color="text-red-600"
            slot="investor"
            rcId={rc.id}
          >
            {investor.kind === "structured" ? (
              <InvestorView data={investor.data} />
            ) : (
              <Markdown content={investor.raw} className="text-secondary" />
            )}
          </PersonaCard>

          <PersonaCard
            icon={AlertTriangle}
            label="솔직한 친구"
            color="text-amber-600"
            slot="friend"
            rcId={rc.id}
          >
            {friend.kind === "structured" ? (
              <FriendView data={friend.data} />
            ) : (
              <Markdown content={friend.raw} className="text-secondary" />
            )}
          </PersonaCard>

          <PersonaCard
            icon={HelpCircle}
            label="소크라테스"
            color="text-blue-600"
            slot="socratic"
            rcId={rc.id}
          >
            {socratic.kind === "structured" ? (
              <SocraticView data={socratic.data} />
            ) : (
              <Markdown content={socratic.raw} className="text-secondary" />
            )}
          </PersonaCard>
        </div>
      )}
    </div>
  );
}

function PersonaCard({
  icon: Icon,
  label,
  color,
  slot,
  rcId,
  children,
}: {
  icon: typeof Zap;
  label: string;
  color: string;
  slot: FeedbackSlot;
  rcId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-canvas border border-border rounded-lg p-3">
      <div className={`flex items-center gap-1 mb-2 ${color}`}>
        <Icon size={12} />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <div className="text-secondary">{children}</div>
      <FeedbackWidget rcId={rcId} slot={slot} mode="thumbs" />
    </div>
  );
}

function ModeratorView({ data }: { data: ModeratorOutput }) {
  return (
    <div className="space-y-2 text-body text-sm">
      <div>
        <p className="text-xs font-medium text-violet-700 mb-1">남은 긴장</p>
        <ul className="list-disc pl-5 space-y-1">
          {data.remainingTensions.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium text-violet-700 mb-1">다음 액션</p>
        <ul className="list-disc pl-5 space-y-1">
          {data.topNextActions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InvestorView({ data }: { data: ColdInvestorOutput }) {
  return (
    <div className="space-y-2 text-sm">
      <div>
        <p className="text-[11px] font-medium text-red-700 mb-0.5">치명적 약점</p>
        <p>{data.topRisk}</p>
      </div>
      <div>
        <p className="text-[11px] font-medium text-red-700 mb-0.5">필요한 증거</p>
        <p>{data.evidenceGap}</p>
      </div>
      <div>
        <p className="text-[11px] font-medium text-red-700 mb-0.5">다음 액션</p>
        <p>{data.nextAction}</p>
      </div>
      <p className="text-[10px] text-tertiary">근거: {data.citedSource}</p>
    </div>
  );
}

function FriendView({ data }: { data: HonestFriendOutput }) {
  return (
    <div className="space-y-2 text-sm">
      <div>
        <p className="text-[11px] font-medium text-amber-700 mb-0.5">좋은 점</p>
        <p>{data.strength}</p>
      </div>
      <div>
        <p className="text-[11px] font-medium text-amber-700 mb-0.5">걱정되는 점</p>
        <ul className="space-y-1.5">
          {data.concerns.map((c, i) => (
            <li key={i}>
              <p>{c.point}</p>
              <p className="text-[11px] text-tertiary mt-0.5">→ {c.mitigation}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SocraticView({ data }: { data: SocraticQOutput }) {
  return (
    <div className="space-y-2 text-sm">
      <div>
        <p className="text-[11px] font-medium text-blue-700 mb-1">검증되지 않은 가정</p>
        <div className="flex flex-wrap gap-1">
          {data.unverifiedAssumptions.map((a, i) => (
            <span
              key={i}
              className="inline-block text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5"
            >
              {a}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-medium text-blue-700 mb-0.5">질문</p>
        <ol className="list-decimal pl-5 space-y-1">
          {data.questions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// Per-slot feedback widget: thumbs (-1/+1) for personas, 1..5 stars for the
// moderator. Submitting is one-shot; comment input is optional and shown
// only after a rating is set so the user isn't asked to write before
// expressing direction. Free-text comment goes to DB only — never PostHog.
function FeedbackWidget({
  rcId,
  slot,
  mode,
}: {
  rcId: string;
  slot: FeedbackSlot;
  mode: "thumbs" | "stars";
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  async function submit(finalRating: number, finalComment: string) {
    setSubmitting(true);
    const res = await fetch(`/api/reality-check/${rcId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slot,
        rating: finalRating,
        ...(finalComment.trim() ? { comment: finalComment.trim() } : {}),
      }),
    });
    setSubmitting(false);
    if (!res.ok) return;
    const body = (await res.json()) as { bucket: "positive" | "neutral" | "negative" };
    track({
      event: "reality_check_feedback_submitted",
      props: {
        slot,
        rating_bucket: body.bucket,
        has_comment: finalComment.trim().length > 0,
      },
    });
    setDone(true);
  }

  function pickRating(next: number) {
    setRating(next);
    setShowComment(true);
    void submit(next, comment);
  }

  async function saveComment() {
    if (rating === null || comment.trim().length === 0) {
      setShowComment(false);
      return;
    }
    await submit(rating, comment);
    setShowComment(false);
  }

  if (done && !showComment) {
    return <p className="mt-3 text-[10px] text-tertiary">피드백 감사합니다.</p>;
  }

  return (
    <div className="mt-3 pt-2 border-t border-border/60">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-tertiary">
          {mode === "stars" ? "이 종합이 의사결정에 도움됐나요?" : "이 의견이 도움됐나요?"}
        </span>
        {mode === "thumbs" ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => pickRating(1)}
              disabled={submitting || done}
              aria-label="도움됨"
              className={`p-1 rounded hover:bg-wash disabled:opacity-40 ${
                rating === 1 ? "text-green-600" : "text-tertiary"
              }`}
            >
              <ThumbsUp size={12} />
            </button>
            <button
              type="button"
              onClick={() => pickRating(-1)}
              disabled={submitting || done}
              aria-label="안 도움됨"
              className={`p-1 rounded hover:bg-wash disabled:opacity-40 ${
                rating === -1 ? "text-red-600" : "text-tertiary"
              }`}
            >
              <ThumbsDown size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = (hover ?? rating ?? 0) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => pickRating(n)}
                  onMouseEnter={() => setHover(n)}
                  disabled={submitting || done}
                  aria-label={`${n}점`}
                  className="p-0.5 rounded disabled:opacity-40"
                >
                  <Star
                    size={12}
                    className={filled ? "text-amber-500 fill-amber-500" : "text-tertiary"}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
      {showComment && (
        <div className="mt-2 flex items-start gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="어떤 점이 도움됐어요/약했어요? (선택)"
            rows={2}
            maxLength={1000}
            className="flex-1 text-[11px] rounded border border-border bg-canvas px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <button
            type="button"
            onClick={() => void saveComment()}
            disabled={submitting}
            className="text-[10px] rounded border border-border bg-canvas hover:bg-wash px-2 py-1 text-tertiary disabled:opacity-40 shrink-0"
          >
            저장
          </button>
        </div>
      )}
    </div>
  );
}
