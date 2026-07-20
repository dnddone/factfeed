import { Prisma } from "@prisma/client";
import type Anthropic from "@anthropic-ai/sdk";
import type { Locale } from "@factfeed/contract";
import { z } from "zod";
import { anthropic } from "@/clients/anthropic";
import type { db } from "@/clients/db";
import { CATEGORIES, type Category } from "@/constants/categories.constants";
import {
  EXPLORATION_FLOOR_SHARE,
  GENERATION_BATCH_SIZE_CAP,
  GENERATION_MAX_TOKENS,
  GENERATION_MODEL,
  LOCALE_LANGUAGE_NAMES,
  LOW_SAMPLE_THRESHOLD,
} from "@/constants/generation.constants";
import { laplaceScore, priorPostCounters } from "@/ranking";
import { contentHash } from "@/utils/content-hash";
import { ogImagePath } from "@/utils/og-image-path";

export const generatedFactSchema = z.object({
  content: z.string().trim().min(1).max(280),
  category: z.enum(CATEGORIES),
});

export const generatedBatchSchema = z.object({
  facts: z.array(generatedFactSchema),
});

export type GeneratedFact = z.infer<typeof generatedFactSchema>;

/**
 * Largest-remainder apportionment: split `total` whole slots across `weights`
 * proportionally, rounding without losing or duplicating a slot.
 */
const apportion = ({
  weights,
  total,
}: {
  weights: readonly number[];
  total: number;
}): number[] => {
  if (total <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }

  const sumWeights = weights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = sumWeights > 0 ? weights : weights.map(() => 1);
  const normalizedSum = sumWeights > 0 ? sumWeights : weights.length;

  const raw = normalizedWeights.map(
    (weight) => (weight / normalizedSum) * total,
  );
  const counts = raw.map(Math.floor);
  const remainder = total - counts.reduce((sum, count) => sum + count, 0);
  const byLargestRemainder = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let slot = 0; slot < remainder; slot += 1) {
    const index = byLargestRemainder[slot]!.index;
    counts[index] = (counts[index] ?? 0) + 1;
  }

  return counts;
};

export type CategoryStatsSnapshot = {
  score: number;
  sampleCount: number;
};

export type CategoryMix = Record<Category, number>;

/**
 * ADR 0010: a batch's category split is score-weighted, with an exploration
 * floor reserved for low-sample categories so they aren't starved before
 * they can prove out.
 */
export const categoryBatchMix = ({
  size,
  statsByCategory,
}: {
  size: number;
  statsByCategory: ReadonlyMap<Category, CategoryStatsSnapshot>;
}): CategoryMix => {
  const lowSampleCategories = CATEGORIES.filter(
    (category) =>
      (statsByCategory.get(category)?.sampleCount ?? 0) < LOW_SAMPLE_THRESHOLD,
  );

  const explorationTotal = Math.min(
    Math.round(size * EXPLORATION_FLOOR_SHARE),
    size,
  );
  const explorationCounts = apportion({
    weights: lowSampleCategories.map(() => 1),
    total: explorationTotal,
  });
  const explorationByCategory = new Map(
    lowSampleCategories.map((category, index) => [
      category,
      explorationCounts[index] ?? 0,
    ]),
  );
  const explorationUsed = explorationCounts.reduce(
    (sum, count) => sum + count,
    0,
  );

  const scoreWeights = CATEGORIES.map(
    (category) => statsByCategory.get(category)?.score ?? 0.5,
  );
  const scoreCounts = apportion({
    weights: scoreWeights,
    total: size - explorationUsed,
  });

  return Object.fromEntries(
    CATEGORIES.map((category, index) => [
      category,
      (explorationByCategory.get(category) ?? 0) + (scoreCounts[index] ?? 0),
    ]),
  ) as CategoryMix;
};

type DedupableFact = { content: string; category: Category };

/**
 * Filters out facts whose content hash already exists — either in `existingHashes`
 * (already-persisted posts) or earlier in the same batch (Claude repeats itself).
 */
