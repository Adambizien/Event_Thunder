import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

type UserRecord = {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  info?: {
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
  } | null;
};

type UserModelMock = {
  findUnique: jest.Mock<Promise<UserRecord | null>, [Record<string, unknown>]>;
  create: jest.Mock<Promise<UserRecord>, [Record<string, unknown>]>;
  update: jest.Mock<Promise<UserRecord>, [Record<string, unknown>]>;
  findMany: jest.Mock<Promise<UserRecord[]>, [Record<string, unknown>]>;
  delete: jest.Mock<Promise<UserRecord>, [Record<string, unknown>]>;
};

const createUser = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  id: 'user-1',
  email: 'john@example.com',
  password: '$2b$12$hashed-password',
  role: UserRole.User,
  info: {
    first_name: 'John',
    last_name: 'Doe',
    phone_number: '0612345678',
  },
  ...overrides,
});

const createPrismaMock = (): { user: UserModelMock } => ({
  user: {
    findUnique: jest.fn<
      Promise<UserRecord | null>,
      [Record<string, unknown>]
    >(),
    create: jest.fn<Promise<UserRecord>, [Record<string, unknown>]>(),
    update: jest.fn<Promise<UserRecord>, [Record<string, unknown>]>(),
    findMany: jest.fn<Promise<UserRecord[]>, [Record<string, unknown>]>(),
    delete: jest.fn<Promise<UserRecord>, [Record<string, unknown>]>(),
  },
});

