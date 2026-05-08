import type { ConfigService } from '@nestjs/config';
import type { ConsumeMessage } from 'amqplib';
import { RabbitmqConsumerService } from '../mail/rabbitmq-consumer.service';
import type { MailService } from '../mail/mail.service';

type FetchResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

type MailServiceMock = {
  sendSubscriptionThanks: jest.Mock<
    Promise<unknown>,
    [Record<string, unknown>]
  >;
  sendTicketPurchaseThanks: jest.Mock<
    Promise<unknown>,
    [Record<string, unknown>]
  >;
  sendTicketRefundedSuccess: jest.Mock<
    Promise<unknown>,
    [Record<string, unknown>]
  >;
  sendWelcome: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
  sendPasswordReset: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
  sendPostConfirmationRequested: jest.Mock<
    Promise<unknown>,
    [Record<string, unknown>]
  >;
};

type ConsumerInternals = {
  channel?: {
    ack: jest.Mock<void, [ConsumeMessage]>;
  };
  handleMessage: (message: ConsumeMessage | null) => Promise<void>;
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const createMailServiceMock = (): MailServiceMock => ({
  sendSubscriptionThanks: createMock<
    Promise<unknown>,
    [Record<string, unknown>]
  >().mockResolvedValue({ status: 'sent' }),
  sendTicketPurchaseThanks: createMock<
    Promise<unknown>,
    [Record<string, unknown>]
  >().mockResolvedValue({ status: 'sent' }),
  sendTicketRefundedSuccess: createMock<
    Promise<unknown>,
    [Record<string, unknown>]
  >().mockResolvedValue({ status: 'sent' }),
  sendWelcome: createMock<
    Promise<unknown>,
    [Record<string, unknown>]
  >().mockResolvedValue({ status: 'sent' }),
  sendPasswordReset: createMock<
    Promise<unknown>,
    [Record<string, unknown>]
  >().mockResolvedValue({ status: 'sent' }),
  sendPostConfirmationRequested: createMock<
    Promise<unknown>,
    [Record<string, unknown>]
  >().mockResolvedValue({ status: 'sent' }),
});

const createMessage = (
  routingKey: string,
  payload: Record<string, unknown> | string,
): ConsumeMessage =>
  ({
    fields: {
      routingKey,
    },
    content: Buffer.from(
      typeof payload === 'string' ? payload : JSON.stringify(payload),
    ),
  }) as ConsumeMessage;

describe('RabbitmqConsumerService', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  let fetchMock: jest.Mock<Promise<FetchResponse>, [string, RequestInit]>;
  let configGet: jest.Mock<string | undefined, [string]>;
  let mailService: MailServiceMock;
  let ack: jest.Mock<void, [ConsumeMessage]>;
  let consumer: RabbitmqConsumerService;
  let internals: ConsumerInternals;

  beforeEach(() => {
    process.env = { ...originalEnv };
    fetchMock = jest.fn<Promise<FetchResponse>, [string, RequestInit]>();
    global.fetch = fetchMock as unknown as typeof fetch;
    configGet = jest.fn<string | undefined, [string]>((key) => {
      const config: Record<string, string> = {
        TICKETING_SERVICE_URL: 'http://ticketing.test',
        USER_SERVICE_URL: 'http://user.test',
        RABBITMQ_RETRY_DELAY_MS: '10',
      };
      return config[key];
    });
    mailService = createMailServiceMock();
    ack = jest.fn<void, [ConsumeMessage]>();
    consumer = new RabbitmqConsumerService(
      { get: configGet } as unknown as ConfigService,
      mailService as unknown as MailService,
    );
    internals = consumer as unknown as ConsumerInternals;
    internals.channel = { ack };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('envoie un email de bienvenue enrichi avec le nom user-service', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { firstName: 'Ada', lastName: 'Lovelace' },
        }),
    });
    const message = createMessage('auth.mail.welcome', {
      email: 'ada@test.com',
      username: 'fallback',
      activationUrl: 'https://app.test/activate',
    });

    await internals.handleMessage(message);

    expect(mailService.sendWelcome).toHaveBeenCalledWith({
      email: 'ada@test.com',
      username: 'Ada Lovelace',
      activationUrl: 'https://app.test/activate',
    });
    expect(ack).toHaveBeenCalledWith(message);
  });

  it('ignore un password reset incomplet tout en acquittant le message', async () => {
    const message = createMessage('auth.mail.password-reset', {
      email: 'user@test.com',
    });

    await internals.handleMessage(message);

    expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(message);
  });

  it('envoie un email abonnement paye si customerEmail est present', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    const message = createMessage('billing.payment.succeeded', {
      customerEmail: 'client@test.com',
      amount: 19.99,
      currency: 'EUR',
      paidAt: '2026-01-01T10:00:00.000Z',
      hostedInvoiceUrl: 'https://stripe.test/invoice',
      invoicePdfUrl: 'https://stripe.test/invoice.pdf',
    });

    await internals.handleMessage(message);

    expect(mailService.sendSubscriptionThanks).toHaveBeenCalledWith({
      email: 'client@test.com',
      username: 'client@test.com',
      amount: 19.99,
      currency: 'EUR',
      paidAt: '2026-01-01T10:00:00.000Z',
      hostedInvoiceUrl: 'https://stripe.test/invoice',
      invoicePdfUrl: 'https://stripe.test/invoice.pdf',
    });
  });

  it('enrichit un paiement ticket depuis ticketing quand disponible', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          purchase: {
            id: 'purchase-1',
            eventId: 'event-1',
            paidAt: '2026-01-01T10:00:00.000Z',
            statusLabel: 'Payé',
            totalAmount: 50,
            currency: 'EUR',
            buyer: {
              firstName: 'Grace',
              lastName: 'Hopper',
              email: 'grace@test.com',
            },
            items: [{ label: 'VIP', quantity: 2, unitAmount: 25 }],
            tickets: [
              {
                ticketNumber: 'T-1',
                attendeeFirstname: 'Grace',
                attendeeLastname: 'Hopper',
                attendeeEmail: 'grace@test.com',
                ticketTypeName: 'VIP',
                statusLabel: 'Valide',
                qrCode: 'qr-code',
              },
            ],
          },
        }),
    });
    const message = createMessage('billing.ticket.payment.succeeded', {
      customerEmail: 'fallback@test.com',
      customerName: 'Fallback Name',
      stripePaymentIntentId: 'pi_123',
      stripeCheckoutSessionId: 'cs_123',
      amountTotal: 10,
      currency: 'USD',
      eventId: 'fallback-event',
      hostedInvoiceUrl: 'https://stripe.test/invoice',
      invoicePdfUrl: 'https://stripe.test/invoice.pdf',
      receiptUrl: 'https://stripe.test/receipt',
      items: [{ name: 'Standard', quantity: 1, unitAmount: 10 }],
    });

    await internals.handleMessage(message);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://ticketing.test/api/ticketing/internal/purchases/payment-intent/pi_123',
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
    );
    expect(mailService.sendTicketPurchaseThanks).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'fallback@test.com',
        username: 'Grace Hopper',
        eventId: 'event-1',
        amountTotal: 50,
        currency: 'EUR',
        ticketCount: 1,
        buyerFirstname: 'Grace',
        buyerLastname: 'Hopper',
        buyerEmail: 'grace@test.com',
        statusLabel: 'Payé',
        purchaseId: 'purchase-1',
        stripePaymentIntentId: 'pi_123',
        stripeCheckoutSessionId: 'cs_123',
      }),
    );
  });

  it('deduplique les emails de remboursement ticket par refund id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          purchase: {
            id: 'purchase-1',
            statusLabel: 'Remboursé',
            totalAmount: 50,
            currency: 'EUR',
            buyer: {
              firstName: 'Grace',
              lastName: 'Hopper',
              email: 'grace@test.com',
            },
            items: [{ label: 'VIP', quantity: 2, unitAmount: 25 }],
            tickets: [{ ticketNumber: 'T-1' }],
          },
        }),
    });
    const firstMessage = createMessage('billing.ticket.payment.refunded', {
      stripePaymentIntentId: 'pi_123',
      stripeRefundId: 're_123',
      amount: 50,
      currency: 'EUR',
      refundedAt: '2026-01-02T10:00:00.000Z',
    });
    const secondMessage = createMessage('billing.ticket.payment.refunded', {
      stripePaymentIntentId: 'pi_123',
      stripeRefundId: 're_123',
      amount: 50,
      currency: 'EUR',
    });

    await internals.handleMessage(firstMessage);
    await internals.handleMessage(secondMessage);

    expect(mailService.sendTicketRefundedSuccess).toHaveBeenCalledTimes(1);
    expect(mailService.sendTicketRefundedSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'grace@test.com',
        username: 'Grace Hopper',
        amountTotal: 50,
        currency: 'EUR',
        statusLabel: 'Remboursé',
        purchaseDate: '2026-01-02T10:00:00.000Z',
        stripePaymentIntentId: 'pi_123',
      }),
    );
    expect(ack).toHaveBeenCalledTimes(2);
  });

  it('envoie une demande de confirmation post si le payload est complet', async () => {
    const message = createMessage('post.mail.confirmation.requested', {
      email: 'creator@test.com',
      username: 'Creator',
      postId: 'post-1',
      confirmationUrl: 'https://app.test/posts/post-1/confirm',
      scheduledAt: '2026-01-01T10:00:00.000Z',
      networks: ['facebook', 'linkedin'],
      contentPreview: 'Hello network',
      eventUrl: 'https://app.test/events/event-1',
    });

    await internals.handleMessage(message);

    expect(mailService.sendPostConfirmationRequested).toHaveBeenCalledWith({
      email: 'creator@test.com',
      username: 'Creator',
      postId: 'post-1',
      confirmationUrl: 'https://app.test/posts/post-1/confirm',
      scheduledAt: '2026-01-01T10:00:00.000Z',
      networks: ['facebook', 'linkedin'],
      contentPreview: 'Hello network',
      eventUrl: 'https://app.test/events/event-1',
    });
  });

  it('acquitte aussi les messages JSON invalides', async () => {
    const message = createMessage('auth.mail.welcome', '{bad json');

    await internals.handleMessage(message);

    expect(mailService.sendWelcome).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(message);
  });
});
