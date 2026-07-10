import { PrismaClient } from "@prisma/client";
import { DEV_USER_ID } from "@/constants/auth.constants";

const prisma = new PrismaClient();

const FACTS: { content: string; category: string }[] = [
  {
    content:
      "Octopuses have three hearts, and two of them stop beating when they swim.",
    category: "animals",
  },
  {
    content: "A group of flamingos is called a 'flamboyance'.",
    category: "animals",
  },
  {
    content:
      "Honey never spoils — edible honey has been found in 3,000-year-old Egyptian tombs.",
    category: "food",
  },
  {
    content: "Bananas are berries, but strawberries aren't.",
    category: "food",
  },
  {
    content:
      "The Eiffel Tower grows about 15 cm taller in summer due to thermal expansion.",
    category: "science",
  },
  {
    content:
      "A bolt of lightning is roughly five times hotter than the surface of the sun.",
    category: "science",
  },
  {
    content:
      "There are more possible chess games than atoms in the observable universe.",
    category: "science",
  },
  {
    content:
      "The Great Wall of China is not visible from space with the naked eye.",
    category: "history",
  },
  {
    content: "Oxford University is older than the Aztec Empire.",
    category: "history",
  },
  {
    content:
      "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.",
    category: "history",
  },
  {
    content: "Venus is the only planet that spins clockwise on its axis.",
    category: "space",
  },
  {
    content: "A day on Venus is longer than a year on Venus.",
    category: "space",
  },
  {
    content:
      "There is a planet made largely of diamond, known as '55 Cancri e'.",
    category: "space",
  },
  {
    content: "Neutron stars can spin at a rate of 600 rotations per second.",
    category: "space",
  },
  {
    content: "The human body contains enough iron to make a small nail.",
    category: "human-body",
  },
  {
    content:
      "Your stomach gets an entirely new lining every few days to avoid digesting itself.",
    category: "human-body",
  },
  {
    content: "Humans share about 60% of their DNA with bananas.",
    category: "human-body",
  },
  {
    content: "It's impossible to hum while holding your nose closed.",
    category: "human-body",
  },
  {
    content:
      "The shortest war in history lasted 38 minutes, between Britain and Zanzibar in 1896.",
    category: "history",
  },
  {
    content: "Russia has 11 time zones, more than any other country.",
    category: "geography",
  },
  {
    content:
      "Alaska is the westernmost, easternmost, and northernmost state in the US.",
    category: "geography",
  },
  {
    content:
      "The Sahara desert was once green and lush, roughly 6,000 years ago.",
    category: "geography",
  },
  {
    content:
      "More people have died from vending machines than shark attacks each year in the US.",
    category: "science",
  },
  {
    content: "Wombat poop is cube-shaped.",
    category: "animals",
  },
  {
    content:
      "The word 'set' has the most different meanings of any word in English.",
    category: "language",
  },
  {
    content: "Nintendo was founded in 1889 as a playing card company.",
    category: "technology",
  },
  {
    content:
      "The first computer bug was an actual moth stuck in a relay in 1947.",
    category: "technology",
  },
  {
    content:
      "The QWERTY keyboard layout was designed to slow typists down and prevent jams.",
    category: "technology",
  },
  {
    content:
      "Sharks existed before trees — sharks predate trees by about 50 million years.",
    category: "animals",
  },
  {
    content: "A single strand of spaghetti is called a 'spaghetto'.",
    category: "food",
  },
];

const main = async (): Promise<void> => {
  await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    update: {},
    create: { id: DEV_USER_ID },
  });

  for (const fact of FACTS) {
    const existing = await prisma.post.findFirst({
      where: { content: fact.content },
    });

    if (existing) {
      continue;
    }

    await prisma.post.create({
      data: {
        content: fact.content,
        category: fact.category,
      },
    });
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
