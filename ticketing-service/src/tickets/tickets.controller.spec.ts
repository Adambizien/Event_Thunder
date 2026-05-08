import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { CreateTicketCheckoutDto } from './dto/create-ticket-checkout.dto';

type TicketsServiceMock = {
  getEventTicketTypes: jest.Mock<Promise<unknown[]>, [string, boolean]>;
  getEventSoldTickets: jest.Mock<
    Promise<unknown>,
    [string, string, boolean, string]
  >;
  upsertEventTicketTypes: jest.Mock<
    Promise<unknown>,
    [string, Record<string, unknown>]
  >;
  createCheckoutSession: jest.Mock<
    Promise<unknown>,
    [string, Record<string, unknown>, string]
  >;
  getMyTickets: jest.Mock<Promise<unknown>, [string, string]>;
  getAdminTickets: jest.Mock<Promise<unknown>, [string]>;
  getTicketPaymentInvoiceLinks: jest.Mock<
    Promise<unknown>,
    [string, string, boolean, string]
  >;
  getPurchaseByStripePaymentIntentId: jest.Mock<Promise<unknown>, [string]>;
  requestPurchaseRefund: jest.Mock<
    Promise<unknown>,
    [string, string, boolean, string, string?]
  >;
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();
const uuid = '11111111-1111-4111-8111-111111111111';
const ticketTypeId = '22222222-2222-4222-8222-222222222222';

const makeCheckoutDto = (): CreateTicketCheckoutDto => ({
  event_id: uuid,
  items: [{ ticket_type_id: ticketTypeId, quantity: 1 }],
  success_url: 'https://event-thunder.test/success',
  cancel_url: 'https://event-thunder.test/cancel',
  customer_name: 'Ada Lovelace',
  customer_email: 'ada@example.com',
  attendees: [
    {
      ticket_type_id: ticketTypeId,
      firstname: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
    },
  ],
});

const makeService = (): TicketsServiceMock => ({
  getEventTicketTypes: createMock<Promise<unknown[]>, [string, boolean]>(),
  getEventSoldTickets: createMock<
    Promise<unknown>,
    [string, string, boolean, string]
  >(),
  upsertEventTicketTypes: createMock<
    Promise<unknown>,
    [string, Record<string, unknown>]
  >(),
  createCheckoutSession: createMock<
    Promise<unknown>,
    [string, Record<string, unknown>, string]
  >(),
  getMyTickets: createMock<Promise<unknown>, [string, string]>(),
  getAdminTickets: createMock<Promise<unknown>, [string]>(),
  getTicketPaymentInvoiceLinks: createMock<
    Promise<unknown>,
    [string, string, boolean, string]
  >(),
  getPurchaseByStripePaymentIntentId: createMock<Promise<unknown>, [string]>(),
  requestPurchaseRefund: createMock<
    Promise<unknown>,
    [string, string, boolean, string, string?]
  >(),
});

describe('TicketsController', () => {
  let ticketsService: TicketsServiceMock;
  let controller: TicketsController;

  beforeEach(() => {
    ticketsService = makeService();
    controller = new TicketsController(
      ticketsService as unknown as TicketsService,
    );
  });

  it('liste les types avec validation uuid et include inactive', async () => {
    ticketsService.getEventTicketTypes.mockResolvedValue([{ id: 'ticket-1' }]);

    await expect(controller.getEventTicketTypes(uuid, 'true')).resolves.toEqual(
      [{ id: 'ticket-1' }],
    );

    expect(ticketsService.getEventTicketTypes).toHaveBeenCalledWith(uuid, true);
    expect(() => controller.getEventTicketTypes('bad-id')).toThrow(
      BadRequestException,
    );
  });

  it('reserve upsert et admin tickets aux admins', async () => {
    ticketsService.upsertEventTicketTypes.mockResolvedValue({ event_id: uuid });
    ticketsService.getAdminTickets.mockResolvedValue({ purchases: [] });

    await expect(
      controller.upsertEventTicketTypes(
        uuid,
        { ticket_types: [{ name: 'VIP', price: 10 }] },
        'Admin',
      ),
    ).resolves.toEqual({ event_id: uuid });
    await expect(
      controller.getAdminTickets('Admin', 'Bearer token'),
    ).resolves.toEqual({
      purchases: [],
    });

    expect(() =>
      controller.upsertEventTicketTypes(uuid, { ticket_types: [] }, 'User'),
    ).toThrow(ForbiddenException);
    expect(() => controller.getAdminTickets('User', 'Bearer token')).toThrow(
      ForbiddenException,
    );
  });

  it('exige user et authorization pour checkout et mes tickets', async () => {
    ticketsService.createCheckoutSession.mockResolvedValue({
      sessionId: 'cs_1',
    });
    ticketsService.getMyTickets.mockResolvedValue({ purchases: [] });

    await expect(
      controller.createCheckoutSession(makeCheckoutDto(), uuid, 'Bearer token'),
    ).resolves.toEqual({ sessionId: 'cs_1' });
    await expect(
      controller.getMyTickets(uuid, 'Bearer token'),
    ).resolves.toEqual({
      purchases: [],
    });

    expect(() =>
      controller.createCheckoutSession(
        makeCheckoutDto(),
        undefined,
        'Bearer token',
      ),
    ).toThrow(ForbiddenException);
    expect(() => controller.getMyTickets(uuid, undefined)).toThrow(
      ForbiddenException,
    );
  });

  it('protege sold tickets, invoice links et refunds', async () => {
    ticketsService.getEventSoldTickets.mockResolvedValue({ count: 1 });
    ticketsService.getTicketPaymentInvoiceLinks.mockResolvedValue({
      receiptUrl: 'https://stripe.test/receipt',
    });
    ticketsService.requestPurchaseRefund.mockResolvedValue({
      refundId: 're_1',
    });

    await expect(
      controller.getEventSoldTickets(uuid, uuid, 'User', 'Bearer token'),
    ).resolves.toEqual({ count: 1 });
    await expect(
      controller.getTicketPaymentInvoiceLinks(
        'pi_123',
        uuid,
        'Admin',
        'Bearer token',
      ),
    ).resolves.toEqual({ receiptUrl: 'https://stripe.test/receipt' });
    await expect(
      controller.refundPurchase(
        uuid,
        { reason: 'requested_by_customer' },
        uuid,
        'User',
        'Bearer token',
      ),
    ).resolves.toEqual({ refundId: 're_1' });

    expect(() =>
      controller.getEventSoldTickets(uuid, undefined, 'User', 'Bearer token'),
    ).toThrow(ForbiddenException);
    expect(() =>
      controller.getTicketPaymentInvoiceLinks('', uuid, 'User', 'Bearer token'),
    ).toThrow(BadRequestException);
  });

  it('expose le lookup interne par payment intent', async () => {
    ticketsService.getPurchaseByStripePaymentIntentId.mockResolvedValue({
      purchase: { id: 'purchase-1' },
    });

    await expect(
      controller.getPurchaseByStripePaymentIntentId('pi_123'),
    ).resolves.toEqual({ purchase: { id: 'purchase-1' } });

    expect(() => controller.getPurchaseByStripePaymentIntentId('')).toThrow(
      BadRequestException,
    );
  });
});
