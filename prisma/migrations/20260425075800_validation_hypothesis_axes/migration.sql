-- DropForeignKey
ALTER TABLE "RealityCheck" DROP CONSTRAINT "RealityCheck_validationPlanId_fkey";

-- DropForeignKey
ALTER TABLE "ValidationPlan" DROP CONSTRAINT "ValidationPlan_problemCardId_fkey";

-- DropTable
DROP TABLE "ValidationPlan";

-- DropTable (RealityCheck will be recreated with new FK)
DROP TABLE "RealityCheck";

-- CreateTable
CREATE TABLE "SolutionHypothesis" (
    "id" TEXT NOT NULL,
    "problemCardId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolutionHypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "problemCardId" TEXT,
    "solutionHypothesisId" TEXT,
    "prescribedMethods" TEXT NOT NULL DEFAULT '[]',
    "successSignals" TEXT NOT NULL DEFAULT '',
    "failureSignals" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "findings" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealityCheck" (
    "id" TEXT NOT NULL,
    "solutionHypothesisId" TEXT NOT NULL,
    "coldInvestor" TEXT NOT NULL,
    "honestFriend" TEXT NOT NULL,
    "socraticQ" TEXT NOT NULL,
    "moderatorSummary" TEXT NOT NULL,
    "inputContext" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hypothesis_problemCardId_axis_key" ON "Hypothesis"("problemCardId", "axis");

-- CreateIndex
CREATE UNIQUE INDEX "Hypothesis_solutionHypothesisId_axis_key" ON "Hypothesis"("solutionHypothesisId", "axis");

-- AddForeignKey
ALTER TABLE "SolutionHypothesis" ADD CONSTRAINT "SolutionHypothesis_problemCardId_fkey" FOREIGN KEY ("problemCardId") REFERENCES "ProblemCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hypothesis" ADD CONSTRAINT "Hypothesis_problemCardId_fkey" FOREIGN KEY ("problemCardId") REFERENCES "ProblemCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hypothesis" ADD CONSTRAINT "Hypothesis_solutionHypothesisId_fkey" FOREIGN KEY ("solutionHypothesisId") REFERENCES "SolutionHypothesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealityCheck" ADD CONSTRAINT "RealityCheck_solutionHypothesisId_fkey" FOREIGN KEY ("solutionHypothesisId") REFERENCES "SolutionHypothesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
