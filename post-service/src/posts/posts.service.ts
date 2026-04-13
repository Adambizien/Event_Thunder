import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PostStatus,
  PostTargetStatus,
  SocialNetwork,
  type Post,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { RabbitmqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';
import { readSecret } from '../utils/secret.util';

type UserLookup = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  private readonly userServiceUrl: string;
  private readonly frontendUrl: string;
  private readonly cronSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmqPublisher: RabbitmqPublisherService,
  ) {
    this.userServiceUrl =
      process.env.USER_SERVICE_URL ?? 'http://user-service:3000';
    this.frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    this.cronSecret = readSecret('POST_CRON_SECRET') ?? '';
  }

  async create(userId: string, dto: CreatePostDto) {
    const scheduledAt = dto.scheduled_at
      ? new Date(dto.scheduled_at)
      : undefined;
    if (dto.scheduled_at && Number.isNaN(scheduledAt?.getTime())) {
      throw new BadRequestException('Date de planification invalide');
    }

    if (scheduledAt && scheduledAt <= new Date()) {
      throw new BadRequestException(
        'La date planifiee doit etre dans le futur',
      );
    }

    const status = scheduledAt ? PostStatus.scheduled : PostStatus.draft;

    return this.prisma.post.create({
      data: {
        user_id: userId,
        event_id: dto.event_id,
        content: dto.content,
        status,
        scheduled_at: scheduledAt,
        targets: {
          create: dto.networks.map((network) => ({
            network,
            status: PostTargetStatus.pending,
          })),
        },
      },
      include: {
        targets: true,
      },
    });
  }

  listMine(userId: string) {
    return this.prisma.post.findMany({
      where: { user_id: userId },
      include: {
        targets: true,
        reminders: {
          orderBy: {
            created_at: 'desc',
          },
          take: 3,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  listPublic() {
    return this.prisma.post.findMany({
      where: {
        status: PostStatus.published,
      },
      include: {
        targets: true,
      },
      orderBy: {
        published_at: 'desc',
      },
    });
  }

  async getOne(postId: string, userId?: string, userRole?: string) {
    const post = await this.prisma.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        targets: true,
        reminders: {
          orderBy: {
            created_at: 'desc',
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post introuvable');
    }

    const isOwner = userId === post.user_id;
    const isAdmin = userRole === 'Admin';

    if (!isOwner && !isAdmin && post.status !== PostStatus.published) {
      throw new ForbiddenException('Post inaccessible');
    }

    return post;
  }

  async triggerDuePostConfirmations(secret?: string) {
    if (!this.cronSecret || secret !== this.cronSecret) {
      throw new ForbiddenException('Secret cron invalide');
    }

    const now = new Date();
    const duePosts = await this.prisma.post.findMany({
      where: {
        status: PostStatus.scheduled,
        scheduled_at: {
          lte: now,
        },
      },
      include: {
        targets: true,
      },
      orderBy: {
        scheduled_at: 'asc',
      },
      take: 50,
    });

    let sent = 0;
    for (const post of duePosts) {
      const result = await this.sendConfirmationEmail(post);
      if (result) {
        sent += 1;
      }
    }

    return {
      scanned: duePosts.length,
      confirmationsSent: sent,
      at: now.toISOString(),
    };
  }

  async confirmPublication(postId: string, token: string) {
    const tokenHash = this.hashToken(token);

    const dbToken = await this.prisma.postConfirmationToken.findFirst({
      where: {
        post_id: postId,
        token_hash: tokenHash,
        consumed_at: null,
      },
      include: {
        post: {
          include: {
            targets: true,
          },
        },
      },
    });

    if (!dbToken) {
      throw new BadRequestException('Token de confirmation invalide ou expire');
    }

    const now = new Date();
    if (dbToken.expires_at <= now) {
      await this.cancelPostFromToken(
        dbToken.id,
        dbToken.post.id,
        'Annule automatiquement: token de confirmation expire',
      );
      throw new BadRequestException(
        'Token de confirmation expire. Publication annulee.',
      );
    }

    const xIntentUrl = this.buildXIntentUrl(dbToken.post.content);

    return {
      post: dbToken.post,
      message:
        'Confirmation validee. Choisis ensuite Publier sur X ou Annuler.',
      xIntentUrl,
    };
  }

  async publishManual(postId: string, token: string) {
    const tokenHash = this.hashToken(token);
    const dbToken = await this.prisma.postConfirmationToken.findFirst({
      where: {
        post_id: postId,
        token_hash: tokenHash,
        consumed_at: null,
      },
      include: {
        post: {
          include: {
            targets: true,
          },
        },
      },
    });

    if (!dbToken) {
      throw new BadRequestException('Token de confirmation invalide ou expire');
    }

    const now = new Date();
    if (dbToken.expires_at <= now) {
      await this.cancelPostFromToken(
        dbToken.id,
        dbToken.post.id,
        'Annule automatiquement: token de confirmation expire',
      );
      throw new BadRequestException(
        'Token de confirmation expire. Publication annulee.',
      );
    }

    await this.prisma.postConfirmationToken.update({
      where: { id: dbToken.id },
      data: { consumed_at: now },
    });

    await this.prisma.post.update({
      where: { id: dbToken.post.id },
      data: {
        status: PostStatus.published,
        published_at: now,
      },
    });

    await this.prisma.postTarget.updateMany({
      where: { post_id: dbToken.post.id },
      data: {
        status: PostTargetStatus.published,
        published_at: now,
        external_post_id: 'manual_x_publish',
        error_message: null,
      },
    });

    return {
      message: 'Post marque comme envoye. Redirection vers X.',
      xIntentUrl: this.buildXIntentUrl(dbToken.post.content),
    };
  }

  async cancelManual(postId: string, token: string) {
    const tokenHash = this.hashToken(token);
    const dbToken = await this.prisma.postConfirmationToken.findFirst({
      where: {
        post_id: postId,
        token_hash: tokenHash,
        consumed_at: null,
      },
    });

    if (!dbToken) {
      throw new BadRequestException('Token de confirmation invalide ou expire');
    }

    await this.cancelPostFromToken(
      dbToken.id,
      postId,
      'Annule manuellement depuis la page de confirmation',
    );

    return { message: 'Publication annulee.' };
  }

  async deleteMine(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, user_id: true, status: true },
    });

    if (!post) {
      throw new NotFoundException('Post introuvable');
    }

    if (post.user_id !== userId) {
      throw new ForbiddenException('Suppression non autorisee');
    }

    if (
      post.status === PostStatus.published ||
      post.status === PostStatus.archived
    ) {
      throw new BadRequestException(
        'Seuls les posts non publies peuvent etre supprimes',
      );
    }

    await this.prisma.post.delete({ where: { id: postId } });

    return { message: 'Post supprime' };
  }

  private async sendConfirmationEmail(
    post: Post & { targets: { network: SocialNetwork }[] },
  ) {
    const existingReminder = await this.prisma.postReminder.findFirst({
      where: {
        post_id: post.id,
        status: 'sent',
      },
    });

    if (existingReminder) {
      return false;
    }

    const user = await this.fetchUser(post.user_id);
    if (!user?.email) {
      this.logger.warn(
        `Impossible d'envoyer la confirmation: email manquant pour ${post.user_id}`,
      );
      return false;
    }

    const rawToken = randomBytes(24).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.postConfirmationToken.create({
      data: {
        post_id: post.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    await this.prisma.postReminder.create({
      data: {
        post_id: post.id,
        reminder_at: new Date(),
        message: 'Email de confirmation envoye',
        status: 'sent',
        sent_at: new Date(),
      },
    });

    const confirmUrl = `${this.frontendUrl.replace(/\/$/, '')}/posts/confirm?postId=${encodeURIComponent(post.id)}&token=${encodeURIComponent(rawToken)}`;

    await this.rabbitmqPublisher.publishWithRetry(
      'post.mail.confirmation.requested',
      {
        email: user.email,
        username: this.resolveUsername(user),
        postId: post.id,
        confirmationUrl: confirmUrl,
        scheduledAt: post.scheduled_at?.toISOString(),
        networks: post.targets.map((target) => target.network),
        contentPreview: post.content.slice(0, 180),
      },
    );

    await this.prisma.post.update({
      where: {
        id: post.id,
      },
      data: {
        status: PostStatus.awaiting_confirmation,
      },
    });

    return true;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async fetchUser(userId: string): Promise<UserLookup | null> {
    try {
      const response = await fetch(
        `${this.userServiceUrl}/api/users/${userId}`,
      );
      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        user?: {
          id?: string;
          email?: string;
          firstName?: string;
          lastName?: string;
        };
      };

      if (!payload.user?.id) {
        return null;
      }

      return {
        id: payload.user.id,
        email: payload.user.email,
        firstName: payload.user.firstName,
        lastName: payload.user.lastName,
      };
    } catch {
      return null;
    }
  }

  private resolveUsername(user: UserLookup) {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (fullName.length > 0) {
      return fullName;
    }

    if (user.email) {
      return user.email.split('@')[0];
    }

    return `Utilisateur ${user.id.slice(0, 8)}`;
  }

  private buildXIntentUrl(content: string): string {
    const params = new URLSearchParams({ text: content });
    return `https://twitter.com/intent/tweet?${params.toString()}`;
  }

  private async cancelPostFromToken(
    tokenId: string,
    postId: string,
    reason: string,
  ) {
    const now = new Date();

    await this.prisma.postConfirmationToken.update({
      where: { id: tokenId },
      data: { consumed_at: now },
    });

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.archived,
        published_at: null,
      },
    });

    await this.prisma.postTarget.updateMany({
      where: { post_id: postId },
      data: {
        status: PostTargetStatus.cancelled,
        published_at: null,
        external_post_id: null,
        error_message: reason.slice(0, 255),
      },
    });
  }
}
