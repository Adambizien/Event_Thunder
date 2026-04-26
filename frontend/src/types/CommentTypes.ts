export type CommentUser = {
  id: string;
  firstName?: string;
  lastName?: string;
};

export type LikedUser = CommentUser & {
  displayName: string;
};

export type CommentItem = {
  id: string;
  userId: string;
  user: CommentUser;
  authorDisplayName: string;
  eventId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  likedUserIds: string[];
  likedUsers: LikedUser[];
};

export type ToggleCommentLikeResponse = {
  commentId: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  likedUserIds: string[];
  likedUsers: LikedUser[];
};