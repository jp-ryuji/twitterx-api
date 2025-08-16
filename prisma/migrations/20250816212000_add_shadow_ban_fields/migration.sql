-- AlterTable
ALTER TABLE "users" 
ADD COLUMN "isShadowBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "shadowBanReason" TEXT,
ADD COLUMN "suspiciousActivityCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastSuspiciousActivity" TIMESTAMP(3);