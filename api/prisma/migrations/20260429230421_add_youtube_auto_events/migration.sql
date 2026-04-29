-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('MANUAL', 'YOUTUBE_AUTO');

-- CreateEnum
CREATE TYPE "EventReviewStatus" AS ENUM ('PUBLISHED', 'NEEDS_REVIEW', 'ARCHIVED', 'MERGED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "autoCreatedFromYoutubeChannelId" TEXT,
ADD COLUMN     "autoCreatedFromYoutubeVideoId" TEXT,
ADD COLUMN     "eventReviewStatus" "EventReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "eventSource" "EventSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "mergedIntoEventId" TEXT;
