export type SocialNetwork = 'x';

export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'awaiting_confirmation'
  | 'published'
  | 'archived';

export type PostTargetStatus = 'pending' | 'published' | 'failed' | 'cancelled';

export type PostTarget = {
  id: string;
  post_id: string;
  network: SocialNetwork;
  status: PostTargetStatus;
  external_post_id?: string | null;
  error_message?: string | null;
  created_at: string;
  published_at?: string | null;
};

export type PostReminder = {
  id: string;
  post_id: string;
  reminder_at: string;
  message?: string | null;
  status: 'pending' | 'sent' | 'cancelled';
  created_at: string;
  sent_at?: string | null;
};

export type PostItem = {
  id: string;
  event_id?: string | null;
  user_id: string;
  content: string;
  status: PostStatus;
  scheduled_at?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  targets: PostTarget[];
  reminders?: PostReminder[];
};

export type CreatePostPayload = {
  event_id?: string;
  content: string;
  scheduled_at?: string;
  networks: SocialNetwork[];
};

export type UpdatePostPayload = {
  event_id?: string;
  content?: string;
  scheduled_at?: string;
  networks?: SocialNetwork[];
};
