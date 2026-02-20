import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, ChannelModel, connect } from 'amqplib';

@Injectable()
export class RabbitmqPublisherService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(RabbitmqPublisherService.name);
  private connection?: ChannelModel;
  private channel?: Channel;
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
      this.channel = await this.connection.createChannel();
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
          'Erreur RabbitMQ publisher',
          error instanceof Error ? error.stack : undefined,
        );
      });

      this.logger.log(
        `RabbitMQ publisher connecté sur ${this.rabbitUrl} (${this.exchange})`,
      );
    } catch (error) {
      this.logger.error(
        'Connexion RabbitMQ impossible. Les events billing ne seront pas publiés.',
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

  publish(routingKey: string, payload: Record<string, unknown>) {
    if (!this.channel) {
      this.logger.warn(
        `Event non publié (channel indisponible): ${routingKey}`,
      );
      return;
    }

    this.channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: 'application/json',
      },
    );
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
