import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  TicketCurrency,
  TicketPurchaseStatus,
  TicketType,
} from '@prisma/client';
import { of } from 'rxjs';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';

type TicketTypeRecord = TicketType & {
  items?: Array<Record<string, unknown>>;
  tickets?: Array<Record<string, unknown>>;
};

type PurchaseRecord = {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string;
  status: TicketPurchaseStatus;
  total_amount: number;
  currency: TicketCurrency;
  paid_at: Date | null;
  refunded_at?: Date | null;
  created_at: Date;
  items: Array<{
    id?: string;
    ticket_type_id: string;
    quantity: number;
    unit_price?: number;
    currency?: TicketCurrency;
    ticket_type_label?: string | null;
    ticket_type?: TicketTypeRecord;
  }>;
  tickets: Array<{
    ticket_number?: string;
    attendee_firstname?: string;
    attendee_lastname?: string;
    attendee_email?: string | null;
    used?: boolean;
    qr_code?: string;
  }>;
};

type TxMock = {
  ticketType: {
    findMany: jest.Mock<Promise<TicketTypeRecord[]>, [Record<string, unknown>]>;
    update: jest.Mock<Promise<TicketTypeRecord>, [Record<string, unknown>]>;
    create: jest.Mock<Promise<TicketTypeRecord>, [Record<string, unknown>]>;
    deleteMany: jest.Mock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >;
    findUnique: jest.Mock<
      Promise<TicketTypeRecord | null>,
      [Record<string, unknown>]
    >;
  };
  ticketPurchase: {
    create: jest.Mock<Promise<PurchaseRecord>, [Record<string, unknown>]>;
    update: jest.Mock<Promise<PurchaseRecord>, [Record<string, unknown>]>;
  };
  ticketPurchaseItem: {
    create: jest.Mock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>]
    >;
  };
  ticket: {
    createMany: jest.Mock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >;
    updateMany: jest.Mock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >;
  };
};

