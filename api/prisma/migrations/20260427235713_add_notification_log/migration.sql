-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LIVE_NOW');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('CREATED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'CREATED',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "eventId" TEXT,
    "eventSlug" TEXT,
    "streamId" TEXT,
    "payload" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);
