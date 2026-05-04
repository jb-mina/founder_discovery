import { prisma } from "@/lib/prisma";
import type { MethodGuide } from "@prisma/client";
import type { ValidationMethod } from "@/lib/agents/validation-designer/schema";
import type { MethodCoachOutput } from "@/lib/agents/method-coach/schema";

export async function getMethodGuide(
  hypothesisId: string,
  method: ValidationMethod,
): Promise<MethodGuide | null> {
  return prisma.methodGuide.findUnique({
    where: { hypothesisId_method: { hypothesisId, method } },
  });
}

export async function listMethodGuides(hypothesisId: string): Promise<MethodGuide[]> {
  return prisma.methodGuide.findMany({ where: { hypothesisId } });
}

export async function upsertMethodGuide(
  hypothesisId: string,
  method: ValidationMethod,
  guide: MethodCoachOutput,
): Promise<MethodGuide> {
  const data = {
    steps: JSON.stringify(guide.steps),
    template: guide.template,
    sampleSize: guide.sampleSize,
    channels: JSON.stringify(guide.channels),
    timeEstimate: guide.timeEstimate,
    watchOuts: guide.watchOuts ?? "",
  };
  return prisma.methodGuide.upsert({
    where: { hypothesisId_method: { hypothesisId, method } },
    create: { hypothesisId, method, ...data },
    update: data,
  });
}

// Shape returned to the client — JSON arrays parsed back into arrays so the
// UI doesn't have to know the storage format.
export type MethodGuideView = {
  id: string;
  method: string;
  steps: string[];
  template: string;
  sampleSize: string;
  channels: string[];
  timeEstimate: string;
  watchOuts: string;
  updatedAt: string;
};

export function toMethodGuideView(g: MethodGuide): MethodGuideView {
  return {
    id: g.id,
    method: g.method,
    steps: safeJsonArray(g.steps),
    template: g.template,
    sampleSize: g.sampleSize,
    channels: safeJsonArray(g.channels),
    timeEstimate: g.timeEstimate,
    watchOuts: g.watchOuts,
    updatedAt: g.updatedAt.toISOString(),
  };
}

function safeJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === "string");
  } catch {}
  return [];
}
