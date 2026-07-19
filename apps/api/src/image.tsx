import { ImageResponse } from "next/og";

export const OG_IMAGE_WIDTH = 1080;
export const OG_IMAGE_HEIGHT = 1350;

const GRADIENTS: readonly (readonly [string, string])[] = [
  ["#6366f1", "#8b5cf6"],
  ["#0ea5e9", "#22d3ee"],
  ["#f97316", "#f43f5e"],
  ["#10b981", "#0ea5e9"],
  ["#ec4899", "#f97316"],
  ["#a855f7", "#6366f1"],
];

/**
 * Deterministic per-post visual variety; `category` is a backend-only signal
 * (see docs/inbox/2026-07-19-multi-category-posts.md) and is never rendered
 * as text, only used to pick a gradient.
 */
const gradientFor = (seed: string): readonly [string, string] => {
  const index =
    seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    GRADIENTS.length;

  return GRADIENTS[index]!;
};

export const renderTypographicCard = ({
  content,
  category,
}: {
  content: string;
  category: string;
}): ImageResponse => {
  const [from, to] = gradientFor(category);

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px",
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      <div
        style={{
          color: "white",
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1.3,
          textAlign: "center",
        }}
      >
        {content}
      </div>
    </div>,
    {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      headers: { "Cache-Control": "public, immutable, max-age=31536000" },
    },
  );
};
