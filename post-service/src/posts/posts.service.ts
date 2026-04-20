import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GeneratePostTextDto } from './dto/generate-post-text.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { RabbitmqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';
import { readSecret } from '../utils/secret.util';

type UserLookup = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type PostForReminder = {
  id: string;
  user_id: string;
  event_id?: string | null;
  content: string;
  scheduled_at: Date | null;
  targets: Array<{ network: 'x' }>;
};

type EventLookup = {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  address?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  category?: {
    name?: string;
  };
};

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  private readonly userServiceUrl: string;
  private readonly eventServiceUrl: string;
  private readonly aiApiUrl: string;
  private readonly aiApiKey?: string;
  private readonly aiModel: string;
  private readonly frontendUrl: string;
  private readonly cronSecret: string;
  private readonly aiGenerationLimit = 5;
  private readonly aiGenerationWindowMs = 60 * 60 * 1000;
  private readonly aiGenerationHistory = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmqPublisher: RabbitmqPublisherService,
  ) {
    this.userServiceUrl =
      process.env.USER_SERVICE_URL ?? 'http://user-service:3000';
    this.eventServiceUrl =
      process.env.EVENT_SERVICE_URL ?? 'http://event-service:3000';
    this.aiApiUrl =
      process.env.AI_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions';
    this.aiApiKey = readSecret('AI_API_KEY');
    this.aiModel = process.env.AI_MODEL ?? 'llama-3.1-8b-instant';
    this.frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    this.cronSecret = readSecret('POST_CRON_SECRET') ?? '';
  }

  async generateText(
    userId: string,
    dto: GeneratePostTextDto,
    userRole?: string,
  ) {
    if (!this.aiApiKey) {
      throw new BadRequestException(
        'Generation IA indisponible: AI_API_KEY non configuree.',
      );
    }

    const quota = this.consumeAiQuota(userId);
    try {
      const event = dto.event_id
        ? await this.fetchEvent(dto.event_id, userId, userRole)
        : null;

      if (dto.event_id && !event) {
        throw new BadRequestException('Evenement introuvable ou inaccessible.');
      }

      const generatedText = await this.requestAiTextGeneration(dto.prompt, event);
      if (!generatedText) {
        throw new BadRequestException(
          'Impossible de generer un texte avec l IA pour le moment.',
        );
      }

      return {
        content: generatedText,
        remainingGenerations: quota.remaining,
        limit: this.aiGenerationLimit,
        availableAt: quota.availableAt,
      };
    } catch (error) {
      this.rollbackAiQuota(userId, quota.usedAt);
      throw error;
    }
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

    const status = scheduledAt ? 'scheduled' : 'draft';
    const contentWithEventLink = this.withEventLinkInContent(
      dto.content,
      dto.event_id,
    );

    return this.prisma.post.create({
      data: {
        user_id: userId,
        event_id: dto.event_id,
        content: contentWithEventLink,
        status,
        scheduled_at: scheduledAt,
        targets: {
          create: dto.networks.map((network) => ({
            network,
            status: 'pending',
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

  async listAllForAdmin() {
    const posts = await this.prisma.post.findMany({
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

    const uniqueUserIds = Array.from(
      new Set(posts.map((post) => post.user_id).filter(Boolean)),
    );

    const ownerEntries = await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const user = await this.fetchUser(userId);
        return [userId, user] as const;
      }),
    );

    const ownerById = new Map(ownerEntries);

    return posts.map((post) => ({
      ...post,
      owner: ownerById.get(post.user_id) ?? null,
    }));
  }

  listPublic() {
    return this.prisma.post.findMany({
      where: {
        status: 'published',
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

    if (!isOwner && !isAdmin && post.status !== 'published') {
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
        status: 'scheduled',
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
        'expired',
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
        'expired',
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
        status: 'published',
        published_at: now,
      },
    });

    await this.prisma.postTarget.updateMany({
      where: { post_id: dbToken.post.id },
      data: {
        status: 'published',
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
      'archived',
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

    if (post.status === 'published' || post.status === 'archived') {
      throw new BadRequestException(
        'Seuls les posts non publies peuvent etre supprimes',
      );
    }

    await this.prisma.post.delete({ where: { id: postId } });

    return { message: 'Post supprime' };
  }

  async updateMine(postId: string, userId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        user_id: true,
        status: true,
        content: true,
        event_id: true,
        scheduled_at: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post introuvable');
    }

    if (post.user_id !== userId) {
      throw new ForbiddenException('Modification non autorisee');
    }

    if (
      post.status === 'published' ||
      post.status === 'archived' ||
      post.status === 'awaiting_confirmation'
    ) {
      throw new BadRequestException('Ce post ne peut pas etre modifie');
    }

    const hasAnyUpdate =
      dto.content !== undefined ||
      dto.event_id !== undefined ||
      dto.scheduled_at !== undefined ||
      dto.networks !== undefined;

    if (!hasAnyUpdate) {
      throw new BadRequestException('Aucune modification fournie');
    }

    let nextScheduledAt = post.scheduled_at;
    if (dto.scheduled_at !== undefined) {
      if (dto.scheduled_at === null) {
        nextScheduledAt = null;
      } else {
        const scheduledAtDate = new Date(dto.scheduled_at);
        if (Number.isNaN(scheduledAtDate.getTime())) {
          throw new BadRequestException('Date de planification invalide');
        }

        if (scheduledAtDate <= new Date()) {
          throw new BadRequestException(
            'La date planifiee doit etre dans le futur',
          );
        }

        nextScheduledAt = scheduledAtDate;
      }
    }

    const nextStatus = nextScheduledAt ? 'scheduled' : 'draft';
    const nextContent = dto.content ?? post.content;

    if (!nextContent.trim()) {
      throw new BadRequestException('Le contenu du post est requis');
    }

    const nextEventId =
      dto.event_id === undefined ? post.event_id : dto.event_id;
    const contentWithEventLink = this.withEventLinkInContent(
      nextContent,
      nextEventId,
    );

    return this.prisma.$transaction(async (tx) => {
      if (dto.networks) {
        await tx.postTarget.deleteMany({ where: { post_id: postId } });
      }

      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: {
          content: contentWithEventLink,
          event_id: nextEventId,
          scheduled_at: nextScheduledAt,
          status: nextStatus,
          published_at: null,
          targets: dto.networks
            ? {
                create: dto.networks.map((network) => ({
                  network,
                  status: 'pending',
                })),
              }
            : undefined,
        },
        include: {
          targets: true,
        },
      });

      return updatedPost;
    });
  }

  private async sendConfirmationEmail(post: PostForReminder) {
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
        status: 'awaiting_confirmation',
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

  private buildEventUrl(eventId?: string | null): string | undefined {
    if (!eventId || eventId.trim().length === 0) {
      return undefined;
    }

    return `${this.frontendUrl.replace(/\/$/, '')}/events/${encodeURIComponent(eventId)}`;
  }

  private withEventLinkInContent(content: string, eventId?: string | null) {
    const eventUrl = this.buildEventUrl(eventId);
    if (!eventUrl) {
      return content;
    }

    if (content.includes(eventUrl)) {
      return content;
    }

    const trimmed = content.trimEnd();
    if (!trimmed) {
      return eventUrl;
    }

    return `${trimmed}\n\n${eventUrl}`;
  }

  private consumeAiQuota(userId: string) {
    const now = Date.now();
    const windowStart = now - this.aiGenerationWindowMs;
    const history = (this.aiGenerationHistory.get(userId) ?? []).filter(
      (timestamp) => timestamp >= windowStart,
    );

    if (history.length >= this.aiGenerationLimit) {
      const retryAt = history[0] + this.aiGenerationWindowMs;
      const retryInMinutes = Math.ceil((retryAt - now) / 60000);
      throw new BadRequestException(
        `Limite atteinte: ${this.aiGenerationLimit} generations par heure. Reessaie dans ${retryInMinutes} minute(s).`,
      );
    }

    history.push(now);
    this.aiGenerationHistory.set(userId, history);

    return {
      usedAt: now,
      remaining: this.aiGenerationLimit - history.length,
      availableAt: new Date(history[0] + this.aiGenerationWindowMs).toISOString(),
    };
  }

  private rollbackAiQuota(userId: string, usedAt: number) {
    const history = this.aiGenerationHistory.get(userId);
    if (!history || history.length === 0) {
      return;
    }

    const index = history.lastIndexOf(usedAt);
    if (index >= 0) {
      history.splice(index, 1);
    }

    if (history.length === 0) {
      this.aiGenerationHistory.delete(userId);
      return;
    }

    this.aiGenerationHistory.set(userId, history);
  }

  private async fetchEvent(
    eventId: string,
    userId?: string,
    userRole?: string,
  ): Promise<EventLookup | null> {
    try {
      const headers: Record<string, string> = {};
      if (userId) {
        headers['x-user-id'] = userId;
      }
      if (userRole) {
        headers['x-user-role'] = userRole;
      }

      const response = await fetch(`${this.eventServiceUrl}/api/events/${eventId}`, {
        headers,
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as EventLookup;
      if (!payload?.id) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private async requestAiTextGeneration(
    prompt: string,
    event: EventLookup | null,
  ): Promise<string | null> {
    const enrichedPrompt = this.buildAiPrompt(prompt, event);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.aiApiKey}`,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(this.aiApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.aiModel,
          messages: [
            {
              role: 'system',
              content:
                'Tu es un assistant de redaction de posts reseaux sociaux en francais. Retourne uniquement le texte final du post, sans explication.',
            },
            {
              role: 'user',
              content: enrichedPrompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 400,
        }),
        signal: controller.signal,
      });

      const raw = await response.text();
      if (!response.ok) {
        const parsedError = this.safeParseJson(raw);
        const providerMessage = this.extractProviderErrorMessage(parsedError, raw);
        this.logger.warn(
          `Provider IA en echec (status=${response.status}): ${providerMessage}`,
        );
        throw new BadRequestException(
          `Provider IA en erreur (${response.status}): ${providerMessage}`,
        );
      }

      const parsed = this.safeParseJson(raw);
      const output = this.extractGeneratedText(parsed, raw);
      if (!output) {
        return null;
      }

      return output.slice(0, 5000).trim();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        (error as { name?: string }).name === 'AbortError'
      ) {
        throw new BadRequestException(
          'Timeout du provider IA (plus de 20s). Reessaie dans quelques instants.',
        );
      }

      throw new BadRequestException(
        `Erreur reseau vers le provider IA: ${
          error instanceof Error ? error.message : 'inconnue'
        }`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractProviderErrorMessage(parsed: unknown, raw: string): string {
    if (parsed && typeof parsed === 'object') {
      const payload = parsed as Record<string, unknown>;
      const error = payload.error;
      if (error && typeof error === 'object') {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim().length > 0) {
          return message.trim();
        }
      }

      const message = payload.message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message.trim();
      }
    }

    const compact = raw.replace(/\s+/g, ' ').trim();
    if (compact.length === 0) {
      return 'reponse vide';
    }

    return compact.slice(0, 220);
  }

  private buildAiPrompt(prompt: string, event: EventLookup | null): string {
    const eventContext = event
      ? [
          `Titre: ${event.title ?? '-'}`,
          `Description: ${event.description ?? '-'}`,
          `Lieu: ${event.location ?? '-'}`,
          `Adresse: ${event.address ?? '-'}`,
          `Debut: ${event.start_date ?? '-'}`,
          `Fin: ${event.end_date ?? '-'}`,
          `Statut: ${event.status ?? '-'}`,
          `Categorie: ${event.category?.name ?? '-'}`,
          `Lien evenement: ${this.buildEventUrl(event.id) ?? '-'}`,
        ].join('\n')
      : 'Aucun evenement selectionne.';

    return [
      'Tu es un assistant de redaction pour des posts reseaux sociaux.',
      'Ecris en francais, ton naturel, clair et engageant.',
      'Retourne uniquement le texte final du post, sans explication.',
      '',
      `Demande utilisateur: ${prompt}`,
      '',
      'Contexte evenement:',
      eventContext,
    ].join('\n');
  }

  private safeParseJson(raw: string): unknown {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  private extractGeneratedText(parsed: unknown, fallbackRaw: string): string | null {
    if (typeof parsed === 'string' && parsed.trim().length > 0) {
      return parsed.trim();
    }

    if (parsed && typeof parsed === 'object') {
      const payload = parsed as Record<string, unknown>;
      const directKeys = ['text', 'content', 'result', 'output', 'message'];
      for (const key of directKeys) {
        const value = payload[key];
        if (typeof value === 'string' && value.trim().length > 0) {
          return value.trim();
        }
      }

      const choices = payload.choices;
      if (Array.isArray(choices)) {
        for (const choice of choices) {
          if (!choice || typeof choice !== 'object') {
            continue;
          }
          const content = (choice as { message?: { content?: unknown } }).message?.content;
          if (typeof content === 'string' && content.trim().length > 0) {
            return content.trim();
          }
          const text = (choice as { text?: unknown }).text;
          if (typeof text === 'string' && text.trim().length > 0) {
            return text.trim();
          }
        }
      }
    }

    if (fallbackRaw.trim().length > 0 && !fallbackRaw.trim().startsWith('{')) {
      return fallbackRaw.trim();
    }

    return null;
  }

  private async cancelPostFromToken(
    tokenId: string,
    postId: string,
    reason: string,
    nextStatus: 'archived' | 'expired',
  ) {
    const now = new Date();

    await this.prisma.postConfirmationToken.update({
      where: { id: tokenId },
      data: { consumed_at: now },
    });

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: nextStatus as any,
        published_at: null,
      },
    });

    await this.prisma.postTarget.updateMany({
      where: { post_id: postId },
      data: {
        status: 'cancelled',
        published_at: null,
        external_post_id: null,
        error_message: reason.slice(0, 255),
      },
    });
  }
}
