import { z } from "zod";
import { VALIDATION_METHODS } from "@/lib/agents/validation-designer/schema";

export const methodCoachOutputSchema = z.object({
  // 3~6 ordered actions a solo founder can execute today.
  steps: z.array(z.string().min(1)).min(3).max(6),
  // Method-specific raw material the user can copy-paste:
  //   interview      → 5~7 open questions, no leading
  //   observation    → where to be / what to log
  //   smoke_test     → landing copy + CTA
  //   fake_door      → fake feature surface + measurement
  //   prepayment     → price + deposit ask + refund policy
  //   concierge      → manual delivery script + ask
  template: z.string().min(1),
  // E.g. "10명" / "랜딩 방문 100건" / "결제 시도 5건"
  sampleSize: z.string().min(1),
  // Concrete channels (오픈채팅, DISQUIET, 링크드인, 지인 N차, etc.)
  channels: z.array(z.string().min(1)).min(1).max(5),
  // E.g. "1주차에 섭외, 2주차에 실행 — 1명 30분"
  timeEstimate: z.string().min(1),
  // Common pitfalls — 1~3 sentences. Optional but encouraged.
  watchOuts: z.string().default(""),
});

export type MethodCoachOutput = z.infer<typeof methodCoachOutputSchema>;

export { VALIDATION_METHODS };
