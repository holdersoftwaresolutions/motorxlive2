-- AlterTable
ALTER TABLE "Stream" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "submittedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
