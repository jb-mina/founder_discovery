import { prisma } from "@/lib/prisma";
import type { OnePager } from "@prisma/client";

// 10 editable sections. Keep in sync with prisma/schema.prisma OnePager model
// and src/lib/agents/one-pager-composer/schema.ts (Phase 2).
export const ONE_PAGER_SECTIONS = [
  "oneLineSummary",
  "targetCustomer",
  "problem",
  "solution",
  "mvpScope",
  "mvpCostEstimate",
  "operatingModel",
  "monetization",
  "topRisks",
  "validationActions30d",
] as const;

export type OnePagerSection = (typeof ONE_PAGER_SECTIONS)[number];

export type OnePagerSectionUpdate = Partial<Record<OnePagerSection, string>>;

export async function getOnePagerBySolution(
  solutionHypothesisId: string,
): Promise<OnePager | null> {
  return prisma.onePager.findUnique({
    where: { solutionHypothesisId },
  });
}

// Upsert one or more sections from user edits. Sets lastEditedAt; does NOT
// touch draftGeneratedAt (that field is owned by Phase 2 draft generation).
// First edit on a solution that has no 1-pager yet creates the row with
// only the provided sections filled.
export async function upsertOnePagerSections(
  solutionHypothesisId: string,
  sections: OnePagerSectionUpdate,
): Promise<OnePager> {
  const now = new Date();
  return prisma.onePager.upsert({
    where: { solutionHypothesisId },
    create: {
      solutionHypothesisId,
      ...sections,
      lastEditedAt: now,
    },
    update: {
      ...sections,
      lastEditedAt: now,
    },
  });
}
