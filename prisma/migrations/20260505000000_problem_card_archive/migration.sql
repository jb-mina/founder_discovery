-- AlterTable
ALTER TABLE "ProblemCard" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ProblemCard_archivedAt_idx" ON "ProblemCard"("archivedAt");
