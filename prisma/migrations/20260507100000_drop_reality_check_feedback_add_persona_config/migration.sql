-- DropForeignKey
ALTER TABLE "RealityCheckFeedback" DROP CONSTRAINT "RealityCheckFeedback_realityCheckId_fkey";

-- DropTable
DROP TABLE "RealityCheckFeedback";

-- CreateTable
CREATE TABLE "RealityCheckPersonaConfig" (
    "id" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealityCheckPersonaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RealityCheckPersonaConfig_persona_key" ON "RealityCheckPersonaConfig"("persona");

-- Seed default persona/vendor mappings (decided 2026-05-07).
-- These match DEFAULT_PERSONA_MODELS in src/lib/llm/types.ts; the runtime
-- code falls back to the same defaults when a row is missing, so the seed
-- is for explicitness rather than correctness.
INSERT INTO "RealityCheckPersonaConfig" ("id", "persona", "vendor", "model", "updatedAt") VALUES
  ('rcpc_seed_investor',  'investor',  'openrouter', 'perplexity/sonar-pro',     CURRENT_TIMESTAMP),
  ('rcpc_seed_friend',    'friend',    'openrouter', 'openai/gpt-5.1',           CURRENT_TIMESTAMP),
  ('rcpc_seed_socratic',  'socratic',  'openrouter', 'google/gemini-3-flash',    CURRENT_TIMESTAMP),
  ('rcpc_seed_moderator', 'moderator', 'anthropic',  'claude-sonnet-4-6',        CURRENT_TIMESTAMP);
