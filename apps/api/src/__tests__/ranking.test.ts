import { describe, expect, it } from "vitest";
import {
  decayFactor,
  laplaceScore,
  nextAffinity,
  nextDecayedCounters,
  priorPostCounters,
  reverseAffinity,
  reverseDecayedCounters,
  sampleWeight,
  weightedSampleWithoutReplacement,
} from "@/ranking";

describe("laplaceScore", () => {
  it("is 0.5 for a zero-vote post", () => {
    expect(laplaceScore(0, 0)).toBe(0.5);
  });

  it("rises with likes, falls with dislikes", () => {
    expect(laplaceScore(10, 0)).toBeGreaterThan(0.5);
    expect(laplaceScore(0, 10)).toBeLessThan(0.5);
  });
});

describe("decayFactor", () => {
  it("is 1 with no elapsed time", () => {
    expect(decayFactor(0)).toBe(1);
  });

  it("halves exactly at one half-life", () => {
    expect(decayFactor(168)).toBeCloseTo(0.5);
  });

  it("reduces stale engagement's weight over time", () => {
    expect(decayFactor(24)).toBeGreaterThan(decayFactor(24 * 30));
  });
});

describe("nextDecayedCounters", () => {
  const now = new Date("2026-07-10T12:00:00Z");

  it("decays old counts before applying the new vote", () => {
    const scoreUpdatedAt = new Date("2026-07-03T12:00:00Z");
    const result = nextDecayedCounters({
      counters: { likeCount: 10, dislikeCount: 0 },
      scoreUpdatedAt,
      now,
      direction: "LIKE",
    });

    expect(result.likeCount).toBeCloseTo(6, 0);
    expect(result.score).toBeCloseTo(laplaceScore(result.likeCount, 0));
  });

  it("SKIP still decays but does not add a vote", () => {
    const result = nextDecayedCounters({
      counters: { likeCount: 4, dislikeCount: 4 },
      scoreUpdatedAt: now,
      now,
      direction: "SKIP",
    });

    expect(result.likeCount).toBeCloseTo(4);
    expect(result.dislikeCount).toBeCloseTo(4);
  });
});

describe("nextAffinity", () => {
  const now = new Date("2026-07-10T12:00:00Z");

  it("nudges up on LIKE, down on DISLIKE, unchanged on SKIP", () => {
    expect(
      nextAffinity({ affinity: 0, updatedAt: now, now, direction: "LIKE" }),
    ).toBe(1);
    expect(
      nextAffinity({ affinity: 0, updatedAt: now, now, direction: "DISLIKE" }),
    ).toBe(-1);
    expect(
      nextAffinity({ affinity: 0, updatedAt: now, now, direction: "SKIP" }),
    ).toBe(0);
  });

  it("only nudges this user's own affinity, independent of any post score", () => {
    const affinity = nextAffinity({
      affinity: 0,
      updatedAt: now,
      now,
      direction: "LIKE",
    });

    expect(affinity).toBe(1);
  });
});

describe("reverseDecayedCounters", () => {
  const t0 = new Date("2026-07-01T12:00:00Z");
  const t1 = new Date("2026-07-05T12:00:00Z");
  const t2 = new Date("2026-07-10T12:00:00Z");

  it("removes the old contribution with zero residue when nothing else touched the aggregate — same result as a fresh vote recorded now (ADR 0012)", () => {
    const afterOriginalLike = nextDecayedCounters({
      counters: { likeCount: 0, dislikeCount: 0 },
      scoreUpdatedAt: t0,
      now: t1,
      direction: "LIKE",
    });

    const afterEdit = reverseDecayedCounters({
      counters: afterOriginalLike,
      scoreUpdatedAt: t1,
      now: t2,
      oldDirection: "LIKE",
      oldEffectiveAt: t1,
      newDirection: "DISLIKE",
    });

    /**
     * The new direction's own contribution is never decayed — it just
     * started, exactly like a brand-new swipe (`nextDecayedCounters` never
     * decays the delta it adds either). Only pre-existing aggregate state
     * decays; here there was none left once the old LIKE was fully removed.
     */
    const asIfFreshDislikeNow = nextDecayedCounters({
      counters: { likeCount: 0, dislikeCount: 0 },
      scoreUpdatedAt: t2,
      now: t2,
      direction: "DISLIKE",
    });

    expect(afterEdit.likeCount).toBeCloseTo(asIfFreshDislikeNow.likeCount);
    expect(afterEdit.dislikeCount).toBeCloseTo(
      asIfFreshDislikeNow.dislikeCount,
    );
    expect(afterEdit.score).toBeCloseTo(asIfFreshDislikeNow.score);
  });

  it("removes only the edited swipe's own contribution, leaving other swipes on the aggregate untouched", () => {
    const afterOriginalLike = nextDecayedCounters({
      counters: { likeCount: 0, dislikeCount: 0 },
      scoreUpdatedAt: t0,
      now: t1,
      direction: "LIKE",
    });
    const afterAnotherUsersLike = nextDecayedCounters({
      counters: afterOriginalLike,
      scoreUpdatedAt: t1,
      now: t1,
      direction: "LIKE",
    });

    const afterEdit = reverseDecayedCounters({
      counters: afterAnotherUsersLike,
      scoreUpdatedAt: t1,
      now: t2,
      oldDirection: "LIKE",
      oldEffectiveAt: t1,
      newDirection: "DISLIKE",
    });

    /**
     * Only the edited swipe's own LIKE (recorded at t1) is removed — the
     * other user's LIKE, recorded at the same t1, keeps decaying forward to
     * t2 exactly as it would have without any edit.
     */
    const otherLikeDecayedToNow = decayFactor(
      (t2.getTime() - t1.getTime()) / (1000 * 60 * 60),
    );
    expect(afterEdit.likeCount).toBeCloseTo(otherLikeDecayedToNow);
    expect(afterEdit.dislikeCount).toBeCloseTo(1);
  });

  it("SKIP carries zero weight on either side of an edit", () => {
    const counters = { likeCount: 3, dislikeCount: 2 };

    const skipToLike = reverseDecayedCounters({
      counters,
      scoreUpdatedAt: t1,
      now: t1,
      oldDirection: "SKIP",
      oldEffectiveAt: t1,
      newDirection: "LIKE",
    });
    const plainLike = nextDecayedCounters({
      counters,
      scoreUpdatedAt: t1,
      now: t1,
      direction: "LIKE",
    });

    expect(skipToLike.likeCount).toBeCloseTo(plainLike.likeCount);
    expect(skipToLike.dislikeCount).toBeCloseTo(plainLike.dislikeCount);
  });

  it("same-direction reversal is NOT itself a no-op — the router must special-case it", () => {
    const counters = { likeCount: 5, dislikeCount: 0 };

    const result = reverseDecayedCounters({
      counters,
      scoreUpdatedAt: t0,
      now: t2,
      oldDirection: "LIKE",
      oldEffectiveAt: t1,
      newDirection: "LIKE",
    });

    expect(result.likeCount).not.toBeCloseTo(counters.likeCount);
  });
});

