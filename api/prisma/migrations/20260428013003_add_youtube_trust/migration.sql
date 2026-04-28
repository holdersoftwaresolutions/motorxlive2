-- CreateEnum
CREATE TYPE "YouTubeTrustLevel" AS ENUM ('REVIEW_REQUIRED', 'AUTO_INGEST_REVIEW', 'AUTO_PUBLISH');

-- AlterTable
ALTER TABLE "YouTubeDiscoveredChannel" ADD COLUMN     "isTrusted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trustLevel" "YouTubeTrustLevel" NOT NULL DEFAULT 'REVIEW_REQUIRED';
