-- CreateTable
CREATE TABLE "MethodGuide" (
    "id" TEXT NOT NULL,
    "hypothesisId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "sampleSize" TEXT NOT NULL DEFAULT '',
    "channels" TEXT NOT NULL DEFAULT '[]',
    "timeEstimate" TEXT NOT NULL DEFAULT '',
    "watchOuts" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MethodGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MethodGuide_hypothesisId_method_key" ON "MethodGuide"("hypothesisId", "method");

-- AddForeignKey
ALTER TABLE "MethodGuide" ADD CONSTRAINT "MethodGuide_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "Hypothesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
