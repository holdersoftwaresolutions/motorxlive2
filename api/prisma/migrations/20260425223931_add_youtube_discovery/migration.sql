/*
  Warnings:

  - Made the column `title` on table `Stream` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "YouTubeDiscoveryStatus" AS ENUM ('DISCOVERED', 'APPROVED', 'IGNORED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "YouTubeIngestionStatus" AS ENUM ('DISCOVERED', 'READY_TO_INGEST', 'INGESTED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "YouTubeChannelCategory" AS ENUM ('DRAG_RACING', 'OFFROAD', 'SXS_UTV', 'MOTORSPORTS_PODCAST', 'GENERAL_MOTORSPORTS', 'TRACK_CHANNEL', 'EVENT_PROMOTER', 'CREATOR_MEDIA');

-- AlterTable
ALTER TABLE "Stream" ADD COLUMN     "description" TEXT,
ADD COLUMN     "embedUrl" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "youtubeActualEndTime" TIMESTAMP(3),
ADD COLUMN     "youtubeActualStartTime" TIMESTAMP(3),
ADD COLUMN     "youtubeChannelId" TEXT,
ADD COLUMN     "youtubeChannelName" TEXT,
ADD COLUMN     "youtubeEmbeddable" BOOLEAN,
ADD COLUMN     "youtubeLiveStatus" TEXT,
ADD COLUMN     "youtubePublishedAt" TIMESTAMP(3),
ADD COLUMN     "youtubeScheduledStartTime" TIMESTAMP(3),
ADD COLUMN     "youtubeThumbnailUrl" TEXT,
ALTER COLUMN "provider" DROP NOT NULL,
ALTER COLUMN "provider" DROP DEFAULT,
ALTER COLUMN "title" SET NOT NULL;

-- CreateTable
CREATE TABLE "YouTubeDiscoveredChannel" (
    "id" TEXT NOT NULL,
    "youtubeChannelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "channelUrl" TEXT,
    "category" "YouTubeChannelCategory" NOT NULL DEFAULT 'GENERAL_MOTORSPORTS',
    "discoveryStatus" "YouTubeDiscoveryStatus" NOT NULL DEFAULT 'DISCOVERED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreReasons" JSONB,
    "recentLiveCount" INTEGER NOT NULL DEFAULT 0,
    "upcomingLiveCount" INTEGER NOT NULL DEFAULT 0,
    "completedLiveCount" INTEGER NOT NULL DEFAULT 0,
    "subscriberCount" INTEGER,
    "videoCount" INTEGER,
    "viewCount" INTEGER,
    "uploadsPlaylistId" TEXT,
    "autoIngestStreams" BOOLEAN NOT NULL DEFAULT false,
    "autoIngestVideos" BOOLEAN NOT NULL DEFAULT false,
    "autoIngestPodcasts" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "lastDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMonitoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouTubeDiscoveredChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YouTubeDiscoveredVideo" (
    "id" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "youtubeChannelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "watchUrl" TEXT NOT NULL,
    "embedUrl" TEXT NOT NULL,
    "liveBroadcastContent" TEXT,
    "scheduledStartTime" TIMESTAMP(3),
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "embeddable" BOOLEAN,
    "duration" TEXT,
    "viewCount" INTEGER,
    "likeCount" INTEGER,
    "category" "YouTubeChannelCategory",
    "ingestionStatus" "YouTubeIngestionStatus" NOT NULL DEFAULT 'DISCOVERED',
    "motorXStreamId" TEXT,
    "motorXVideoId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreReasons" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouTubeDiscoveredVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YouTubeApiUsageLog" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "quotaCost" INTEGER NOT NULL,
    "query" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YouTubeApiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeDiscoveredChannel_youtubeChannelId_key" ON "YouTubeDiscoveredChannel"("youtubeChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeDiscoveredVideo_youtubeVideoId_key" ON "YouTubeDiscoveredVideo"("youtubeVideoId");

-- AddForeignKey
ALTER TABLE "YouTubeDiscoveredVideo" ADD CONSTRAINT "YouTubeDiscoveredVideo_youtubeChannelId_fkey" FOREIGN KEY ("youtubeChannelId") REFERENCES "YouTubeDiscoveredChannel"("youtubeChannelId") ON DELETE RESTRICT ON UPDATE CASCADE;
