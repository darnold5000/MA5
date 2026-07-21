export type CommunityPost = {
  id: string;
  authorUserId: string;
  authorName: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  isMine: boolean;
  replies: CommunityPost[];
};

export type CommunityBoardState = {
  posts: CommunityPost[];
};
