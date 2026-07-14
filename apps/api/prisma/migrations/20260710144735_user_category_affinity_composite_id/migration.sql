-- AlterTable
ALTER TABLE "UserCategoryAffinity" ADD CONSTRAINT "UserCategoryAffinity_pkey" PRIMARY KEY ("userId", "category");

-- DropIndex
DROP INDEX "UserCategoryAffinity_userId_category_key";
