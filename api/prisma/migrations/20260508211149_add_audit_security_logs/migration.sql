-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARN', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('SYSTEM', 'USER', 'ADMIN', 'CONTRIBUTOR', 'ANONYMOUS');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "actorType" "AuditActorType" NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "actorEmail" TEXT,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEventLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'WARN',
    "actorId" TEXT,
    "actorEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "path" TEXT,
    "method" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRunLog" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "summary" TEXT,
    "metadata" JSONB,
    "error" TEXT,

    CONSTRAINT "JobRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_resourceId_idx" ON "AuditLog"("resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityEventLog_eventType_idx" ON "SecurityEventLog"("eventType");

-- CreateIndex
CREATE INDEX "SecurityEventLog_severity_idx" ON "SecurityEventLog"("severity");

-- CreateIndex
CREATE INDEX "SecurityEventLog_actorId_idx" ON "SecurityEventLog"("actorId");

-- CreateIndex
CREATE INDEX "SecurityEventLog_ipAddress_idx" ON "SecurityEventLog"("ipAddress");

-- CreateIndex
CREATE INDEX "SecurityEventLog_createdAt_idx" ON "SecurityEventLog"("createdAt");

-- CreateIndex
CREATE INDEX "JobRunLog_jobName_idx" ON "JobRunLog"("jobName");

-- CreateIndex
CREATE INDEX "JobRunLog_status_idx" ON "JobRunLog"("status");

-- CreateIndex
CREATE INDEX "JobRunLog_startedAt_idx" ON "JobRunLog"("startedAt");
