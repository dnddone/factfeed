import { describe, expect, it } from "vitest";
import { CATEGORIES, type Category } from "@/constants/categories.constants";
import {
  categoryBatchMix,
  dedupeAgainstExisting,
  generatedFactSchema,
} from "@/generation";

describe("generatedFactSchema", () => {
  it("accepts a valid fact", () => {
    const result = generatedFactSchema.safeParse({
      content: "Octopuses have three hearts.",
      category: "animals",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a category outside the taxonomy", () => {
    const result = generatedFactSchema.safeParse({
      content: "Octopuses have three hearts.",
      category: "not-a-real-category",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = generatedFactSchema.safeParse({
      content: "   ",
      category: "animals",
    });

    expect(result.success).toBe(false);
  });
});

describe("dedupeAgainstExisting", () => {
  const fact = (content: string, category: Category = "animals") => ({
    content,
    category,
  });

  it("rejects a fact whose content hash already exists", () => {
    const existing = fact("Octopuses have three hearts.");
    const existingHashes = new Set(
      dedupeAgainstExisting({
        facts: [existing],
        existingHashes: new Set(),
      }).map((f) => f.contentHash),
    );

    const result = dedupeAgainstExisting({
      facts: [fact("Octopuses have three hearts.")],
      existingHashes,
    });

    expect(result).toHaveLength(0);
  });

  it("rejects a duplicate that appears twice within the same batch", () => {
    const result = dedupeAgainstExisting({
      facts: [fact("Bananas are berries."), fact("Bananas are berries.")],
      existingHashes: new Set(),
    });

    expect(result).toHaveLength(1);
  });

  it("keeps distinct facts", () => {
    const result = dedupeAgainstExisting({
      facts: [
        fact("Bananas are berries."),
        fact("Wombat poop is cube-shaped."),
      ],
      existingHashes: new Set(),
    });

    expect(result).toHaveLength(2);
  });
});

describe("categoryBatchMix", () => {
  it("gives a strong-performing category more slots than a weak one", () => {
    const statsByCategory = new Map<
      Category,
      { score: number; sampleCount: number }
    >([
      ["animals", { score: 0.9, sampleCount: 100 }],
      ["food", { score: 0.1, sampleCount: 100 }],
    ]);

    const mix = categoryBatchMix({ size: 60, statsByCategory });

    expect(mix.animals).toBeGreaterThan(mix.food);
  });

  it("still reserves a share for a brand-new category against strong performers", () => {
    const statsByCategory = new Map<
      Category,
      { score: number; sampleCount: number }
    >(
      CATEGORIES.filter((category) => category !== "animals").map(
        (category) => [category, { score: 0.95, sampleCount: 100 }],
      ),
    );

    const mix = categoryBatchMix({ size: 60, statsByCategory });

    expect(mix.animals).toBeGreaterThan(0);
  });

  it("allocates exactly `size` slots in total", () => {
    const mix = categoryBatchMix({ size: 30, statsByCategory: new Map() });
    const total = Object.values(mix).reduce((sum, count) => sum + count, 0);

    expect(total).toBe(30);
  });
});
