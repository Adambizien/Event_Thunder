import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelModel, ConfirmChannel, connect } from 'amqplib';

@Injectable()
export class RabbitmqPublisherService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(RabbitmqPublisherService.name);
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private readonly exchange: string;
  private readonly rabbitUrl: string;
  private readonly retryDelayMs: number;
  private reconnectTimer?: NodeJS.Timeout;
  private connecting = false;

  constructor(private readonly configService: ConfigService) {
    this.exchange =
      this.configService.get<string>('RABBITMQ_EXCHANGE') ?? 'billing.events';
    this.rabbitUrl =
      this.configService.get<string>('RABBITMQ_URL') ?? 'amqp://rabbitmq:5672';
    this.retryDelayMs = Number(
      this.configService.get<string>('RABBITMQ_RETRY_DELAY_MS') ?? 5000,
    );
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry() {
    if (this.connecting || this.channel) {
      return;
    }

    this.connecting = true;
    try {
      this.connection = await connect(this.rabbitUrl);
      this.channel = await this.connection.createConfirmChannel();
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });

      this.connection.on('close', () => {
        this.logger.warn('Connexion RabbitMQ fermée. Reconnexion...');
        this.channel = undefined;
        this.connection = undefined;
        this.scheduleReconnect();
      });

      this.connection.on('error', (error) => {
        this.logger.error(
          'Erreur RabbitMQ publisher post-service',
          error instanceof Error ? error.stack : undefined,
        );
      });
    } catch (error) {
      this.logger.error(
        'Connexion RabbitMQ impossible. Les mails de confirmation ne seront pas publiés.',
        error instanceof Error ? error.stack : undefined,
      );
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connectWithRetry();
    }, this.retryDelayMs);
  }

  async publishWithRetry(
    routingKey: string,
    payload: Record<string, unknown>,
    maxAttempts = 3,
  ): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.publish(routingKey, payload);
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Echec publication ${routingKey} (tentative ${attempt}/${maxAttempts})`,
        );
        await this.connectWithRetry();

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Publication impossible: ${routingKey}`);
  }

  private async publish(
    routingKey: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const channel = this.channel;
    if (!channel) {
      throw new Error(`Event non publie (channel indisponible): ${routingKey}`);
    }

    await new Promise<void>((resolve, reject) => {
      channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: true,
          contentType: 'application/json',
        },
        (error) => {
          if (error) {
            reject(
              error instanceof Error
                ? error
                : new Error(`Publication AMQP echouee: ${routingKey}`),
            );
            return;
          }
          resolve();
        },
      );
    });
  }

  async onApplicationShutdown() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    await this.channel?.close();
    await this.connection?.close();
  }
}
