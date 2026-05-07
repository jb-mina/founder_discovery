//
// Offline eval for the Reality Check panel. Runs each fixture N times,
// computes 3 proxy metrics for persona drift / diversity, and prints a
// before/after comparison table.
//
// Usage:
//   npx tsx scripts/eval-reality-check.ts            # default 3 runs/fixture
//   RC_RUNS=5 npx tsx scripts/eval-reality-check.ts  # override runs
//
// Requires ANTHROPIC_API_KEY in env. Hits real Anthropic API — costs tokens.
// "After" only — to measure "before vs after" you need to run this once on
// the previous commit (git stash / checkout) and once on the current commit
// and compare the two summaries by hand. The script prints the metrics in a
// stable format so diff'ing the outputs is easy.

import { FIXTURES, type RealityCheckFixture } from "../src/lib/agents/reality-check/__fixtures__";
import { runRealityCheck } from "../src/lib/agents/reality-check/run";
import type {
  ColdInvestorOutput,
  HonestFriendOutput,
  ModeratorOutput,
  SocraticQOutput,
} from "../src/lib/agents/reality-check/schema";

const RUNS_PER_FIXTURE = Number(process.env.RC_RUNS ?? 3);

// Drift keywords — words a persona should NOT use because they belong to
// another role. Intentionally narrow so false positives stay low.
const INVESTOR_DRIFT = ["응원", "파이팅", "힘내", "감정", "동료가", "외로움"];
const FRIEND_DRIFT = ["MOIC", "ARR", "TAM", "시장 규모", "CAC", "LTV", "유니콘"];
// Socratic must end every question with "?" — sentences ending with "다." or
// "습니다." (assertions) count as drift.
const SOCRATIC_DRIFT_REGEX = /(?:\.|다\.|습니다\.)\s*$/;

function tokenize(text: string): Set<string> {
  // Coarse Korean+English noun-ish tokenization — strip punctuation, drop
  // tokens shorter than 2 chars, lowercase ASCII. Good enough for Jaccard
  // overlap; the metric tracks relative change, not absolute precision.
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function investorText(o: ColdInvestorOutput): string {
  return `${o.topRisk} ${o.evidenceGap} ${o.nextAction}`;
}

function friendText(o: HonestFriendOutput): string {
  return `${o.strength} ${o.concerns.map((c) => `${c.point} ${c.mitigation}`).join(" ")}`;
}

function socraticText(o: SocraticQOutput): string {
  return `${o.unverifiedAssumptions.join(" ")} ${o.questions.join(" ")}`;
}

function countMatches(text: string, terms: string[]): number {
  let n = 0;
  for (const t of terms) {
    const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    n += (text.match(re) ?? []).length;
  }
  return n;
}

function socraticAssertionDrift(o: SocraticQOutput): number {
  // Each question that doesn't end with "?" or that matches an assertion
  // ending counts as one drift instance.
  let n = 0;
  for (const q of o.questions) {
    const trimmed = q.trim();
    if (!trimmed.endsWith("?")) n++;
    else if (SOCRATIC_DRIFT_REGEX.test(trimmed.slice(0, -1))) n++;
  }
  return n;
}

type RunMetrics = {
  jaccardIF: number; // investor vs friend
  jaccardIS: number; // investor vs socratic
  jaccardFS: number; // friend vs socratic
  investorDrift: number;
  friendDrift: number;
  socraticDrift: number;
  moderatorTensions: number;
};

function metricsFor(rc: {
  coldInvestor: ColdInvestorOutput;
  honestFriend: HonestFriendOutput;
  socraticQ: SocraticQOutput;
  moderatorSummary: ModeratorOutput;
}): RunMetrics {
  const iText = investorText(rc.coldInvestor);
  const fText = friendText(rc.honestFriend);
  const sText = socraticText(rc.socraticQ);
  const iSet = tokenize(iText);
  const fSet = tokenize(fText);
  const sSet = tokenize(sText);

  return {
    jaccardIF: jaccard(iSet, fSet),
    jaccardIS: jaccard(iSet, sSet),
    jaccardFS: jaccard(fSet, sSet),
    investorDrift: countMatches(iText, INVESTOR_DRIFT),
    friendDrift: countMatches(fText, FRIEND_DRIFT),
    socraticDrift: socraticAssertionDrift(rc.socraticQ),
    moderatorTensions: rc.moderatorSummary.remainingTensions.length,
  };
}

function avg(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

async function evalFixture(fx: RealityCheckFixture): Promise<RunMetrics[]> {
  const results: RunMetrics[] = [];
  for (let i = 0; i < RUNS_PER_FIXTURE; i++) {
    process.stderr.write(`  ${fx.name} run ${i + 1}/${RUNS_PER_FIXTURE}... `);
    try {
      const rc = await runRealityCheck({
        card: fx.card,
        solution: fx.solution,
        hypotheses: fx.hypotheses,
        onePager: fx.onePager,
      });
      results.push(metricsFor(rc));
      process.stderr.write("ok\n");
    } catch (e) {
      process.stderr.write(`FAIL: ${e instanceof Error ? e.message : String(e)}\n`);
    }
  }
  return results;
}

async function main() {
  console.log(`# Reality Check eval — ${RUNS_PER_FIXTURE} runs/fixture, ${FIXTURES.length} fixtures\n`);

  const allRuns: RunMetrics[] = [];
  for (const fx of FIXTURES) {
    console.log(`## ${fx.name}`);
    const runs = await evalFixture(fx);
    allRuns.push(...runs);
    if (runs.length === 0) {
      console.log("  (all runs failed)\n");
      continue;
    }
    console.log(`  jaccard I-F: ${avg(runs.map((r) => r.jaccardIF)).toFixed(3)}`);
    console.log(`  jaccard I-S: ${avg(runs.map((r) => r.jaccardIS)).toFixed(3)}`);
    console.log(`  jaccard F-S: ${avg(runs.map((r) => r.jaccardFS)).toFixed(3)}`);
    console.log(`  investor drift: ${avg(runs.map((r) => r.investorDrift)).toFixed(2)}`);
    console.log(`  friend drift:   ${avg(runs.map((r) => r.friendDrift)).toFixed(2)}`);
    console.log(`  socratic drift: ${avg(runs.map((r) => r.socraticDrift)).toFixed(2)}`);
    console.log(`  moderator tensions (avg len): ${avg(runs.map((r) => r.moderatorTensions)).toFixed(2)}`);
    console.log();
  }

  if (allRuns.length === 0) {
    console.log("# Summary\n  no successful runs.");
    process.exit(1);
  }

  const overallJaccard =
    avg(allRuns.map((r) => (r.jaccardIF + r.jaccardIS + r.jaccardFS) / 3));
  const overallDrift = avg(
    allRuns.map((r) => r.investorDrift + r.friendDrift + r.socraticDrift),
  );
  const overallTensions = avg(allRuns.map((r) => r.moderatorTensions));

  console.log(`# Overall (${allRuns.length} runs)`);
  console.log(`  avg pairwise Jaccard: ${overallJaccard.toFixed(3)}`);
  console.log(`  avg drift count:      ${overallDrift.toFixed(2)}`);
  console.log(`  avg moderator tensions: ${overallTensions.toFixed(2)}`);
  console.log();
  console.log("# Pass criteria (vs prior commit baseline):");
  console.log("  - pairwise Jaccard ↓ ≥30%");
  console.log("  - drift count ↓ ≥50%");
  console.log("  - moderator tensions avg ≥ 1.0  →", overallTensions >= 1.0 ? "PASS" : "FAIL");
}

void main();
