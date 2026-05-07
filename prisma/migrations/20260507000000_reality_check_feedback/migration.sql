-- CreateTable
CREATE TABLE "RealityCheckFeedback" (
    "id" TEXT NOT NULL,
    "realityCheckId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealityCheckFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RealityCheckFeedback_realityCheckId_slot_idx" ON "RealityCheckFeedback"("realityCheckId", "slot");

-- AddForeignKey
ALTER TABLE "RealityCheckFeedback" ADD CONSTRAINT "RealityCheckFeedback_realityCheckId_fkey" FOREIGN KEY ("realityCheckId") REFERENCES "RealityCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
