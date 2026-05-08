import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

type UsersServiceMock = {
  create: jest.Mock;
  verify: jest.Mock;
  findById: jest.Mock;
  findByEmail: jest.Mock;
  updatePassword: jest.Mock;
  updateProfile: jest.Mock;
  updatePasswordWithEmail: jest.Mock;
  healthCheck: jest.Mock;
  getAllUsers: jest.Mock;
  deleteUser: jest.Mock;
  updateRole: jest.Mock;
};

const createUsersServiceMock = (): UsersServiceMock => ({
  create: jest.fn(),
  verify: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  updatePassword: jest.fn(),
  updateProfile: jest.fn(),
  updatePasswordWithEmail: jest.fn(),
  healthCheck: jest.fn(),
  getAllUsers: jest.fn(),
  deleteUser: jest.fn(),
  updateRole: jest.fn(),
});

describe('UsersController', () => {
  let service: UsersServiceMock;
  let controller: UsersController;

  beforeEach(() => {
    service = createUsersServiceMock();
    controller = new UsersController(service as unknown as UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegue les endpoints publics essentiels au service', async () => {
    service.create.mockResolvedValue({ user: { id: 'user-1' } });
    service.verify.mockResolvedValue({ user: { id: 'user-1' } });
    service.findById.mockResolvedValue({ user: { id: 'user-1' } });
    service.findByEmail.mockResolvedValue({ user: { id: 'user-1' } });

    await expect(
      controller.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Secret123!',
      }),
    ).resolves.toEqual({ user: { id: 'user-1' } });
    await expect(
      controller.verify({
        email: 'john@example.com',
        password: 'Secret123!',
      }),
    ).resolves.toEqual({ user: { id: 'user-1' } });
    await expect(controller.findById('user-1')).resolves.toEqual({
      user: { id: 'user-1' },
    });
    await expect(controller.findByEmail('john@example.com')).resolves.toEqual({
      user: { id: 'user-1' },
    });
  });

  it('protege la mise a jour de profil contre un autre utilisateur', async () => {
    const dto = {
      currentEmail: 'john@example.com',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    await expect(
      controller.updateProfile(dto, {
        user: { email: 'other@example.com', role: 'User' },
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(service.updateProfile).not.toHaveBeenCalled();
  });

  it('autorise un admin a modifier le profil d un autre utilisateur', async () => {
    const dto = {
      currentEmail: 'john@example.com',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };
    service.updateProfile.mockResolvedValue({ user: { id: 'user-1' } });

    await expect(
      controller.updateProfile(dto, {
        user: { email: 'admin@example.com', role: 'Admin' },
      } as never),
    ).resolves.toEqual({ user: { id: 'user-1' } });
  });

  it('protege le changement de mot de passe contre un autre utilisateur', async () => {
    const dto = {
      email: 'john@example.com',
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    };

    await expect(
      controller.updatePasswordWithEmail(dto, {
        user: { email: 'other@example.com', role: 'User' },
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(service.updatePasswordWithEmail).not.toHaveBeenCalled();
  });

  it('delegue les actions admin au service', async () => {
    service.getAllUsers.mockResolvedValue({ users: [] });
    service.deleteUser.mockResolvedValue({ message: 'ok' });
    service.updateRole.mockResolvedValue({ user: { id: 'user-1' } });

    await expect(controller.getAllUsers()).resolves.toEqual({ users: [] });
    await expect(controller.deleteUser('user-1')).resolves.toEqual({
      message: 'ok',
    });
    await expect(
      controller.updateRole({ userId: 'user-1', role: UserRole.Admin }),
    ).resolves.toEqual({ user: { id: 'user-1' } });
  });
});
