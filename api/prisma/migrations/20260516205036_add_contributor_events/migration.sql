-- AlterEnum
ALTER TYPE "EventSource" ADD VALUE 'CONTRIBUTOR';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "submittedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
