import { db } from "@/clients/db";
import { renderTypographicCard } from "@/image";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
): Promise<Response> => {
  const { postId } = await params;
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { content: true, category: true },
  });

  if (!post) {
    return new Response("Not found", { status: 404 });
  }

  return renderTypographicCard(post);
};
