import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TicketsController } from '../src/tickets/tickets.controller';
import { TicketsService } from '../src/tickets/tickets.service';

describe('Ticketing service (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;
  const ticketsService = {
    getEventTicketTypes: jest.fn(),
    getEventSoldTickets: jest.fn(),
    upsertEventTicketTypes: jest.fn(),
    createCheckoutSession: jest.fn(),
    getMyTickets: jest.fn(),
    getAdminTickets: jest.fn(),
    getTicketPaymentInvoiceLinks: jest.fn(),
    getPurchaseByStripePaymentIntentId: jest.fn(),
    requestPurchaseRefund: jest.fn(),
  };
  const userId = '11111111-1111-4111-8111-111111111111';
  const eventId = '22222222-2222-4222-8222-222222222222';

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [{ provide: TicketsService, useValue: ticketsService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns public ticket types for an event', async () => {
    ticketsService.getEventTicketTypes.mockResolvedValue([
      { id: 'ticket-type-1', name: 'Standard', price: 15 },
    ]);

    await request(httpServer)
      .get(`/api/ticketing/events/${eventId}/types?include_inactive=true`)
      .expect(200)
      .expect([{ id: 'ticket-type-1', name: 'Standard', price: 15 }]);

    expect(ticketsService.getEventTicketTypes).toHaveBeenCalledWith(
      eventId,
      true,
    );
  });

  it('requires authentication headers before checkout', () => {
    return request(httpServer)
      .post('/api/ticketing/checkout-session')
      .send({ eventId })
      .expect(403);
  });

  it('creates a ticket checkout session for the authenticated user', async () => {
    const payload = { eventId, attendees: [] };
    ticketsService.createCheckoutSession.mockResolvedValue({
      url: 'https://checkout.stripe.test/tickets',
    });

    await request(httpServer)
      .post('/api/ticketing/checkout-session')
      .set('x-user-id', userId)
      .set('Authorization', 'Bearer jwt-token')
      .send(payload)
      .expect(201)
      .expect({ url: 'https://checkout.stripe.test/tickets' });

    expect(ticketsService.createCheckoutSession).toHaveBeenCalledWith(
      userId,
      payload,
      'Bearer jwt-token',
    );
  });
});
