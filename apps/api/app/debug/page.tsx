import type { JSX } from "react";
import { db } from "@/clients/db";

export const dynamic = "force-dynamic";

const DEBUG_POST_LIMIT = 50;

const DebugPage = async (): Promise<JSX.Element> => {
  const posts = await db.post.findMany({
    orderBy: { createdAt: "desc" },
    take: DEBUG_POST_LIMIT,
  });

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>factfeed debug — latest {posts.length} posts</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {posts.map((post) => (
          <div
            key={post.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {post.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.imageUrl}
                alt=""
                style={{
                  width: "100%",
                  aspectRatio: "4 / 5",
                  objectFit: "cover",
                }}
              />
            )}
            <div style={{ padding: 12 }}>
              <p style={{ fontSize: 14 }}>{post.content}</p>
              <p style={{ fontSize: 12, color: "#666" }}>
                {post.category} · score {post.score.toFixed(2)} · 👍{" "}
                {post.likeCount} 👎 {post.dislikeCount} · seen {post.seenCount}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};

export default DebugPage;
