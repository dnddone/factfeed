import { PrismaClient } from "@prisma/client";
import { LOCALES } from "@factfeed/contract";
import { generateFactBatch } from "@/generation";

const prisma = new PrismaClient();

/**
 * One full generation batch (GENERATION_BATCH_SIZE_CAP) per locale — enough
 * to spread across every category's exploration floor on a from-scratch pool.
 */
const SEED_BATCH_SIZE = 30;

const main = async (): Promise<void> => {
  for (const locale of LOCALES) {
    const { created, duplicates } = await generateFactBatch({
      db: prisma,
      size: SEED_BATCH_SIZE,
      locale,
    });

    console.log(
      `[${locale}] Created ${created} posts, skipped ${duplicates} duplicates.`,
    );
  }

  const count = await prisma.post.count();
  console.log(`Seed complete. Post count: ${count}`);
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
