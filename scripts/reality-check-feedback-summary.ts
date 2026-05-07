//
// Pulls RealityCheckFeedback rows and prints a summary for B-trigger
// inspection. Slot-level thumbs up/down rate (personas), moderator star
// distribution, recent vs prior 7-day delta, and a few sample comments.
//
// Usage:
//   npx tsx scripts/reality-check-feedback-summary.ts
//
// No args. Reads DATABASE_URL from env via Prisma.

import { prisma } from "../src/lib/prisma";

type SlotKey = "investor" | "friend" | "socratic" | "moderator";
const PERSONA_SLOTS: SlotKey[] = ["investor", "friend", "socratic"];

function pct(n: number, d: number): string {
  if (d === 0) return "n/a";
  return `${((n / d) * 100).toFixed(1)}%`;
}

async function main() {
  const all = await prisma.realityCheckFeedback.findMany({
    orderBy: { createdAt: "desc" },
  });

  if (all.length === 0) {
    console.log("# RealityCheckFeedback summary\n  no feedback rows yet.");
    return;
  }

  const now = Date.now();
  const SEVEN_D = 7 * 24 * 60 * 60 * 1000;
  const recent = all.filter((r) => now - r.createdAt.getTime() <= SEVEN_D);
  const prior = all.filter((r) => {
    const age = now - r.createdAt.getTime();
    return age > SEVEN_D && age <= 2 * SEVEN_D;
  });

  console.log(`# RealityCheckFeedback summary (total ${all.length})\n`);

  console.log("## Persona thumbs (lifetime)");
  for (const slot of PERSONA_SLOTS) {
    const rows = all.filter((r) => r.slot === slot);
    const ups = rows.filter((r) => r.rating === 1).length;
    const downs = rows.filter((r) => r.rating === -1).length;
    const total = ups + downs;
    const downRate = total === 0 ? 0 : downs / total;
    const flag = downRate >= 0.3 && total >= 5 ? "  ← B trigger" : "";
    console.log(
      `  ${slot.padEnd(10)} up=${ups}, down=${downs}, total=${total}, down rate=${pct(downs, total)}${flag}`,
    );
  }

  console.log("\n## Moderator stars (lifetime)");
  const moderator = all.filter((r) => r.slot === "moderator");
  if (moderator.length === 0) {
    console.log("  (none)");
  } else {
    const dist = [1, 2, 3, 4, 5].map((star) => moderator.filter((r) => r.rating === star).length);
    const avg = moderator.reduce((s, r) => s + r.rating, 0) / moderator.length;
    console.log(`  count=${moderator.length}, avg=${avg.toFixed(2)}/5`);
    console.log(`  distribution 1..5: ${dist.join(" / ")}`);
    if (avg < 3.0 && moderator.length >= 5) console.log("  ← B trigger");
  }

  console.log(`\n## Recent 7d vs prior 7d (${recent.length} vs ${prior.length})`);
  for (const slot of PERSONA_SLOTS) {
    const r = recent.filter((x) => x.slot === slot);
    const p = prior.filter((x) => x.slot === slot);
    const rDown = pct(r.filter((x) => x.rating === -1).length, r.length);
    const pDown = pct(p.filter((x) => x.rating === -1).length, p.length);
    console.log(`  ${slot.padEnd(10)} recent down=${rDown} (n=${r.length}), prior down=${pDown} (n=${p.length})`);
  }

  console.log("\n## Recent comments (latest 5)");
  const withComments = all.filter((r) => r.comment && r.comment.trim().length > 0).slice(0, 5);
  if (withComments.length === 0) {
    console.log("  (no comments yet)");
  } else {
    for (const r of withComments) {
      const ago = Math.floor((now - r.createdAt.getTime()) / (60 * 60 * 1000));
      console.log(`  [${r.slot}, rating=${r.rating}, ${ago}h ago] ${r.comment}`);
    }
  }

  // Final B trigger check
  const triggers: string[] = [];
  for (const slot of PERSONA_SLOTS) {
    const rows = all.filter((r) => r.slot === slot);
    const ups = rows.filter((r) => r.rating === 1).length;
    const downs = rows.filter((r) => r.rating === -1).length;
    const total = ups + downs;
    if (total >= 5 && downs / total >= 0.3) triggers.push(`${slot} thumbs-down ${pct(downs, total)}`);
  }
  if (moderator.length >= 5) {
    const avg = moderator.reduce((s, r) => s + r.rating, 0) / moderator.length;
    if (avg < 3.0) triggers.push(`moderator avg ${avg.toFixed(2)}/5`);
  }

  console.log("\n# B (vendor diversification) trigger:", triggers.length === 0 ? "no" : "YES");
  for (const t of triggers) console.log(`  - ${t}`);
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
