-- AlterTable
ALTER TABLE "Swipe" ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- Backfill: existing rows' current direction has been in effect since it was
-- first recorded (ADR 0012).
UPDATE "Swipe" SET "updatedAt" = "createdAt";

-- AlterTable
ALTER TABLE "Swipe" ALTER COLUMN "updatedAt" SET NOT NULL;
