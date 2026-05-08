import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';

type CategoryRecord = {
  id: string;
  name: string;
};

type EventRecord = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category_id: string;
  location: string;
  address: string;
  start_date: Date;
  end_date: Date;
  image_url: string;
  status: EventStatus;
  category?: CategoryRecord;
};

type PrismaMock = {
  event: {
    findMany: jest.Mock<Promise<EventRecord[]>, [Record<string, unknown>]>;
    findUnique: jest.Mock<
      Promise<EventRecord | null>,
      [Record<string, unknown>]
    >;
    create: jest.Mock<Promise<EventRecord>, [Record<string, unknown>]>;
    update: jest.Mock<Promise<EventRecord>, [Record<string, unknown>]>;
    delete: jest.Mock<Promise<EventRecord>, [Record<string, unknown>]>;
  };
  category: {
    findUnique: jest.Mock<
      Promise<CategoryRecord | null>,
      [Record<string, unknown>]
    >;
  };
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const createPrismaMock = (): PrismaMock => ({
  event: {
    findMany: createMock<Promise<EventRecord[]>, [Record<string, unknown>]>(),
    findUnique: createMock<
      Promise<EventRecord | null>,
      [Record<string, unknown>]
    >(),
    create: createMock<Promise<EventRecord>, [Record<string, unknown>]>(),
    update: createMock<Promise<EventRecord>, [Record<string, unknown>]>(),
    delete: createMock<Promise<EventRecord>, [Record<string, unknown>]>(),
  },
  category: {
    findUnique: createMock<
      Promise<CategoryRecord | null>,
      [Record<string, unknown>]
    >(),
  },
});

const makeEvent = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  id: 'event-1',
  creator_id: 'creator-1',
  title: 'Tech Summit',
  description: 'A serious technology event',
  category_id: 'category-1',
  location: 'Paris',
  address: '1 rue de Paris',
  start_date: new Date('2026-06-01T10:00:00.000Z'),
  end_date: new Date('2026-06-01T12:00:00.000Z'),
  image_url: 'https://cdn.test/event.jpg',
  status: EventStatus.published,
  category: { id: 'category-1', name: 'Tech' },
  ...overrides,
});

describe('EventsService', () => {
  let prisma: PrismaMock;
  let service: EventsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new EventsService(prisma as unknown as PrismaService);
  });

  it('liste tous les evenements avec categorie par date croissante', async () => {
    const events = [makeEvent()];
    prisma.event.findMany.mockResolvedValue(events);

    await expect(service.getAll()).resolves.toBe(events);

    expect(prisma.event.findMany).toHaveBeenCalledWith({
      include: { category: true },
      orderBy: { start_date: 'asc' },
    });
  });

  it('liste uniquement les evenements publics', async () => {
    const events = [makeEvent()];
    prisma.event.findMany.mockResolvedValue(events);

    await expect(service.getPublicList()).resolves.toBe(events);

    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: {
        status: {
          not: EventStatus.draft,
        },
      },
      include: { category: true },
      orderBy: { start_date: 'asc' },
    });
  });

  it('cache un draft aux visiteurs qui ne sont ni admin ni createur', async () => {
    prisma.event.findUnique.mockResolvedValue(
      makeEvent({ status: EventStatus.draft }),
    );

    await expect(
      service.getOne('event-1', 'user-2', 'User'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('autorise le createur a lire son draft', async () => {
    const event = makeEvent({ status: EventStatus.draft });
    prisma.event.findUnique.mockResolvedValue(event);

    await expect(service.getOne('event-1', 'creator-1', 'User')).resolves.toBe(
      event,
    );
  });

  it('cree un evenement en validant categorie, dates et trimming', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Tech',
    });
    const created = makeEvent({
      title: 'Tech Summit',
      description: 'A serious technology event',
      location: 'Paris',
      address: '1 rue de Paris',
      image_url: '',
      status: EventStatus.draft,
    });
    prisma.event.create.mockResolvedValue(created);

    await expect(
      service.create({
        creator_id: 'creator-1',
        title: '  Tech Summit  ',
        description: '  A serious technology event  ',
        category_id: 'category-1',
        location: '  Paris  ',
        address: '  1 rue de Paris  ',
        start_date: '2026-06-01T10:00:00.000Z',
        end_date: '2026-06-01T12:00:00.000Z',
      }),
    ).resolves.toBe(created);

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: {
        creator_id: 'creator-1',
        title: 'Tech Summit',
        description: 'A serious technology event',
        category_id: 'category-1',
        location: 'Paris',
        address: '1 rue de Paris',
        start_date: new Date('2026-06-01T10:00:00.000Z'),
        end_date: new Date('2026-06-01T12:00:00.000Z'),
        image_url: '',
        status: EventStatus.draft,
      },
      include: { category: true },
    });
  });

  it('refuse une creation avec categorie inconnue ou dates incoherentes', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        creator_id: 'creator-1',
        title: 'Tech Summit',
        description: 'A serious technology event',
        category_id: 'missing',
        location: 'Paris',
        address: '1 rue de Paris',
        start_date: '2026-06-01T10:00:00.000Z',
        end_date: '2026-06-01T12:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.category.findUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Tech',
    });

    await expect(
      service.create({
        creator_id: 'creator-1',
        title: 'Tech Summit',
        description: 'A serious technology event',
        category_id: 'category-1',
        location: 'Paris',
        address: '1 rue de Paris',
        start_date: '2026-06-01T12:00:00.000Z',
        end_date: '2026-06-01T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('met a jour un evenement avec nouvelle categorie et dates validees', async () => {
    prisma.event.findUnique.mockResolvedValue(makeEvent());
    prisma.category.findUnique.mockResolvedValue({
      id: 'category-2',
      name: 'Music',
    });
    const updated = makeEvent({
      category_id: 'category-2',
      status: EventStatus.canceled,
    });
    prisma.event.update.mockResolvedValue(updated);

    await expect(
      service.update('event-1', {
        title: '  New title  ',
        category_id: 'category-2',
        start_date: '2026-06-02T10:00:00.000Z',
        end_date: '2026-06-02T11:00:00.000Z',
        status: EventStatus.canceled,
      }),
    ).resolves.toBe(updated);

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: {
        title: 'New title',
        description: undefined,
        location: undefined,
        address: undefined,
        category: {
          connect: {
            id: 'category-2',
          },
        },
        image_url: undefined,
        status: EventStatus.canceled,
        start_date: new Date('2026-06-02T10:00:00.000Z'),
        end_date: new Date('2026-06-02T11:00:00.000Z'),
      },
      include: { category: true },
    });
  });

  it('transforme une suppression inexistante en NotFoundException', async () => {
    prisma.event.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Missing event', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