export const dedupeAgainstExisting = <T extends DedupableFact>({
  facts,
  existingHashes,
}: {
  facts: readonly T[];
  existingHashes: ReadonlySet<string>;
}): (T & { contentHash: string })[] => {
  const seen = new Set(existingHashes);
  const result: (T & { contentHash: string })[] = [];

  for (const fact of facts) {
    const hash = contentHash(fact.content);

    if (seen.has(hash)) {
      continue;
    }

    seen.add(hash);
    result.push({ ...fact, contentHash: hash });
  }

  return result;
};

const SUBMIT_FACTS_TOOL: Anthropic.Tool = {
  name: "submit_facts",
  description: "Submit the generated batch of facts.",
  input_schema: {
    type: "object",
    properties: {
      facts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description:
                "A single self-contained, surprising, true sentence. No source citation.",
            },
            category: { type: "string", enum: [...CATEGORIES] },
          },
          required: ["content", "category"],
        },
      },
    },
    required: ["facts"],
  },
};

/**
 * `languageName` is a human-readable name (e.g. "Ukrainian"), not a locale
 * code — Claude writes each batch natively in that language (ADR 0011).
 */
export const buildPrompt = (mix: CategoryMix, languageName: string): string => {
  const lines = CATEGORIES.filter((category) => (mix[category] ?? 0) > 0).map(
    (category) => `- ${category}: ${mix[category]}`,
  );

  return [
    "Generate short, surprising, true facts for a swipeable facts feed app.",
    `Write every fact in ${languageName}.`,
    "Each fact is one self-contained sentence, under 200 characters, no citation.",
    "Facts must not repeat each other. Submit exactly this many facts per category:",
    ...lines,
  ].join("\n");
};

const requestFacts = async (
  mix: CategoryMix,
  languageName: string,
): Promise<GeneratedFact[]> => {
  const response = await anthropic.messages.create({
    model: GENERATION_MODEL,
    max_tokens: GENERATION_MAX_TOKENS,
    tools: [SUBMIT_FACTS_TOOL],
    tool_choice: { type: "tool", name: SUBMIT_FACTS_TOOL.name },
    messages: [{ role: "user", content: buildPrompt(mix, languageName) }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    return [];
  }

  return generatedBatchSchema.parse(toolUse.input).facts;
};

export type GenerateFactBatchResult = {
  created: number;
  duplicates: number;
};

/**
 * Requests a category-mixed batch from Claude, dedupes it against existing
 * posts, and persists the rest with an ADR 0010 cold-start prior and a
 * typographic image path.
 */
export const generateFactBatch = async ({
  db: prisma,
  size,
  locale,
}: {
  db: typeof db;
  size: number;
  locale: Locale;
}): Promise<GenerateFactBatchResult> => {
  const cappedSize = Math.min(size, GENERATION_BATCH_SIZE_CAP);

  const [categoryStats, existingPosts] = await Promise.all([
    prisma.categoryStats.findMany(),
    prisma.post.findMany({ where: { locale }, select: { contentHash: true } }),
  ]);

  const statsByCategory = new Map(
    categoryStats.map(({ category, likeCount, dislikeCount }) => [
      category as Category,
      {
        score: laplaceScore(likeCount, dislikeCount),
        sampleCount: likeCount + dislikeCount,
      },
    ]),
  );

  const mix = categoryBatchMix({ size: cappedSize, statsByCategory });
  const facts = await requestFacts(mix, LOCALE_LANGUAGE_NAMES[locale]);
  const deduped = dedupeAgainstExisting({
    facts,
    existingHashes: new Set(existingPosts.map((post) => post.contentHash)),
  });

  let created = 0;
  let duplicates = facts.length - deduped.length;

  for (const fact of deduped) {
    const prior = priorPostCounters(
      statsByCategory.get(fact.category)?.score ?? null,
    );

    try {
      const post = await prisma.post.create({
        data: {
          content: fact.content,
          contentHash: fact.contentHash,
          locale,
          category: fact.category,
          likeCount: prior.likeCount,
          dislikeCount: prior.dislikeCount,
          score: laplaceScore(prior.likeCount, prior.dislikeCount),
          imageSource: "TYPOGRAPHIC",
        },
      });

      await prisma.post.update({
        where: { id: post.id },
        data: { imageUrl: ogImagePath(post.id) },
      });

      created += 1;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        duplicates += 1;
        continue;
      }

      throw error;
    }
  }

  return { created, duplicates };
};
