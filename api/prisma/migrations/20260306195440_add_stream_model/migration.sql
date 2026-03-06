-- CreateEnum
CREATE TYPE "StreamSourceType" AS ENUM ('MANAGED_LIVE', 'EXTERNAL_HLS', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "StreamLifecycleStatus" AS ENUM ('CREATED', 'READY', 'LIVE', 'ENDED', 'DISABLED', 'ERROR');

-- CreateTable
CREATE TABLE "Stream" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sourceType" "StreamSourceType" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'custom',
    "title" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "playbackHlsUrl" TEXT,
    "playbackDashUrl" TEXT,
    "youtubeVideoId" TEXT,
    "lifecycle" "StreamLifecycleStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Stream_eventId_priority_idx" ON "Stream"("eventId", "priority");

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