describe("reverseAffinity", () => {
  const t1 = new Date("2026-07-05T12:00:00Z");
  const t2 = new Date("2026-07-10T12:00:00Z");

  it("flips this user's own affinity nudge on a Like ↔ Dislike edit", () => {
    const afterLike = nextAffinity({
      affinity: 0,
      updatedAt: t1,
      now: t1,
      direction: "LIKE",
    });

    const afterEdit = reverseAffinity({
      affinity: afterLike,
      updatedAt: t1,
      now: t1,
      oldDirection: "LIKE",
      oldEffectiveAt: t1,
      newDirection: "DISLIKE",
    });

    expect(afterEdit).toBeCloseTo(-1);
  });

  it("removes the old contribution with zero residue when nothing else touched the row — same result as a fresh vote recorded now", () => {
    const afterLike = nextAffinity({
      affinity: 0,
      updatedAt: t1,
      now: t1,
      direction: "LIKE",
    });

    const afterEdit = reverseAffinity({
      affinity: afterLike,
      updatedAt: t1,
      now: t2,
      oldDirection: "LIKE",
      oldEffectiveAt: t1,
      newDirection: "DISLIKE",
    });

    const asIfFreshDislikeNow = nextAffinity({
      affinity: 0,
      updatedAt: t2,
      now: t2,
      direction: "DISLIKE",
    });

    expect(afterEdit).toBeCloseTo(asIfFreshDislikeNow);
  });
});

describe("priorPostCounters", () => {
  it("falls back to 0.5 for a category with no stats yet", () => {
    const { likeCount, dislikeCount } = priorPostCounters(null);
    expect(laplaceScore(likeCount, dislikeCount)).toBe(0.5);
  });

  it("blends toward a known category score", () => {
    const { likeCount, dislikeCount } = priorPostCounters(0.8);
    expect(laplaceScore(likeCount, dislikeCount)).toBeGreaterThan(0.5);
    expect(laplaceScore(likeCount, dislikeCount)).toBeLessThan(0.8);
  });
});

describe("weightedSampleWithoutReplacement", () => {
  it("draws a higher-weight item more often across repeated samples", () => {
    const items = [
      { id: "high", weight: 0.9 },
      { id: "low", weight: 0.1 },
    ];
    let highFirst = 0;
    const trials = 500;

    for (let trial = 0; trial < trials; trial += 1) {
      const [first] = weightedSampleWithoutReplacement({
        items,
        weightOf: (item) => item.weight,
        count: 1,
      });
      if (first?.id === "high") {
        highFirst += 1;
      }
    }

    expect(highFirst).toBeGreaterThan(trials * 0.6);
    expect(highFirst).toBeLessThan(trials);
  });

  it("is not deterministic — the low-weight item still wins sometimes", () => {
    const items = [
      { id: "high", weight: 0.9 },
      { id: "low", weight: 0.1 },
    ];
    const wins = new Set<string>();

    for (let trial = 0; trial < 200; trial += 1) {
      const [first] = weightedSampleWithoutReplacement({
        items,
        weightOf: (item) => item.weight,
        count: 1,
      });
      if (first) {
        wins.add(first.id);
      }
    }

    expect(wins.has("low")).toBe(true);
  });

  it("returns every item exactly once when count equals the pool size", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const picked = weightedSampleWithoutReplacement({
      items,
      weightOf: () => 1,
      count: items.length,
    });

    expect(picked.map((item) => item.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("sampleWeight", () => {
  it("floors at MIN_SAMPLE_WEIGHT instead of going to zero or negative", () => {
    const weight = sampleWeight({
      score: 0.01,
      affinity: -10,
      affinityWeight: 0.15,
    });
    expect(weight).toBeGreaterThan(0);
  });
});
