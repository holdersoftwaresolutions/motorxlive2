-- DropIndex
DROP INDEX "Video_eventId_publishedAt_idx";

-- DropIndex
DROP INDEX "Video_needsReview_createdAt_idx";

-- DropIndex
DROP INDEX "Video_status_publishedAt_idx";

-- CreateIndex
CREATE INDEX "Video_eventId_idx" ON "Video"("eventId");

-- CreateIndex
CREATE INDEX "Video_submittedByUserId_idx" ON "Video"("submittedByUserId");
