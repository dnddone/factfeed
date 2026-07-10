import type { SwipeDirection } from "@factfeed/contract";
import {
  HALF_LIFE_HOURS,
  MIN_SAMPLE_WEIGHT,
  PRIOR_WEIGHT,
} from "@/constants/ranking.constants";

type Counters = {
  likeCount: number;
  dislikeCount: number;
};

const hoursBetween = (from: Date, to: Date): number =>
  (to.getTime() - from.getTime()) / (1000 * 60 * 60);

/**
 * ADR 0010: exponential decay toward zero weight, half-life in hours.
 */
export const decayFactor = (elapsedHours: number): number =>
  Math.pow(0.5, elapsedHours / HALF_LIFE_HOURS);

/**
 * Same Laplace smoothing as ADR 0005 — small samples don't read as 100%.
 */
export const laplaceScore = (likeCount: number, dislikeCount: number): number =>
  (likeCount + 1) / (likeCount + dislikeCount + 2);

export type NextDecayedCounters = Counters & { score: number };

/**
 * Shared by Post and CategoryStats — ADR 0010 decays and scores both identically.
 */
export const nextDecayedCounters = ({
  counters,
  scoreUpdatedAt,
  now,
  direction,
}: {
  counters: Counters;
  scoreUpdatedAt: Date;
  now: Date;
  direction: SwipeDirection;
}): NextDecayedCounters => {
  const decay = decayFactor(hoursBetween(scoreUpdatedAt, now));
  const likeCount = counters.likeCount * decay + (direction === "LIKE" ? 1 : 0);
  const dislikeCount =
    counters.dislikeCount * decay + (direction === "DISLIKE" ? 1 : 0);

  return {
    likeCount,
    dislikeCount,
    score: laplaceScore(likeCount, dislikeCount),
  };
};

export const nextAffinity = ({
  affinity,
  updatedAt,
  now,
  direction,
}: {
  affinity: number;
  updatedAt: Date;
  now: Date;
  direction: SwipeDirection;
}): number => {
  const decay = decayFactor(hoursBetween(updatedAt, now));
  const delta = direction === "LIKE" ? 1 : direction === "DISLIKE" ? -1 : 0;

  return affinity * decay + delta;
};

/**
 * ADR 0010 cold-start prior: blend a new post toward its category's score.
 */
export const priorPostCounters = (categoryScore: number | null): Counters => {
  const score = categoryScore ?? 0.5;

  return {
    likeCount: score * PRIOR_WEIGHT,
    dislikeCount: (1 - score) * PRIOR_WEIGHT,
  };
};

export const sampleWeight = ({
  score,
  affinity,
  affinityWeight,
}: {
  score: number;
  affinity: number;
  affinityWeight: number;
}): number => Math.max(score + affinityWeight * affinity, MIN_SAMPLE_WEIGHT);

/**
 * Roulette-wheel selection: pool is small (candidate-pool-sized), O(n*count) is fine.
 */
export const weightedSampleWithoutReplacement = <T>({
  items,
  weightOf,
  count,
  random = Math.random,
}: {
  items: readonly T[];
  weightOf: (item: T) => number;
  count: number;
  random?: () => number;
}): T[] => {
  const pool = items.map((item) => ({ item, weight: weightOf(item) }));
  const picked: T[] = [];

  while (picked.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let threshold = random() * totalWeight;
    let index = 0;

    while (index < pool.length - 1 && threshold > pool[index]!.weight) {
      threshold -= pool[index]!.weight;
      index += 1;
    }

    picked.push(pool[index]!.item);
    pool.splice(index, 1);
  }

  return picked;
};
