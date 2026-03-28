import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import frenchBadwordsList from 'french-badwords-list';
import { PrismaService } from '../prisma/prisma.service';

type ProfanityFilter = {
  addWords: (...words: string[]) => void;
  clean: (input: string) => string;
};

type UserSummary = {
  id: string;
  firstName?: string;
  lastName?: string;
};

type LikedUser = UserSummary & {
  displayName: string;
};

type SerializedComment = {
  id: string;
  userId: string;
  user: UserSummary;
  authorDisplayName: string;
  eventId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  likedByCurrentUser: boolean;
  likedUserIds: string[];
  likedUsers: LikedUser[];
};

type ToggleLikeResponse = {
  commentId: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  likedUserIds: string[];
  likedUsers: LikedUser[];
};

type DeleteCommentResponse = {
  message: string;
};

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private profanityFilterPromise: Promise<ProfanityFilter> | null = null;

  private async getProfanityFilter(): Promise<ProfanityFilter> {
    if (this.profanityFilterPromise) {
      return this.profanityFilterPromise;
    }

    this.profanityFilterPromise = import('bad-words')
      .then((module) => {
        const FilterCtor = (module as { Filter: new (options?: { emptyList?: boolean; placeHolder?: string }) => ProfanityFilter }).Filter;
        const filter = new FilterCtor({
          placeHolder: '*',
        });

        const words = (frenchBadwordsList as { array?: unknown }).array;
        if (Array.isArray(words) && words.length > 0) {
          filter.addWords(
            ...words.filter((word): word is string => typeof word === 'string'),
          );
        }

        return filter;
      })
      .catch(() => {
        const words = (frenchBadwordsList as { array?: unknown }).array;
        const blocked = Array.isArray(words)
          ? words.filter((word): word is string => typeof word === 'string')
          : [];

        return {
          addWords: (...extraWords: string[]) => {
            blocked.push(...extraWords);
          },
          clean: (input: string) => {
            let output = input;
            blocked.forEach((word) => {
              const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
              output = output.replace(regex, (match) => '*'.repeat(match.length));
            });
            return output;
          },
        } satisfies ProfanityFilter;
      });

    return this.profanityFilterPromise;
  }

  private async sanitizeCommentContent(content: string): Promise<string> {
    const filter = await this.getProfanityFilter();
    return filter.clean(content);
  }

  private getUserServiceBaseUrl(): string {
    return process.env.USER_SERVICE_URL || 'http://user-service:3000';
  }

  private buildDisplayName(user: UserSummary): string {
    const firstName = user.firstName?.trim() || '';
    const lastName = user.lastName?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) {
      return fullName;
    }
    return `Utilisateur ${user.id.slice(0, 8)}`;
  }

  private async fetchUserById(userId: string): Promise<UserSummary | null> {
    try {
      const baseUrl = this.getUserServiceBaseUrl();
      const response = await fetch(`${baseUrl}/api/users/${userId}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        user?: {
          id?: string;
          firstName?: string | null;
          lastName?: string | null;
        };
      };

      if (!payload.user?.id) {
        return null;
      }

      return {
        id: payload.user.id,
        firstName: payload.user.firstName ?? undefined,
        lastName: payload.user.lastName ?? undefined,
      };
    } catch {
      return null;
    }
  }

  private async buildUsersMap(userIds: string[]): Promise<Map<string, UserSummary>> {
    const uniqueUserIds = Array.from(new Set(userIds));
    const users = await Promise.all(
      uniqueUserIds.map((userId) => this.fetchUserById(userId)),
    );

    const map = new Map<string, UserSummary>();

    uniqueUserIds.forEach((userId, index) => {
      const user = users[index];
      if (user) {
        map.set(userId, user);
        return;
      }

      map.set(userId, { id: userId });
    });

    return map;
  }

  private resolveUser(userId: string, usersMap: Map<string, UserSummary>): UserSummary {
    return usersMap.get(userId) || { id: userId };
  }

  private buildLikedUsers(
    likedUserIds: string[],
    usersMap: Map<string, UserSummary>,
  ): LikedUser[] {
    return likedUserIds.map((likedUserId) => {
      const likedUser = this.resolveUser(likedUserId, usersMap);
      return {
        ...likedUser,
        displayName: this.buildDisplayName(likedUser),
      };
    });
  }

  private serializeComment(
    comment: {
      id: string;
      user_id: string;
      event_id: string;
      content: string;
      created_at: Date;
      updated_at: Date;
      comment_likes: Array<{ user_id: string }>;
    },
    usersMap: Map<string, UserSummary>,
    currentUserId?: string,
  ): SerializedComment {
    const likedUserIds = comment.comment_likes.map((like) => like.user_id);
    const author = this.resolveUser(comment.user_id, usersMap);
    return {
      id: comment.id,
      userId: comment.user_id,
      user: author,
      authorDisplayName: this.buildDisplayName(author),
      eventId: comment.event_id,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      likeCount: likedUserIds.length,
      likedByCurrentUser: currentUserId
        ? likedUserIds.includes(currentUserId)
        : false,
      likedUserIds,
      likedUsers: this.buildLikedUsers(likedUserIds, usersMap),
    };
  }

  async getByEvent(eventId: string, currentUserId?: string) {
    const comments = await this.prisma.comment.findMany({
      where: { event_id: eventId },
      include: {
        comment_likes: {
          select: {
            user_id: true,
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const allUserIds = comments.flatMap((comment) => [
      comment.user_id,
      ...comment.comment_likes.map((like) => like.user_id),
    ]);

    const usersMap = await this.buildUsersMap(allUserIds);

    return comments.map((comment) =>
      this.serializeComment(comment, usersMap, currentUserId),
    );
  }

  async getCountByEvent(eventId: string) {
    const count = await this.prisma.comment.count({
      where: {
        event_id: eventId,
      },
    });

    return { count };
  }

  async create(eventId: string, userId: string, content: string) {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new BadRequestException('Le commentaire ne peut pas être vide');
    }

    const censoredContent = await this.sanitizeCommentContent(trimmedContent);

    const comment = await this.prisma.comment.create({
      data: {
        event_id: eventId,
        user_id: userId,
        content: censoredContent,
      },
      include: {
        comment_likes: {
          select: {
            user_id: true,
          },
        },
      },
    });

    const usersMap = await this.buildUsersMap([comment.user_id]);

    return this.serializeComment(comment, usersMap, userId);
  }

  async toggleLike(commentId: string, userId: string): Promise<ToggleLikeResponse> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    if (!comment) {
      throw new NotFoundException('Commentaire introuvable');
    }

    const existingLike = await this.prisma.commentLike.findFirst({
      where: {
        comment_id: commentId,
        user_id: userId,
      },
    });

    if (existingLike) {
      await this.prisma.commentLike.delete({
        where: { id: existingLike.id },
      });
    } else {
      await this.prisma.commentLike.create({
        data: {
          comment_id: commentId,
          user_id: userId,
        },
      });
    }

    const [likeCount, likes] = await Promise.all([
      this.prisma.commentLike.count({
        where: {
          comment_id: commentId,
        },
      }),
      this.prisma.commentLike.findMany({
        where: {
          comment_id: commentId,
        },
        select: {
          user_id: true,
        },
        orderBy: {
          created_at: 'asc',
        },
      }),
    ]);

    const likedUserIds = likes.map((like) => like.user_id);
    const usersMap = await this.buildUsersMap(likedUserIds);

    return {
      commentId,
      likeCount,
      likedByCurrentUser: !existingLike,
      likedUserIds,
      likedUsers: this.buildLikedUsers(likedUserIds, usersMap),
    };
  }

  async deleteComment(commentId: string): Promise<DeleteCommentResponse> {
    const existingComment = await this.prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        id: true,
      },
    });

    if (!existingComment) {
      throw new NotFoundException('Commentaire introuvable');
    }

    await this.prisma.comment.delete({
      where: {
        id: commentId,
      },
    });

    return { message: 'Commentaire supprimé avec succès' };
  }
}