type PrismaMock = {
  ticketType: {
    findMany: jest.Mock<Promise<TicketTypeRecord[]>, [Record<string, unknown>]>;
  };
  ticketPurchase: {
    findMany: jest.Mock<Promise<PurchaseRecord[]>, [Record<string, unknown>]>;
    findUnique: jest.Mock<
      Promise<PurchaseRecord | null>,
      [Record<string, unknown>]
    >;
    findFirst: jest.Mock<
      Promise<{ id: string } | null>,
      [Record<string, unknown>]
    >;
  };
  ticket: {
    findMany: jest.Mock<
      Promise<Array<Record<string, unknown>>>,
      [Record<string, unknown>]
    >;
  };
  $transaction: jest.Mock<Promise<unknown>, [(tx: TxMock) => Promise<unknown>]>;
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const makeTicketType = (
  overrides: Partial<TicketTypeRecord> = {},
): TicketTypeRecord => ({
  id: 'ticket-1',
  event_id: 'event-1',
  name: 'VIP',
  description: 'VIP ticket',
  price: 25 as unknown as TicketTypeRecord['price'],
  currency: TicketCurrency.EUR,
  max_quantity: 5,
  sold_quantity: 1,
  is_active: true,
  created_at: new Date('2026-01-01T10:00:00.000Z'),
  updated_at: new Date('2026-01-01T10:00:00.000Z'),
  ...overrides,
});

const makePurchase = (
  overrides: Partial<PurchaseRecord> = {},
): PurchaseRecord => ({
  id: 'purchase-1',
  user_id: 'user-1',
  stripe_payment_intent_id: 'pi_123',
  status: TicketPurchaseStatus.paid,
  total_amount: 50,
  currency: TicketCurrency.EUR,
  paid_at: new Date('2026-01-01T10:00:00.000Z'),
  created_at: new Date('2026-01-01T10:00:00.000Z'),
  items: [
    {
      ticket_type_id: 'ticket-1',
      quantity: 2,
      unit_price: 25,
      currency: TicketCurrency.EUR,
      ticket_type_label: 'VIP',
      ticket_type: makeTicketType(),
    },
  ],
  tickets: [{ used: false, ticket_number: 'ET-1' }],
  ...overrides,
});

const makeTx = (): TxMock => ({
  ticketType: {
    findMany: createMock<
      Promise<TicketTypeRecord[]>,
      [Record<string, unknown>]
    >(),
    update: createMock<Promise<TicketTypeRecord>, [Record<string, unknown>]>(),
    create: createMock<Promise<TicketTypeRecord>, [Record<string, unknown>]>(),
    deleteMany: createMock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >(),
    findUnique: createMock<
      Promise<TicketTypeRecord | null>,
      [Record<string, unknown>]
    >(),
  },
  ticketPurchase: {
    create: createMock<Promise<PurchaseRecord>, [Record<string, unknown>]>(),
    update: createMock<Promise<PurchaseRecord>, [Record<string, unknown>]>(),
  },
  ticketPurchaseItem: {
    create: createMock<
      Promise<Record<string, unknown>>,
      [Record<string, unknown>]
    >(),
  },
  ticket: {
    createMany: createMock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >(),
    updateMany: createMock<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >(),
  },
});

const makePrisma = (): PrismaMock => ({
  ticketType: {
    findMany: createMock<
      Promise<TicketTypeRecord[]>,
      [Record<string, unknown>]
    >(),
  },
  ticketPurchase: {
    findMany: createMock<
      Promise<PurchaseRecord[]>,
      [Record<string, unknown>]
    >(),
    findUnique: createMock<
      Promise<PurchaseRecord | null>,
      [Record<string, unknown>]
    >(),
    findFirst: createMock<
      Promise<{ id: string } | null>,
      [Record<string, unknown>]
    >(),
  },
  ticket: {
    findMany: createMock<
      Promise<Array<Record<string, unknown>>>,
      [Record<string, unknown>]
    >(),
  },
  $transaction: createMock<
    Promise<unknown>,
    [(tx: TxMock) => Promise<unknown>]
  >(),
});

describe('TicketsService', () => {
  let prisma: PrismaMock;
  let tx: TxMock;
  let httpPost: jest.Mock;
  let httpGet: jest.Mock;
  let service: TicketsService;

  beforeEach(() => {
    prisma = makePrisma();
    tx = makeTx();
    prisma.$transaction.mockImplementation((callback) => callback(tx));
    httpPost = jest.fn();
    httpGet = jest.fn();
    service = new TicketsService(
      prisma as unknown as PrismaService,
      {
        get: jest.fn<string | undefined, [string]>((key) => {
          const config: Record<string, string> = {
            BILLING_SERVICE_URL: 'http://billing.test',
            USER_SERVICE_URL: 'http://user.test',
            EVENT_SERVICE_URL: 'http://event.test',
          };
          return config[key];
        }),
      } as unknown as ConfigService,
      { post: httpPost, get: httpGet } as unknown as HttpService,
    );
  });

  it('liste les types actifs dun event par prix puis creation', async () => {
    prisma.ticketType.findMany.mockResolvedValue([makeTicketType()]);

    await expect(service.getEventTicketTypes('event-1')).resolves.toHaveLength(
      1,
    );

    expect(prisma.ticketType.findMany).toHaveBeenCalledWith({
      where: { event_id: 'event-1', is_active: true },
      orderBy: [{ price: 'asc' }, { created_at: 'asc' }],
    });
  });

  it('upsert les types et refuse les noms dupliques', async () => {
    await expect(
      service.upsertEventTicketTypes('event-1', {
        ticket_types: [
          { name: 'VIP', price: 10 },
          { name: ' vip ', price: 20 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    tx.ticketType.findMany.mockResolvedValue([makeTicketType()]);
    tx.ticketType.update.mockResolvedValue(
      makeTicketType({ name: 'VIP Plus' }),
    );
    tx.ticketType.create.mockResolvedValue(
      makeTicketType({ id: 'ticket-2', name: 'Standard' }),
    );
    tx.ticketType.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      service.upsertEventTicketTypes('event-1', {
        ticket_types: [
          { id: 'ticket-1', name: 'VIP Plus', price: 30 },
          { name: 'Standard', price: 12 },
        ],
      }),
    ).resolves.toMatchObject({ event_id: 'event-1' });

    expect(tx.ticketType.update).toHaveBeenCalled();
    expect(tx.ticketType.create).toHaveBeenCalled();
  });

  it('refuse de supprimer un type ayant deja des achats', async () => {
    tx.ticketType.findMany
      .mockResolvedValueOnce([
        makeTicketType({ id: 'old-ticket', name: 'Old' }),
      ])
      .mockResolvedValueOnce([
        makeTicketType({ id: 'old-ticket', name: 'Old' }),
      ]);
    tx.ticketType.create.mockResolvedValue(
      makeTicketType({ id: 'new-ticket', name: 'New' }),
    );

    await expect(
      service.upsertEventTicketTypes('event-1', {
        ticket_types: [{ name: 'New', price: 10 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cree une session checkout apres controle stock et appelle billing', async () => {
    prisma.ticketType.findMany.mockResolvedValue([makeTicketType()]);
    httpPost.mockReturnValue(
      of({ data: { sessionId: 'cs_123', url: 'https://stripe.test' } }),
    );

    await expect(
      service.createCheckoutSession(
        'user-1',
        {
          event_id: 'event-1',
          items: [{ ticket_type_id: 'ticket-1', quantity: 2 }],
          success_url: 'https://app.test/success',
          cancel_url: 'https://app.test/cancel',
          customer_name: 'Ada Lovelace',
          customer_email: 'ada@test.com',
          attendees: [
            {
              ticket_type_id: 'ticket-1',
              firstname: 'Ada',
              lastname: 'Lovelace',
              email: 'ada@test.com',
            },
          ],
        },
        'Bearer token',
      ),
    ).resolves.toEqual({ sessionId: 'cs_123', url: 'https://stripe.test' });

    expect(httpPost).toHaveBeenCalledWith(
      'http://billing.test/api/billing/tickets/checkout-session',
      expect.objectContaining({
        userId: 'user-1',
        eventId: 'event-1',
        items: [
          {
            ticketTypeId: 'ticket-1',
            name: 'VIP',
            description: 'VIP ticket',
            quantity: 2,
            unitAmount: 25,
            currency: TicketCurrency.EUR,
          },
        ],
      }),
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('refuse checkout si stock insuffisant', async () => {
    prisma.ticketType.findMany.mockResolvedValue([
      makeTicketType({ max_quantity: 2, sold_quantity: 1 }),
    ]);

    await expect(
      service.createCheckoutSession(
        'user-1',
        {
          event_id: 'event-1',
          items: [{ ticket_type_id: 'ticket-1', quantity: 2 }],
          success_url: 'https://app.test/success',
          cancel_url: 'https://app.test/cancel',
          customer_name: 'Ada',
          customer_email: 'ada@test.com',
          attendees: [],
        },
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cree achat, lignes et tickets depuis payment succeeded', async () => {
    prisma.ticketPurchase.findUnique.mockResolvedValue(null);
    tx.ticketPurchase.create.mockResolvedValue(makePurchase());
    tx.ticketType.findUnique.mockResolvedValue(
      makeTicketType({ sold_quantity: 1 }),
    );
    tx.ticketPurchaseItem.create.mockResolvedValue({});
    tx.ticketType.update.mockResolvedValue(
      makeTicketType({ sold_quantity: 3 }),
    );
    tx.ticket.createMany.mockResolvedValue({ count: 2 });

    await service.handleBillingEvent('billing.ticket.payment.succeeded', {
      userId: 'user-1',
      eventId: 'event-1',
      stripePaymentIntentId: 'pi_123',
      amountTotal: 50,
      currency: 'EUR',
      customerEmail: 'ada@test.com',
      customerName: 'Ada Lovelace',
      attendees: [
        {
          ticketTypeId: 'ticket-1',
          firstname: 'Ada',
          lastname: 'Lovelace',
          email: 'ada@test.com',
        },
      ],
      items: [
        {
          ticketTypeId: 'ticket-1',
          name: 'VIP',
          quantity: 2,
          unitAmount: 25,
          currency: 'EUR',
        },
      ],
    });

    const [purchaseCreateCall] = tx.ticketPurchase.create.mock.calls;

    expect(purchaseCreateCall[0].data).toMatchObject({
      user_id: 'user-1',
      stripe_payment_intent_id: 'pi_123',
      status: TicketPurchaseStatus.paid,
    });
    expect(tx.ticketType.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { sold_quantity: { increment: 2 } },
    });
    expect(tx.ticket.createMany.mock.calls[0][0].data).toHaveLength(2);
  });

  it('applique un refund et decremente les stocks', async () => {
    prisma.ticketPurchase.findUnique.mockResolvedValue(makePurchase());
    tx.ticketPurchase.update.mockResolvedValue(
      makePurchase({ status: TicketPurchaseStatus.refunded }),
    );
    tx.ticketType.findUnique.mockResolvedValue(
      makeTicketType({ sold_quantity: 3 }),
    );
    tx.ticketType.update.mockResolvedValue(
      makeTicketType({ sold_quantity: 1 }),
    );
    tx.ticket.updateMany.mockResolvedValue({ count: 2 });

    await service.handleBillingEvent('billing.ticket.payment.refunded', {
      stripePaymentIntentId: 'pi_123',
      stripeRefundId: 're_123',
      reason: 'requested_by_customer',
      refundedAt: '2026-01-02T10:00:00.000Z',
    });

    const [purchaseUpdateCall] = tx.ticketPurchase.update.mock.calls;

    expect(purchaseUpdateCall[0].where).toEqual({ id: 'purchase-1' });
    expect(purchaseUpdateCall[0].data).toMatchObject({
      status: TicketPurchaseStatus.refunded,
      failure_reason: 'requested_by_customer',
    });
    expect(tx.ticketType.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { sold_quantity: 1 },
    });
  });

  it('protege refund selon proprietaire/admin/createur et refuse tickets utilises', async () => {
    prisma.ticketPurchase.findUnique.mockResolvedValue(
      makePurchase({
        user_id: 'owner-1',
        tickets: [{ used: true }],
      }),
    );

    await expect(
      service.requestPurchaseRefund(
        'purchase-1',
        'owner-1',
        false,
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.ticketPurchase.findUnique.mockResolvedValue(
      makePurchase({ user_id: 'owner-1', tickets: [{ used: false }] }),
    );
    httpGet.mockReturnValue(of({ data: { creator_id: 'someone-else' } }));

    await expect(
      service.requestPurchaseRefund(
        'purchase-1',
        'user-2',
        false,
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('retourne les liens facture seulement pour owner ou admin', async () => {
    prisma.ticketPurchase.findFirst.mockResolvedValue({ id: 'purchase-1' });
    httpGet.mockReturnValue(
      of({
        data: {
          hostedInvoiceUrl: 'https://stripe.test/invoice',
          invoicePdfUrl: null,
          receiptUrl: 'https://stripe.test/receipt',
        },
      }),
    );

    await expect(
      service.getTicketPaymentInvoiceLinks(
        'pi_123',
        'user-1',
        false,
        'Bearer token',
      ),
    ).resolves.toEqual({
      hostedInvoiceUrl: 'https://stripe.test/invoice',
      invoicePdfUrl: null,
      receiptUrl: 'https://stripe.test/receipt',
    });

    prisma.ticketPurchase.findFirst.mockResolvedValue(null);

    await expect(
      service.getTicketPaymentInvoiceLinks(
        'pi_123',
        'user-2',
        false,
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
