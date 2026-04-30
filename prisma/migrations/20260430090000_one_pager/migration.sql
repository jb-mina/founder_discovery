-- CreateTable
CREATE TABLE "OnePager" (
    "id" TEXT NOT NULL,
    "solutionHypothesisId" TEXT NOT NULL,
    "oneLineSummary" TEXT NOT NULL DEFAULT '',
    "targetCustomer" TEXT NOT NULL DEFAULT '',
    "problem" TEXT NOT NULL DEFAULT '',
    "solution" TEXT NOT NULL DEFAULT '',
    "mvpScope" TEXT NOT NULL DEFAULT '',
    "mvpCostEstimate" TEXT NOT NULL DEFAULT '',
    "operatingModel" TEXT NOT NULL DEFAULT '',
    "monetization" TEXT NOT NULL DEFAULT '',
    "topRisks" TEXT NOT NULL DEFAULT '',
    "validationActions30d" TEXT NOT NULL DEFAULT '',
    "draftGeneratedAt" TIMESTAMP(3),
    "lastEditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnePager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnePager_solutionHypothesisId_key" ON "OnePager"("solutionHypothesisId");

-- AddForeignKey
ALTER TABLE "OnePager" ADD CONSTRAINT "OnePager_solutionHypothesisId_fkey" FOREIGN KEY ("solutionHypothesisId") REFERENCES "SolutionHypothesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
