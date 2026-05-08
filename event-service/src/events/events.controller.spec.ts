import { EventStatus } from '@prisma/client';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

type EventsServiceMock = {
  getAll: jest.Mock<Promise<unknown[]>, []>;
  getPublicList: jest.Mock<Promise<unknown[]>, []>;
  getOne: jest.Mock<Promise<unknown>, [string, string?, string?]>;
  create: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
  update: jest.Mock<Promise<unknown>, [string, Record<string, unknown>]>;
  remove: jest.Mock<Promise<unknown>, [string]>;
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const createEventsServiceMock = (): EventsServiceMock => ({
  getAll: createMock<Promise<unknown[]>, []>(),
  getPublicList: createMock<Promise<unknown[]>, []>(),
  getOne: createMock<Promise<unknown>, [string, string?, string?]>(),
  create: createMock<Promise<unknown>, [Record<string, unknown>]>(),
  update: createMock<Promise<unknown>, [string, Record<string, unknown>]>(),
  remove: createMock<Promise<unknown>, [string]>(),
});

describe('EventsController', () => {
  let eventsService: EventsServiceMock;
  let controller: EventsController;

  beforeEach(() => {
    eventsService = createEventsServiceMock();
    controller = new EventsController(
      eventsService as unknown as EventsService,
    );
  });

  it('delegue les listes admin et publique', async () => {
    eventsService.getAll.mockResolvedValue([{ id: 'event-1' }]);
    eventsService.getPublicList.mockResolvedValue([{ id: 'event-2' }]);

    await expect(controller.getAll()).resolves.toEqual([{ id: 'event-1' }]);
    await expect(controller.getPublicList()).resolves.toEqual([
      { id: 'event-2' },
    ]);

    expect(eventsService.getAll).toHaveBeenCalledTimes(1);
    expect(eventsService.getPublicList).toHaveBeenCalledTimes(1);
  });

  it('transmet les headers utilisateur pour lire un evenement', async () => {
    eventsService.getOne.mockResolvedValue({ id: 'event-1' });

    await expect(
      controller.getOne('event-1', 'user-1', 'Admin'),
    ).resolves.toEqual({ id: 'event-1' });

    expect(eventsService.getOne).toHaveBeenCalledWith(
      'event-1',
      'user-1',
      'Admin',
    );
  });

  it('delegue creation, mise a jour et suppression', async () => {
    const createDto = {
      creator_id: 'creator-1',
      title: 'Tech Summit',
      description: 'A serious technology event',
      category_id: 'category-1',
      location: 'Paris',
      address: '1 rue de Paris',
      start_date: '2026-06-01T10:00:00.000Z',
      end_date: '2026-06-01T12:00:00.000Z',
      status: EventStatus.published,
    };
    const updateDto = {
      title: 'New title',
      status: EventStatus.canceled,
    };
    eventsService.create.mockResolvedValue({ id: 'event-1' });
    eventsService.update.mockResolvedValue({ id: 'event-1', ...updateDto });
    eventsService.remove.mockResolvedValue({ id: 'event-1' });

    await expect(controller.create(createDto)).resolves.toEqual({
      id: 'event-1',
    });
    await expect(controller.update('event-1', updateDto)).resolves.toEqual({
      id: 'event-1',
      ...updateDto,
    });
    await expect(controller.remove('event-1')).resolves.toEqual({
      id: 'event-1',
    });

    expect(eventsService.create).toHaveBeenCalledWith(createDto);
    expect(eventsService.update).toHaveBeenCalledWith('event-1', updateDto);
    expect(eventsService.remove).toHaveBeenCalledWith('event-1');
  });
});
