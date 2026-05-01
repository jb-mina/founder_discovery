/**
 * One-shot cleanup script for ProblemCard.category.
 *
 * Run with:
 *   npx tsx scripts/normalize-categories.ts --dry-run
 *   npx tsx scripts/normalize-categories.ts
 *
 * Background: Before this script, ProblemCard.category was free text filled by
 * the Scout agent's LLM output, which produced ad-hoc labels like
 * "Mental Health / AI", "Ghost Kitchen", "Delivery Automation".
 * This script maps the observed dirty values to the curated enum in
 * src/lib/problem-categories.ts and falls back to "" for unmapped values
 * (those become candidates for manual reclassification).
 */
import { PrismaClient } from "@prisma/client";
import {
  PROBLEM_CATEGORIES,
  isProblemCategory,
  type ProblemCategory,
} from "../src/lib/problem-categories";

const prisma = new PrismaClient();

const CATEGORY_REMAP: Record<string, ProblemCategory | ""> = {
  // seed file English categories
  "Productivity": "생산성",
  "Fintech": "재무/핀테크",
  "Developer Tools": "개발자도구",
  "HR Tech": "채용/HR",
  "Education": "교육",
  "Creator Economy": "크리에이터 이코노미",
  "Healthcare": "건강/헬스케어",
  // observed Scout LLM output noise
  "Mental Health": "멘탈헬스",
  "Mental Health / HealthTech": "멘탈헬스",
  "Mental Health / AI": "멘탈헬스",
  "엔터테인먼트 소비자 경험": "엔터테인먼트",
  "엔터테인먼트 마케팅": "엔터테인먼트",
  "엔터테인먼트 프로덕션 툴": "콘텐츠 제작/편집",
  "Alternative Food": "식품/음식",
  "Ghost Kitchen": "식품/음식",
  "Delivery Automation": "AI/자동화",
};

type Reason = "already-enum" | "remapped" | "fallback-empty" | "no-change";
type RowChange = { id: string; title: string; before: string; after: string; reason: Reason };

function decide(current: string): { next: string; reason: Reason } {
  if (current === "") return { next: "", reason: "no-change" };
  if (isProblemCategory(current)) return { next: current, reason: "already-enum" };
  const remapped = CATEGORY_REMAP[current];
  if (remapped !== undefined) return { next: remapped, reason: "remapped" };
  return { next: "", reason: "fallback-empty" };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rows = await prisma.problemCard.findMany({
    select: { id: true, title: true, category: true },
  });

  const changes: RowChange[] = [];
  for (const row of rows) {
    const decision = decide(row.category);
    changes.push({
      id: row.id,
      title: row.title,
      before: row.category,
      after: decision.next,
      reason: row.category === decision.next ? (decision.reason === "already-enum" ? "already-enum" : "no-change") : decision.reason,
    });
  }

  const remapped = changes.filter((c) => c.reason === "remapped");
  const fallback = changes.filter((c) => c.reason === "fallback-empty");
  const alreadyEnum = changes.filter((c) => c.reason === "already-enum");
  const noop = changes.filter((c) => c.reason === "no-change");

  console.log(`\n=== ProblemCard category normalization ===`);
  console.log(`Total rows: ${rows.length}`);
  console.log(`  Already enum: ${alreadyEnum.length}`);
  console.log(`  Empty (no-change): ${noop.length}`);
  console.log(`  Remapped: ${remapped.length}`);
  console.log(`  Fallback to empty: ${fallback.length}`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "WRITE"}`);

  if (remapped.length > 0) {
    console.log(`\n[Remapped ${remapped.length}]`);
    for (const c of remapped) {
      console.log(`  ${c.id} | "${c.before}" -> "${c.after}" | ${c.title.slice(0, 50)}`);
    }
  }
  if (fallback.length > 0) {
    console.log(`\n[Fallback to empty ${fallback.length}] (manual reclassification needed)`);
    for (const c of fallback) {
      console.log(`  ${c.id} | "${c.before}" -> "" | ${c.title.slice(0, 50)}`);
    }
  }

  if (dryRun) {
    console.log(`\nDry run complete. Re-run without --dry-run to apply.`);
    return;
  }

  const toUpdate = changes.filter((c) => c.reason === "remapped" || c.reason === "fallback-empty");
  if (toUpdate.length === 0) {
    console.log(`\nNo updates needed.`);
    return;
  }

  console.log(`\nApplying ${toUpdate.length} updates...`);
  let applied = 0;
  for (const c of toUpdate) {
    await prisma.problemCard.update({
      where: { id: c.id },
      data: { category: c.after },
    });
    applied++;
  }
  console.log(`Done. Updated ${applied} rows.`);
  console.log(`\nEnum reference (${PROBLEM_CATEGORIES.length} values): ${PROBLEM_CATEGORIES.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
