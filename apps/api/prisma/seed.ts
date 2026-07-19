import { PrismaClient } from "@prisma/client";
import { DEV_USER_ID } from "@/constants/auth.constants";
import { generateFactBatch } from "@/generation";

const prisma = new PrismaClient();

/**
 * One full generation batch (GENERATION_BATCH_SIZE_CAP) — enough to spread
 * across every category's exploration floor on a from-scratch pool.
 */
const SEED_BATCH_SIZE = 30;

const main = async (): Promise<void> => {
  await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    update: {},
    create: { id: DEV_USER_ID },
  });

  const { created, duplicates } = await generateFactBatch({
    db: prisma,
    size: SEED_BATCH_SIZE,
  });

  const count = await prisma.post.count();
  console.log(
    `Seed complete. Created ${created} posts, skipped ${duplicates} duplicates. Post count: ${count}`,
  );
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
