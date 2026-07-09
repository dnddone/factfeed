export type Post = {
  id: string;
  content: string;
  imageUrl: string;
  createdAt: string;
};

export type FeedItem = Post & {
  likedByUser: boolean;
};
