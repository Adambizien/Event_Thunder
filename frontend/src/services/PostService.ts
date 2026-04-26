import api from './api';
import type {
  CreatePostPayload,
  GeneratePostTextPayload,
  GeneratePostTextResponse,
  PostItem,
  UpdatePostPayload,
} from '../types/PostTypes';

export const postService = {
  async fetchMyPosts(): Promise<PostItem[]> {
    const response = await api.get('/api/posts');
    const data = response.data;
    return Array.isArray(data) ? (data as PostItem[]) : [];
  },

  async fetchAdminPosts(): Promise<PostItem[]> {
    const response = await api.get('/api/posts/admin');
    const data = response.data;
    return Array.isArray(data) ? (data as PostItem[]) : [];
  },

  async createPost(payload: CreatePostPayload): Promise<PostItem> {
    const response = await api.post('/api/posts', payload);
    return response.data as PostItem;
  },

  async updatePost(postId: string, payload: UpdatePostPayload): Promise<PostItem> {
    const response = await api.patch(`/api/posts/${postId}`, payload);
    return response.data as PostItem;
  },

  async confirmPost(postId: string, token: string): Promise<{
    message: string;
    post: PostItem;
    intentUrl?: string;
    intentNetwork?: 'x' | 'facebook';
    xIntentUrl?: string;
  }> {
    const response = await api.post(`/api/posts/${postId}/confirm`, { token });
    return response.data as {
      message: string;
      post: PostItem;
      intentUrl?: string;
      intentNetwork?: 'x' | 'facebook';
      xIntentUrl?: string;
    };
  },

  async publishPostManual(postId: string, token: string): Promise<{
    message?: string;
    intentUrl?: string;
    intentNetwork?: 'x' | 'facebook';
    xIntentUrl?: string;
  }> {
    const response = await api.post(`/api/posts/${postId}/publish-manual`, {
      token,
    });
    return response.data as {
      message?: string;
      intentUrl?: string;
      intentNetwork?: 'x' | 'facebook';
      xIntentUrl?: string;
    };
  },

  async cancelPostManual(postId: string, token: string): Promise<{
    message?: string;
  }> {
    const response = await api.post(`/api/posts/${postId}/cancel-manual`, {
      token,
    });
    return response.data as { message?: string };
  },

  async deletePost(postId: string): Promise<{ message?: string }> {
    const response = await api.delete(`/api/posts/${postId}`);
    return response.data as { message?: string };
  },

  async generatePostText(
    payload: GeneratePostTextPayload,
  ): Promise<GeneratePostTextResponse> {
    const response = await api.post('/api/posts/generate-text', payload);
    return response.data as GeneratePostTextResponse;
  },

};
