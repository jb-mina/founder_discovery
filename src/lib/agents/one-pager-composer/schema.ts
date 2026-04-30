import { z } from "zod";
import { ONE_PAGER_SECTIONS } from "@/lib/db/one-pager";

// Single source of truth for section keys is `ONE_PAGER_SECTIONS` in
// lib/db/one-pager.ts. This schema mirrors that list 1:1 — adding or
// removing a section requires updating both files (DB column + this schema).
export const onePagerComposerOutputSchema = z.object(
  Object.fromEntries(
    ONE_PAGER_SECTIONS.map((k) => [k, z.string().min(1)]),
  ) as Record<(typeof ONE_PAGER_SECTIONS)[number], z.ZodString>,
);

export type OnePagerComposerOutput = z.infer<typeof onePagerComposerOutputSchema>;
