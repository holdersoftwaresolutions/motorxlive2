CREATE TYPE "VideoSourceType" AS ENUM ('MANAGED_VOD', 'EXTERNAL_HLS', 'YOUTUBE');
CREATE TYPE "VideoStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED', 'DISABLED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'STREAMER',
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "heroImageUrl" TEXT,
  "categoryId" TEXT,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Video" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "submittedByUserId" TEXT,
  "needsReview" BOOLEAN NOT NULL DEFAULT true,
  "sourceType" "VideoSourceType" NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'custom',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "playbackHlsUrl" TEXT,
  "playbackDashUrl" TEXT,
  "youtubeVideoId" TEXT,
  "durationSeconds" INTEGER,
  "status" "VideoStatus" NOT NULL DEFAULT 'PROCESSING',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

CREATE INDEX "Video_eventId_publishedAt_idx" ON "Video"("eventId", "publishedAt");
CREATE INDEX "Video_status_publishedAt_idx" ON "Video"("status", "publishedAt");
CREATE INDEX "Video_needsReview_createdAt_idx" ON "Video"("needsReview", "createdAt");

ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Video" ADD CONSTRAINT "Video_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Video" ADD CONSTRAINT "Video_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
