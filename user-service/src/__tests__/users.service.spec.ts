import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

type UserCreateArgs = {
  data: {
    email: string;
    password: string;
    info: {
      create: {
        first_name: string;
        last_name: string;
        phone_number: string;
      };
    };
  };
};

describe('UsersService', () => {
  let service: UsersService;

  const mockFindUnique = jest.fn<Promise<unknown>, [unknown]>();
  const mockFindMany = jest.fn<Promise<unknown[]>, [unknown?]>();
  const mockCreate = jest.fn<
    Promise<{
      id: string;
      email: string;
      password: string;
      role: string;
      info: {
        first_name: string;
        last_name: string;
        phone_number: string;
      };
    }>,
    [UserCreateArgs]
  >();
  const mockUpdate = jest.fn<Promise<unknown>, [unknown]>();
  const mockDelete = jest.fn<Promise<unknown>, [unknown]>();

  const mockPrisma = {
    user: {
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('creates user with hashed password', async () => {
    const dto = {
      email: 'john@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    let createdPassword = '';

    mockFindUnique.mockResolvedValueOnce(null);
    mockCreate.mockImplementationOnce(({ data }) => {
      createdPassword = data.password;
      return Promise.resolve({
        id: 'user-1',
        email: data.email,
        password: data.password,
        role: 'User',
        info: {
          first_name: data.info.create.first_name,
          last_name: data.info.create.last_name,
          phone_number: data.info.create.phone_number,
        },
      });
    });

    const result = await service.create(dto);

    expect(result.user.email).toBe(dto.email);
    expect(result.user.role).toBe('User');
    expect(await bcrypt.compare(dto.password, createdPassword)).toBe(true);
    expect(mockCreate.mock.calls.length).toBe(1);
  });

  it('throws ConflictException when email already exists', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: '7',
      email: 'john@example.com',
    });

    await expect(
      service.create({
        email: 'john@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('findById throws NotFoundException when user is missing', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(service.findById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deleteUser deletes existing user', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: '1',
      email: 'john@example.com',
    });
    mockDelete.mockResolvedValueOnce({ id: '1' });

    const result = await service.deleteUser('1');

    expect(result.message).toContain('Utilisateur');
    expect(mockDelete.mock.calls.length).toBe(1);
  });
});
