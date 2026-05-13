-- CreateEnum
CREATE TYPE "ContributorAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContributorAccessRoleRequested" AS ENUM ('STREAMER', 'MEDIA', 'TRACK', 'PROMOTER', 'OTHER');

-- CreateTable
CREATE TABLE "ContributorAccessRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organizationName" TEXT,
    "roleRequested" "ContributorAccessRoleRequested" NOT NULL DEFAULT 'STREAMER',
    "websiteOrSocialUrl" TEXT,
    "youtubeChannelUrl" TEXT,
    "reason" TEXT,
    "status" "ContributorAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributorAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContributorAccessRequest_email_idx" ON "ContributorAccessRequest"("email");

-- CreateIndex
CREATE INDEX "ContributorAccessRequest_status_idx" ON "ContributorAccessRequest"("status");

-- CreateIndex
CREATE INDEX "ContributorAccessRequest_roleRequested_idx" ON "ContributorAccessRequest"("roleRequested");

-- CreateIndex
CREATE INDEX "ContributorAccessRequest_createdAt_idx" ON "ContributorAccessRequest"("createdAt");
