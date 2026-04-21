-- CreateTable
CREATE TABLE "SelfMapEntry" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelfMapEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemCard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "when" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "painPoints" TEXT NOT NULL,
    "alternatives" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "stage" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "addedBy" TEXT NOT NULL DEFAULT 'scout',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitEvaluation" (
    "id" TEXT NOT NULL,
    "problemCardId" TEXT NOT NULL,
    "attraction" INTEGER NOT NULL,
    "understanding" INTEGER NOT NULL,
    "accessibility" INTEGER NOT NULL,
    "motivation" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationPlan" (
    "id" TEXT NOT NULL,
    "problemCardId" TEXT NOT NULL,
    "ideaDraft" TEXT NOT NULL,
    "interviewQuestions" TEXT NOT NULL,
    "experimentMethod" TEXT NOT NULL,
    "successSignals" TEXT NOT NULL,
    "failureSignals" TEXT NOT NULL,
    "weeklySteps" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "learnings" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealityCheck" (
    "id" TEXT NOT NULL,
    "validationPlanId" TEXT NOT NULL,
    "coldInvestor" TEXT NOT NULL,
    "honestFriend" TEXT NOT NULL,
    "socraticQ" TEXT NOT NULL,
    "moderatorSummary" TEXT NOT NULL,
    "inputContext" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentConversation" (
    "id" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FitEvaluation_problemCardId_key" ON "FitEvaluation"("problemCardId");

-- AddForeignKey
ALTER TABLE "FitEvaluation" ADD CONSTRAINT "FitEvaluation_problemCardId_fkey" FOREIGN KEY ("problemCardId") REFERENCES "ProblemCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationPlan" ADD CONSTRAINT "ValidationPlan_problemCardId_fkey" FOREIGN KEY ("problemCardId") REFERENCES "ProblemCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealityCheck" ADD CONSTRAINT "RealityCheck_validationPlanId_fkey" FOREIGN KEY ("validationPlanId") REFERENCES "ValidationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
