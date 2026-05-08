import type { ConfigService } from '@nestjs/config';
import type { ConsumeMessage } from 'amqplib';
import { RabbitmqConsumerService } from './rabbitmq-consumer.service';
import type { SubscriptionsService } from './subscriptions.service';

type SubscriptionServiceMock = {
  handleBillingEvent: jest.Mock<
    Promise<void>,
    [string, Record<string, unknown>]
  >;
};

type ConsumerInternals = {
  channel?: {
    ack: jest.Mock<void, [ConsumeMessage]>;
  };
  handleMessage: (message: ConsumeMessage | null) => Promise<void>;
};

const createMessage = (
  routingKey: string,
  payload: Record<string, unknown> | string,
): ConsumeMessage =>
  ({
    fields: { routingKey },
    content: Buffer.from(
      typeof payload === 'string' ? payload : JSON.stringify(payload),
    ),
  }) as ConsumeMessage;

describe('RabbitmqConsumerService', () => {
  let subscriptionsService: SubscriptionServiceMock;
  let ack: jest.Mock<void, [ConsumeMessage]>;
  let internals: ConsumerInternals;

  beforeEach(() => {
    subscriptionsService = {
      handleBillingEvent: jest
        .fn<Promise<void>, [string, Record<string, unknown>]>()
        .mockResolvedValue(undefined),
    };
    ack = jest.fn<void, [ConsumeMessage]>();
    const consumer = new RabbitmqConsumerService(
      {
        get: jest.fn<string | undefined, [string]>((key) => {
          const config: Record<string, string> = {
            RABBITMQ_RETRY_DELAY_MS: '10',
          };
          return config[key];
        }),
      } as unknown as ConfigService,
      subscriptionsService as unknown as SubscriptionsService,
    );
    internals = consumer as unknown as ConsumerInternals;
    internals.channel = { ack };
  });

  it('transmet le routing key et payload au service puis ack', async () => {
    const message = createMessage('billing.subscription.created', {
      userId: 'user-1',
      stripeSubscriptionId: 'stripe-sub-1',
    });

    await internals.handleMessage(message);

    expect(subscriptionsService.handleBillingEvent).toHaveBeenCalledWith(
      'billing.subscription.created',
      {
        userId: 'user-1',
        stripeSubscriptionId: 'stripe-sub-1',
      },
    );
    expect(ack).toHaveBeenCalledWith(message);
  });

  it('ack aussi les messages invalides', async () => {
    const message = createMessage('billing.payment.succeeded', '{bad json');

    await internals.handleMessage(message);

    expect(subscriptionsService.handleBillingEvent).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(message);
  });
});
