import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class RabbitmqConsumerService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(RabbitmqConsumerService.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private readonly rabbitUrl: string;
  private readonly exchange: string;
  private readonly queueName: string;
  private readonly routingKeys = [
    'billing.payment.succeeded',
    'billing.payment.failed',
    'billing.subscription.created',
    'billing.subscription.renewed',
    'billing.subscription.canceled',
  ];
  private readonly retryDelayMs: number;
  private reconnectTimer?: NodeJS.Timeout;
  private connecting = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {
    this.rabbitUrl =
      this.configService.get<string>('RABBITMQ_URL') ?? 'amqp://rabbitmq:5672';
    this.exchange =
      this.configService.get<string>('RABBITMQ_EXCHANGE') ?? 'billing.events';
    this.queueName =
      this.configService.get<string>('RABBITMQ_SUBSCRIPTION_QUEUE') ??
      'subscription-service.billing.events';
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
      await this.channel.assertQueue(this.queueName, { durable: true });

      for (const routingKey of this.routingKeys) {
        await this.channel.bindQueue(this.queueName, this.exchange, routingKey);
      }

      await this.channel.consume(this.queueName, (message) => {
        void this.handleMessage(message);
      });

      this.connection.on('close', () => {
        this.logger.warn('Connexion RabbitMQ fermée. Reconnexion...');
        this.channel = undefined;
        this.connection = undefined;
        this.scheduleReconnect();
      });

      this.connection.on('error', (error) => {
        this.logger.error(
          'Erreur RabbitMQ consumer',
          error instanceof Error ? error.stack : undefined,
        );
      });

      this.logger.log(`RabbitMQ consumer prêt sur ${this.queueName}`);
    } catch (error) {
      this.logger.error(
        'Connexion RabbitMQ impossible. Les événements billing ne seront pas consommés.',
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

  private async handleMessage(message: ConsumeMessage | null) {
    if (!message || !this.channel) return;

    try {
      const payload = JSON.parse(message.content.toString()) as Record<
        string,
        unknown
      >;
      await this.subscriptionsService.handleBillingEvent(
        message.fields.routingKey,
        payload,
      );
      this.channel.ack(message);
    } catch (error) {
      this.logger.error(
        `Event RabbitMQ invalide: ${message.fields.routingKey}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.channel.ack(message);
    }
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