describe('UsersService', () => {
  const bcryptMock = bcrypt as unknown as {
    genSalt: jest.Mock<Promise<string>, [number]>;
    hash: jest.Mock<Promise<string>, [string, string]>;
    compare: jest.Mock<Promise<boolean>, [string, string]>;
  };
  let prisma: { user: UserModelMock };
  let service: UsersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UsersService(prisma as unknown as PrismaService);
    bcryptMock.genSalt.mockResolvedValue('$2b$12$salt');
    bcryptMock.hash.mockImplementation((password) =>
      Promise.resolve(`$2b$12$hashed:${String(password)}`),
    );
    bcryptMock.compare.mockImplementation((plain, hash) =>
      Promise.resolve(hash === `$2b$12$hashed:${String(plain)}`),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('cree un utilisateur avec un mot de passe hashe et sans exposer le hash', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation((params) => {
      const data = params.data as {
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

      return Promise.resolve(
        createUser({
          email: data.email,
          password: data.password,
          info: {
            first_name: data.info.create.first_name,
            last_name: data.info.create.last_name,
            phone_number: data.info.create.phone_number,
          },
        }),
      );
    });

    const result = await service.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '0612345678',
      password: 'PlainPassword123!',
    });

    expect(result).toEqual({
      user: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '0612345678',
        role: UserRole.User,
      },
    });
    const [createParams] = prisma.user.create.mock.calls[0];
    const data = createParams.data as { password: string };
    expect(data.password).not.toBe('PlainPassword123!');
    expect(data.password).toBe('$2b$12$hashed:PlainPassword123!');
    expect(bcryptMock.genSalt).toHaveBeenCalledWith(12);
    expect(bcryptMock.hash).toHaveBeenCalledWith(
      'PlainPassword123!',
      '$2b$12$salt',
    );
  });

  it('refuse la creation quand email existe deja', async () => {
    prisma.user.findUnique.mockResolvedValue(createUser());

    await expect(
      service.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'PlainPassword123!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('ne re-hashe pas un mot de passe deja bcrypt', async () => {
    const existingHash = '$2b$12$already-hashed-password';
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(
      createUser({
        password: existingHash,
      }),
    );

    await service.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: existingHash,
    });

    const [createParams] = prisma.user.create.mock.calls[0];
    expect((createParams.data as { password: string }).password).toBe(
      existingHash,
    );
  });

  it('verifie un utilisateur avec un mot de passe valide', async () => {
    const password = '$2b$12$hashed:Secret123!';
    prisma.user.findUnique.mockResolvedValue(createUser({ password }));

    await expect(
      service.verify({
        email: 'john@example.com',
        password: 'Secret123!',
      }),
    ).resolves.toEqual({
      user: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '0612345678',
        role: UserRole.User,
      },
    });
  });

  it('refuse la verification si utilisateur absent ou mot de passe invalide', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.verify({ email: 'missing@example.com', password: 'Secret123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    prisma.user.findUnique.mockResolvedValueOnce(
      createUser({ password: '$2b$12$hashed:Secret123!' }),
    );

    await expect(
      service.verify({ email: 'john@example.com', password: 'Wrong123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('met a jour le profil et refuse un nouvel email deja pris', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(createUser())
      .mockResolvedValueOnce(createUser({ id: 'other-user' }));

    await expect(
      service.updateProfile({
        currentEmail: 'john@example.com',
        email: 'taken@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.user.findUnique
      .mockResolvedValueOnce(createUser())
      .mockResolvedValueOnce(null);
    prisma.user.update.mockResolvedValue(
      createUser({
        email: 'jane@example.com',
        info: {
          first_name: 'Jane',
          last_name: 'Doe',
          phone_number: '',
        },
      }),
    );

    await expect(
      service.updateProfile({
        currentEmail: 'john@example.com',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    ).resolves.toEqual({
      user: {
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phoneNumber: '',
        role: UserRole.User,
      },
    });

    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: 'user-1' },
      data: {
        email: 'jane@example.com',
        info: {
          upsert: {
            update: {
              first_name: 'Jane',
              last_name: 'Doe',
              phone_number: '',
            },
            create: {
              first_name: 'Jane',
              last_name: 'Doe',
              phone_number: '',
            },
          },
        },
      },
      include: { info: true },
    });
  });

  it('change le mot de passe seulement si le mot de passe actuel est valide', async () => {
    prisma.user.findUnique.mockResolvedValue(
      createUser({ password: '$2b$12$hashed:OldPassword123!' }),
    );

    await expect(
      service.updatePasswordWithEmail({
        email: 'john@example.com',
        currentPassword: 'wrong',
        newPassword: 'NewPassword123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.updatePasswordWithEmail({
        email: 'john@example.com',
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    ).resolves.toEqual({ message: 'Mot de passe mis à jour avec succès' });

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const [updateParams] = prisma.user.update.mock.calls[0];
    const password = (updateParams.data as { password: string }).password;
    expect(password).toBe('$2b$12$hashed:NewPassword123!');
  });

  it('renvoie les utilisateurs et supprime uniquement un utilisateur existant', async () => {
    prisma.user.findMany.mockResolvedValue([
      createUser(),
      createUser({
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.Admin,
        info: null,
      }),
    ]);

    await expect(service.getAllUsers()).resolves.toEqual({
      users: [
        {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phoneNumber: '0612345678',
          role: UserRole.User,
        },
        {
          id: 'admin-1',
          firstName: undefined,
          lastName: undefined,
          email: 'admin@example.com',
          phoneNumber: undefined,
          role: UserRole.Admin,
        },
      ],
    });

    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.deleteUser('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.user.findUnique.mockResolvedValueOnce(createUser());
    prisma.user.delete.mockResolvedValue(createUser());
    await expect(service.deleteUser('user-1')).resolves.toEqual({
      message: 'Utilisateur supp rimé avec succès',
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
  });

  it('met a jour le role d un utilisateur existant', async () => {
    prisma.user.findUnique.mockResolvedValue(createUser());
    prisma.user.update.mockResolvedValue(createUser({ role: UserRole.Admin }));

    await expect(
      service.updateRole({ userId: 'user-1', role: UserRole.Admin }),
    ).resolves.toEqual({
      user: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '0612345678',
        role: UserRole.Admin,
      },
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: UserRole.Admin },
      include: { info: true },
    });
  });
});
