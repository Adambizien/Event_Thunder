import api from './api';
import type { CommentItem, ToggleCommentLikeResponse } from '../types/CommentTypes';

export const commentService = {
  async fetchByEvent(eventId: string): Promise<CommentItem[]> {
    const response = await api.get(`/api/comments/events/${eventId}`);
    const data = response.data;
    return Array.isArray(data) ? (data as CommentItem[]) : [];
  },

  async create(eventId: string, content: string): Promise<CommentItem> {
    const response = await api.post(`/api/comments/events/${eventId}`, {
      content,
    });
    return response.data as CommentItem;
  },

  async toggleLike(commentId: string): Promise<ToggleCommentLikeResponse> {
    const response = await api.post(`/api/comments/${commentId}/likes/toggle`);
    return response.data as ToggleCommentLikeResponse;
  },

  async fetchCountByEvent(eventId: string): Promise<number> {
    const response = await api.get(`/api/comments/events/${eventId}/count`);
    const count = (response.data as { count?: unknown })?.count;
    return typeof count === 'number' ? count : 0;
  },

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/api/comments/${commentId}`);
  },
};