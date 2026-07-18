-- AlterTable
ALTER TABLE "Post" ADD COLUMN "contentHash" TEXT;

-- Backfill: matches contentHash() in apps/api/src/utils/content-hash.ts (md5 of trimmed content)
UPDATE "Post" SET "contentHash" = md5(trim("content"));

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "contentHash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Post_contentHash_key" ON "Post"("contentHash");
