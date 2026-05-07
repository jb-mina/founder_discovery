import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const SLOTS = ["investor", "friend", "socratic", "moderator"] as const;
type Slot = (typeof SLOTS)[number];

// Persona slots accept thumbs (-1 down / +1 up). Moderator accepts a 1..5
// star rating. We split by slot so the rating semantics stay strict — a
// moderator slot with rating=-1 would be ambiguous downstream.
const bodySchema = z
  .object({
    slot: z.enum(SLOTS),
    rating: z.number().int(),
    comment: z.string().max(1000).optional(),
  })
  .refine((b) => (b.slot === "moderator" ? b.rating >= 1 && b.rating <= 5 : b.rating === -1 || b.rating === 1), {
    message: "rating must be -1|1 for personas, 1..5 for moderator",
    path: ["rating"],
  });

function ratingBucket(slot: Slot, rating: number): "positive" | "neutral" | "negative" {
  if (slot === "moderator") {
    if (rating >= 4) return "positive";
    if (rating === 3) return "neutral";
    return "negative";
  }
  return rating === 1 ? "positive" : "negative";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const exists = await prisma.realityCheck.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Reality check not found" }, { status: 404 });
  }

  const created = await prisma.realityCheckFeedback.create({
    data: {
      realityCheckId: id,
      slot: parsed.data.slot,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    },
  });

  // Bucket-only payload so PostHog never receives the comment text. Self-map
  // / 1-pager content sits one hop away — comment field can mention either.
  // CLAUDE.md §7 forbids sending Self map text to logs/analytics.
  return NextResponse.json({
    id: created.id,
    bucket: ratingBucket(parsed.data.slot, parsed.data.rating),
  });
}
