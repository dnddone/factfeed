-- DropIndex
DROP INDEX "Post_contentHash_key";

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en';

-- CreateIndex
CREATE INDEX "Post_locale_idx" ON "Post"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "Post_locale_contentHash_key" ON "Post"("locale", "contentHash");
