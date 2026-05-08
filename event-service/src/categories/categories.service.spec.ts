import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

type CategoryRecord = {
  id: string;
  name: string;
};

type PrismaMock = {
  category: {
    findMany: jest.Mock<Promise<CategoryRecord[]>, [Record<string, unknown>]>;
    findFirst: jest.Mock<
      Promise<CategoryRecord | null>,
      [Record<string, unknown>]
    >;
    findUnique: jest.Mock<
      Promise<CategoryRecord | null>,
      [Record<string, unknown>]
    >;
    create: jest.Mock<Promise<CategoryRecord>, [Record<string, unknown>]>;
    update: jest.Mock<Promise<CategoryRecord>, [Record<string, unknown>]>;
    delete: jest.Mock<Promise<CategoryRecord>, [Record<string, unknown>]>;
  };
  event: {
    count: jest.Mock<Promise<number>, [Record<string, unknown>]>;
  };
};

const createMock = <T, Y extends unknown[]>(): jest.Mock<T, Y> =>
  jest.fn<T, Y>();

const createPrismaMock = (): PrismaMock => ({
  category: {
    findMany: createMock<
      Promise<CategoryRecord[]>,
      [Record<string, unknown>]
    >(),
    findFirst: createMock<
      Promise<CategoryRecord | null>,
      [Record<string, unknown>]
    >(),
    findUnique: createMock<
      Promise<CategoryRecord | null>,
      [Record<string, unknown>]
    >(),
    create: createMock<Promise<CategoryRecord>, [Record<string, unknown>]>(),
    update: createMock<Promise<CategoryRecord>, [Record<string, unknown>]>(),
    delete: createMock<Promise<CategoryRecord>, [Record<string, unknown>]>(),
  },
  event: {
    count: createMock<Promise<number>, [Record<string, unknown>]>(),
  },
});

describe('CategoriesService', () => {
  let prisma: PrismaMock;
  let service: CategoriesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  it('liste les categories par nom', async () => {
    const categories = [{ id: 'category-1', name: 'Tech' }];
    prisma.category.findMany.mockResolvedValue(categories);

    await expect(service.getAll()).resolves.toBe(categories);

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
  });

  it('cree une categorie trimmee et refuse les doublons', async () => {
    prisma.category.findFirst.mockResolvedValue(null);
    prisma.category.create.mockResolvedValue({
      id: 'category-1',
      name: 'Tech',
    });

    await expect(service.create({ name: '  Tech  ' })).resolves.toEqual({
      id: 'category-1',
      name: 'Tech',
    });

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        name: {
          equals: 'Tech',
          mode: 'insensitive',
        },
      },
    });
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: 'Tech' },
    });

    prisma.category.findFirst.mockResolvedValue({
      id: 'category-1',
      name: 'Tech',
    });

    await expect(service.create({ name: 'tech' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuse une categorie vide', async () => {
    await expect(service.create({ name: '   ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('met a jour une categorie existante sans collision de nom', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Old',
    });
    prisma.category.findFirst.mockResolvedValue(null);
    prisma.category.update.mockResolvedValue({
      id: 'category-1',
      name: 'New',
    });

    await expect(
      service.update('category-1', { name: '  New  ' }),
    ).resolves.toEqual({
      id: 'category-1',
      name: 'New',
    });

    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { name: 'New' },
    });
  });

  it('refuse de supprimer une categorie utilisee par des evenements', async () => {
    prisma.event.count.mockResolvedValue(2);

    await expect(service.remove('category-1')).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('transforme une suppression inexistante en NotFoundException', async () => {
    prisma.event.count.mockResolvedValue(0);
    prisma.category.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Missing category', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
