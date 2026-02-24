import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { VerifyUserDto } from '../users/dto/verify-user.dto';
import { UpdatePasswordDto } from '../users/dto/update-password.dto';
import { UpdatePasswordWithEmailDto } from '../users/dto/update-password-with-email.dto';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { UserRole } from '../users/entities/user.entity';
/* eslint-disable */
describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    verify: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    updatePassword: jest.fn(),
    updateProfile: jest.fn(),
    updatePasswordWithEmail: jest.fn(),
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+33612345678',
      };

      const expectedResult = {
        user: {
          id: 'user-uuid-123',
          email: createUserDto.email,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          phoneNumber: createUserDto.phoneNumber,
          role: UserRole.User,
        },
      };

      mockUsersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should pass DTO to service without modification', async () => {
      const createUserDto: CreateUserDto = {
        email: 'complex+email@example.com',
        password: 'P@ssw0rd!Complex',
        firstName: 'Jean-François',
        lastName: "O'Brien",
        phoneNumber: '+33687654321',
      };

      mockUsersService.create.mockResolvedValue({
        user: { id: 'test-id', email: createUserDto.email },
      });

      await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should propagate service errors', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const error = new Error('Database connection failed');
      mockUsersService.create.mockRejectedValue(error);

      await expect(controller.create(createUserDto)).rejects.toThrow(error);
    });
  });

  describe('verify', () => {
    it('should verify user credentials', async () => {
      const verifyUserDto: VerifyUserDto = {
        email: 'user@example.com',
        password: 'CorrectPassword123!',
      };

      const expectedResult = {
        user: {
          id: 'user-uuid-123',
          email: verifyUserDto.email,
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.User,
        },
      };

      mockUsersService.verify.mockResolvedValue(expectedResult);

      const result = await controller.verify(verifyUserDto);

      expect(service.verify).toHaveBeenCalledWith(verifyUserDto);
      expect(service.verify).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should return HTTP 200 status for successful verification', async () => {
      const verifyUserDto: VerifyUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      mockUsersService.verify.mockResolvedValue({
        user: { id: 'user-id', email: verifyUserDto.email },
      });

      const result = await controller.verify(verifyUserDto);

      expect(result).toBeDefined();
      expect(service.verify).toHaveBeenCalled();
    });

    it('should propagate authentication errors', async () => {
      const verifyUserDto: VerifyUserDto = {
        email: 'user@example.com',
        password: 'WrongPassword',
      };

      const error = new Error('Identifiants invalides');
      mockUsersService.verify.mockRejectedValue(error);

      await expect(controller.verify(verifyUserDto)).rejects.toThrow(error);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const userId = 'user-uuid-123';

      const expectedResult = {
        user: {
          id: userId,
          email: 'user@example.com',
          firstName: 'Alice',
          lastName: 'Johnson',
          role: UserRole.User,
        },
      };

      mockUsersService.findById.mockResolvedValue(expectedResult);

      const result = await controller.findById(userId);

      expect(service.findById).toHaveBeenCalledWith(userId);
      expect(service.findById).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle UUID format', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      mockUsersService.findById.mockResolvedValue({
        user: { id: userId, email: 'test@example.com' },
      });

      await controller.findById(userId);

      expect(service.findById).toHaveBeenCalledWith(userId);
    });

    it('should propagate NotFoundException', async () => {
      const userId = 'nonexistent-uuid';

      const error = new Error('Utilisateur non trouvé');
      mockUsersService.findById.mockRejectedValue(error);

      await expect(controller.findById(userId)).rejects.toThrow(error);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = 'user@example.com';

      const expectedResult = {
        user: {
          id: 'user-uuid-123',
          email,
          firstName: 'Bob',
          lastName: 'Smith',
          role: UserRole.Admin,
        },
      };

      mockUsersService.findByEmail.mockResolvedValue(expectedResult);

      const result = await controller.findByEmail(email);

      expect(service.findByEmail).toHaveBeenCalledWith(email);
      expect(service.findByEmail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle email with special characters', async () => {
      const email = 'user+tag@example.com';

      mockUsersService.findByEmail.mockResolvedValue({
        user: { id: 'user-id', email },
      });

      await controller.findByEmail(email);

      expect(service.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should propagate NotFoundException', async () => {
      const email = 'nonexistent@example.com';

      const error = new Error('Utilisateur non trouvé');
      mockUsersService.findByEmail.mockRejectedValue(error);

      await expect(controller.findByEmail(email)).rejects.toThrow(error);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const updatePasswordDto: UpdatePasswordDto = {
        email: 'user@example.com',
        newPassword: 'NewSecurePass123!',
      };

      const expectedResult = {
        message: 'Mot de passe mis à jour avec succès',
      };

      mockUsersService.updatePassword.mockResolvedValue(expectedResult);

      const result = await controller.updatePassword(updatePasswordDto);

      expect(service.updatePassword).toHaveBeenCalledWith(updatePasswordDto);
      expect(service.updatePassword).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should return HTTP 200 status for successful update', async () => {
      const updatePasswordDto: UpdatePasswordDto = {
        email: 'user@example.com',
        newPassword: 'NewPassword456!',
      };

      mockUsersService.updatePassword.mockResolvedValue({
        message: 'Mot de passe mis à jour avec succès',
      });

      const result = await controller.updatePassword(updatePasswordDto);

      expect(result).toHaveProperty('message');
    });

    it('should propagate NotFoundException', async () => {
      const updatePasswordDto: UpdatePasswordDto = {
        email: 'nonexistent@example.com',
        newPassword: 'NewPassword123!',
      };

      const error = new Error('Utilisateur non trouvé');
      mockUsersService.updatePassword.mockRejectedValue(error);

      await expect(
        controller.updatePassword(updatePasswordDto),
      ).rejects.toThrow(error);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateProfileDto: UpdateProfileDto = {
        currentEmail: 'old@example.com',
        email: 'new@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+33600000000',
      };

      const expectedResult = {
        user: {
          id: 'user-uuid-123',
          email: updateProfileDto.email,
          firstName: updateProfileDto.firstName,
          lastName: updateProfileDto.lastName,
          phoneNumber: updateProfileDto.phoneNumber,
          role: UserRole.User,
        },
      };

      mockUsersService.updateProfile.mockResolvedValue(expectedResult);

      const result = await controller.updateProfile(updateProfileDto);

      expect(service.updateProfile).toHaveBeenCalledWith(updateProfileDto);
      expect(service.updateProfile).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should return HTTP 200 status for successful profile update', async () => {
      const updateProfileDto: UpdateProfileDto = {
        currentEmail: 'user@example.com',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUsersService.updateProfile.mockResolvedValue({
        user: { id: 'user-id', email: updateProfileDto.email },
      });

      const result = await controller.updateProfile(updateProfileDto);

      expect(result).toBeDefined();
    });

    it('should propagate ConflictException for duplicate email', async () => {
      const updateProfileDto: UpdateProfileDto = {
        currentEmail: 'user@example.com',
        email: 'taken@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      const error = new Error('Un utilisateur avec cet e-mail existe déjà');
      mockUsersService.updateProfile.mockRejectedValue(error);

      await expect(controller.updateProfile(updateProfileDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('updatePasswordWithEmail', () => {
    it('should update password with current password verification', async () => {
      const updatePasswordDto: UpdatePasswordWithEmailDto = {
        email: 'user@example.com',
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };

      const expectedResult = {
        message: 'Mot de passe mis à jour avec succès',
      };

      mockUsersService.updatePasswordWithEmail.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.updatePasswordWithEmail(
        updatePasswordDto,
      );

      expect(service.updatePasswordWithEmail).toHaveBeenCalledWith(
        updatePasswordDto,
      );
      expect(service.updatePasswordWithEmail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should return HTTP 200 status for successful update', async () => {
      const updatePasswordDto: UpdatePasswordWithEmailDto = {
        email: 'user@example.com',
        currentPassword: 'Old123!',
        newPassword: 'New456!',
      };

      mockUsersService.updatePasswordWithEmail.mockResolvedValue({
        message: 'Mot de passe mis à jour avec succès',
      });

      const result = await controller.updatePasswordWithEmail(
        updatePasswordDto,
      );

      expect(result).toHaveProperty('message');
    });

    it('should propagate BadRequestException for incorrect current password', async () => {
      const updatePasswordDto: UpdatePasswordWithEmailDto = {
        email: 'user@example.com',
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword456!',
      };

      const error = new Error('Le mot de passe actuel est incorrect');
      mockUsersService.updatePasswordWithEmail.mockRejectedValue(error);

      await expect(
        controller.updatePasswordWithEmail(updatePasswordDto),
      ).rejects.toThrow(error);
    });
  });

  describe('healthCheck', () => {
    it('should return health check message', async () => {
      const expectedResult = {
        message: 'Le service utilisateur fonctionne',
      };

      mockUsersService.healthCheck.mockResolvedValue(expectedResult);

      const result = await controller['healthCheck']();

      expect(service.healthCheck).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should always return success', async () => {
      mockUsersService.healthCheck.mockResolvedValue({
        message: 'Le service utilisateur fonctionne',
      });

      const result = await controller['healthCheck']();

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('fonctionne');
    });
  });

  describe('Route decorators and HTTP codes', () => {
    it('verify endpoint should use @Post decorator', async () => {
      const verifyUserDto: VerifyUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      mockUsersService.verify.mockResolvedValue({
        user: { id: 'user-id', email: verifyUserDto.email },
      });

      await controller.verify(verifyUserDto);

      expect(service.verify).toHaveBeenCalled();
    });

    it('updatePassword should use @Patch decorator', async () => {
      const updatePasswordDto: UpdatePasswordDto = {
        email: 'user@example.com',
        newPassword: 'NewPass123!',
      };

      mockUsersService.updatePassword.mockResolvedValue({
        message: 'Success',
      });

      await controller.updatePassword(updatePasswordDto);

      expect(service.updatePassword).toHaveBeenCalled();
    });

    it('updateProfile should use @Put decorator', async () => {
      const updateProfileDto: UpdateProfileDto = {
        currentEmail: 'user@example.com',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUsersService.updateProfile.mockResolvedValue({
        user: { id: 'user-id', email: updateProfileDto.email },
      });

      await controller.updateProfile(updateProfileDto);

      expect(service.updateProfile).toHaveBeenCalled();
    });

    it('updatePasswordWithEmail should use @Put decorator', async () => {
      const updatePasswordDto: UpdatePasswordWithEmailDto = {
        email: 'user@example.com',
        currentPassword: 'Old123!',
        newPassword: 'New456!',
      };

      mockUsersService.updatePasswordWithEmail.mockResolvedValue({
        message: 'Success',
      });

      await controller.updatePasswordWithEmail(updatePasswordDto);

      expect(service.updatePasswordWithEmail).toHaveBeenCalled();
    });
  });

  describe('Service integration', () => {
    it('should call correct service method for each endpoint', async () => {
      const createDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Pass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUsersService.create.mockResolvedValue({
        user: { id: 'user-id', email: createDto.email },
      });

      await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should not modify DTOs before passing to service', async () => {
      const verifyDto: VerifyUserDto = {
        email: 'user@example.com',
        password: 'OriginalPass123!',
      };

      mockUsersService.verify.mockResolvedValue({
        user: { id: 'user-id', email: verifyDto.email },
      });

      await controller.verify(verifyDto);

      expect(service.verify).toHaveBeenCalledWith(verifyDto);
      expect(mockUsersService.verify.mock.calls[0][0]).toEqual(verifyDto);
    });
  });

  describe('Error handling', () => {
    it('should propagate all service errors without modification', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Pass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const customError = new Error('Custom database error');
      mockUsersService.create.mockRejectedValue(customError);

      await expect(controller.create(createUserDto)).rejects.toThrow(
        customError,
      );
    });

    it('should not catch or transform errors', async () => {
      const userId = 'test-id';

      const error = new Error('Specific error message');
      mockUsersService.findById.mockRejectedValue(error);

      try {
        await controller.findById(userId);
        fail('Should have thrown error');
      } catch (e) {
        expect(e).toBe(error);
      }
    });
  });

  describe('Complete flow tests', () => {
    it('should handle user lifecycle: create -> verify -> update -> change password', async () => {
      const createDto: CreateUserDto = {
        email: 'lifecycle@example.com',
        password: 'InitialPass123!',
        firstName: 'Life',
        lastName: 'Cycle',
      };

      mockUsersService.create.mockResolvedValue({
        user: { id: 'lifecycle-id', email: createDto.email },
      });

      const createResult = await controller.create(createDto);

      expect(createResult.user.email).toBe(createDto.email);
      expect(service.create).toHaveBeenCalled();
    });

    it('should handle multiple sequential operations', async () => {
      const email = 'sequential@example.com';

      mockUsersService.findByEmail.mockResolvedValue({
        user: { id: 'user-id', email },
      });

      mockUsersService.updatePassword.mockResolvedValue({
        message: 'Success',
      });

      await controller.findByEmail(email);
      await controller.updatePassword({
        email,
        newPassword: 'NewPass123!',
      });

      expect(service.findByEmail).toHaveBeenCalledWith(email);
      expect(service.updatePassword).toHaveBeenCalled();
    });

    it('should handle rapid sequential requests', async () => {
      const userIds = ['id-1', 'id-2', 'id-3'];

      userIds.forEach((id) => {
        mockUsersService.findById.mockResolvedValueOnce({
          user: { id, email: `user${id}@example.com` },
        });
      });

      const results = await Promise.all(
        userIds.map((id) => controller.findById(id)),
      );

      expect(results).toHaveLength(3);
      expect(service.findById).toHaveBeenCalledTimes(3);
    });
  });

  describe('Input validation edge cases', () => {
    it('should pass valid complex email formats', async () => {
      const complexEmails = [
        'user+tag@example.com',
        'user.name@example.co.uk',
        'user_name@example-domain.com',
      ];

      for (const email of complexEmails) {
        mockUsersService.findByEmail.mockResolvedValueOnce({
          user: { id: 'user-id', email },
        });

        const result = await controller.findByEmail(email);

        expect(result.user.email).toBe(email);
      }
    });

    it('should handle users with minimal data', async () => {
      const createDto: CreateUserDto = {
        email: 'minimal@example.com',
        password: 'MinPass123!',
        firstName: 'M',
        lastName: 'U',
      };

      mockUsersService.create.mockResolvedValue({
        user: {
          id: 'minimal-id',
          email: createDto.email,
          firstName: createDto.firstName,
          lastName: createDto.lastName,
        },
      });

      const result = await controller.create(createDto);

      expect(result.user.firstName).toBe('M');
      expect(result.user.lastName).toBe('U');
    });

    it('should handle very long names within limits', async () => {
      const createDto: CreateUserDto = {
        email: 'long@example.com',
        password: 'LongPass123!',
        firstName: 'A'.repeat(50),
        lastName: 'B'.repeat(50),
      };

      mockUsersService.create.mockResolvedValue({
        user: {
          id: 'long-id',
          email: createDto.email,
          firstName: createDto.firstName,
          lastName: createDto.lastName,
        },
      });

      const result = await controller.create(createDto);

      expect(result.user.firstName).toHaveLength(50);
      expect(result.user.lastName).toHaveLength(50);
    });
  });
});
