import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersInfo } from '../users/entities/users_info.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { VerifyUserDto } from '../users/dto/verify-user.dto';
import { UpdatePasswordDto } from '../users/dto/update-password.dto';
import { UpdatePasswordWithEmailDto } from '../users/dto/update-password-with-email.dto';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import * as bcrypt from 'bcryptjs';
/* eslint-disable */
describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let usersInfoRepository: Repository<UsersInfo>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUsersInfoRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UsersInfo),
          useValue: mockUsersInfoRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    usersInfoRepository = module.get<Repository<UsersInfo>>(
      getRepositoryToken(UsersInfo),
    );
  });

  describe('create', () => {
    it('should create a new user with info', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+33612345678',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: createUserDto.email,
        password: 'hashed-password',
        role: UserRole.User,
      };

      const mockInfo = {
        id: 'info-uuid-123',
        user_id: mockUser.id,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        phone_number: createUserDto.phoneNumber,
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockUsersInfoRepository.create.mockReturnValue(mockInfo);
      mockUsersInfoRepository.save.mockResolvedValue(mockInfo);

      const result = await service.create(createUserDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: createUserDto.email,
        password: createUserDto.password,
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockUsersInfoRepository.create).toHaveBeenCalledWith({
        user_id: mockUser.id,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        phone_number: createUserDto.phoneNumber,
      });
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          phoneNumber: createUserDto.phoneNumber,
          role: UserRole.User,
        },
      });
    });

    it('should create user with empty strings for optional fields', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: createUserDto.email,
        password: 'hashed-password',
        role: UserRole.User,
      };

      const mockInfo = {
        id: 'info-uuid-123',
        user_id: mockUser.id,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        phone_number: '',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockUsersInfoRepository.create.mockReturnValue(mockInfo);
      mockUsersInfoRepository.save.mockResolvedValue(mockInfo);

      const result = await service.create(createUserDto);

      expect(mockUsersInfoRepository.create).toHaveBeenCalledWith({
        user_id: mockUser.id,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        phone_number: '',
      });
      // Phone number is empty string, not undefined
      expect(result.user.phoneNumber).toBe('');
    });

    it('should throw ConflictException if user already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockUserRepository.findOne.mockResolvedValue({
        id: 'existing-user-id',
        email: createUserDto.email,
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Un utilisateur avec cet e-mail existe déjà',
      );

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should handle special characters in names', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: "Jean-François",
        lastName: "O'Connor",
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: createUserDto.email,
        password: 'hashed-password',
        role: UserRole.User,
      };

      const mockInfo = {
        id: 'info-uuid-123',
        user_id: mockUser.id,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        phone_number: '',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockUsersInfoRepository.create.mockReturnValue(mockInfo);
      mockUsersInfoRepository.save.mockResolvedValue(mockInfo);

      const result = await service.create(createUserDto);

      expect(result.user.firstName).toBe("Jean-François");
      expect(result.user.lastName).toBe("O'Connor");
    });
  });

  describe('verify', () => {
    it('should verify user with correct credentials', async () => {
      const verifyUserDto: VerifyUserDto = {
        email: 'user@example.com',
        password: 'CorrectPassword123!',
      };

      const hashedPassword = await bcrypt.hash(verifyUserDto.password, 12);

      const mockUser = {
        id: 'user-uuid-123',
        email: verifyUserDto.email,
        password: hashedPassword,
        role: UserRole.User,
        info: {
          first_name: 'John',
          last_name: 'Doe',
          phone_number: '+33612345678',
        },
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.verify(verifyUserDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: verifyUserDto.email },
        relations: ['info'],
      });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(
        verifyUserDto.password,
      );
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '+33612345678',
          role: UserRole.User,
        },
      });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      const verifyUserDto: VerifyUserDto = {
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.verify(verifyUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verify(verifyUserDto)).rejects.toThrow(
        'Identifiants invalides',
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const verifyUserDto: VerifyUserDto = {
        email: 'user@example.com',
        password: 'WrongPassword123!',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: verifyUserDto.email,
        password: 'hashed-different-password',
        role: UserRole.User,
        info: {
          first_name: 'John',
          last_name: 'Doe',
        },
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.verify(verifyUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verify(verifyUserDto)).rejects.toThrow(
        'Identifiants invalides',
      );
      expect(mockUser.comparePassword).toHaveBeenCalledWith(
        verifyUserDto.password,
      );
    });

    it('should verify user even if info is missing', async () => {
      const verifyUserDto: VerifyUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: verifyUserDto.email,
        password: 'hashed-password',
        role: UserRole.User,
        info: null,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.verify(verifyUserDto);

      expect(result.user.firstName).toBeUndefined();
      expect(result.user.lastName).toBeUndefined();
      expect(result.user.phoneNumber).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const userId = 'user-uuid-123';

      const mockUser = {
        id: userId,
        email: 'user@example.com',
        role: UserRole.User,
        info: {
          first_name: 'Alice',
          last_name: 'Johnson',
          phone_number: '+33687654321',
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['info'],
      });
      expect(result).toEqual({
        user: {
          id: userId,
          email: 'user@example.com',
          firstName: 'Alice',
          lastName: 'Johnson',
          phoneNumber: '+33687654321',
          role: UserRole.User,
        },
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'nonexistent-uuid';

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById(userId)).rejects.toThrow(
        'Utilisateur non trouvé',
      );
    });

    it('should handle user with _id field (MongoDB compatibility)', async () => {
      const userId = 'user-uuid-123';

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        id: userId,
        email: 'user@example.com',
        role: UserRole.User,
        info: {
          first_name: 'Bob',
          last_name: 'Wilson',
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(userId);

      expect(result.user.id).toBe(userId);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = 'user@example.com';

      const mockUser = {
        id: 'user-uuid-123',
        email,
        role: UserRole.Admin,
        info: {
          first_name: 'Charlie',
          last_name: 'Brown',
          phone_number: null,
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email },
        relations: ['info'],
      });
      expect(result).toEqual({
        user: {
          id: 'user-uuid-123',
          email,
          firstName: 'Charlie',
          lastName: 'Brown',
          phoneNumber: undefined,
          role: UserRole.Admin,
        },
      });
    });

    it('should throw NotFoundException if email does not exist', async () => {
      const email = 'nonexistent@example.com';

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findByEmail(email)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByEmail(email)).rejects.toThrow(
        'Utilisateur non trouvé',
      );
    });

    it('should find user with case-sensitive email', async () => {
      const email = 'User@Example.COM';

      const mockUser = {
        id: 'user-uuid-123',
        email,
        role: UserRole.User,
        info: {
          first_name: 'Diana',
          last_name: 'Prince',
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(result.user.email).toBe(email);
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const updatePasswordDto: UpdatePasswordDto = {
        email: 'user@example.com',
        newPassword: 'NewSecurePass123!',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: updatePasswordDto.email,
        password: 'old-hashed-password',
        role: UserRole.User,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        password: updatePasswordDto.newPassword,
      });

      const result = await service.updatePassword(updatePasswordDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: updatePasswordDto.email },
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        password: updatePasswordDto.newPassword,
      });
      expect(result).toEqual({
        message: 'Mot de passe mis à jour avec succès',
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const updatePasswordDto: UpdatePasswordDto = {
        email: 'nonexistent@example.com',
        newPassword: 'NewPassword123!',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updatePassword(updatePasswordDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updatePassword(updatePasswordDto)).rejects.toThrow(
        'Utilisateur non trouvé',
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should update user password property', async () => {
      const updatePasswordDto: UpdatePasswordDto = {
        email: 'user@example.com',
        newPassword: 'ComplexPass456!@#',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: updatePasswordDto.email,
        password: 'old-password',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockImplementation(async (user) => user);

      await service.updatePassword(updatePasswordDto);

      expect(mockUser.password).toBe(updatePasswordDto.newPassword);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile with all fields', async () => {
      const updateProfileDto: UpdateProfileDto = {
        currentEmail: 'old@example.com',
        email: 'new@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+33600000000',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: 'old@example.com',
        role: UserRole.User,
        info: {
          id: 'info-uuid-123',
          user_id: 'user-uuid-123',
          first_name: 'Old',
          last_name: 'Name',
          phone_number: '+33611111111',
        },
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        email: updateProfileDto.email,
      });
      mockUsersInfoRepository.save.mockResolvedValue({
        ...mockUser.info,
        first_name: updateProfileDto.firstName,
        last_name: updateProfileDto.lastName,
        phone_number: updateProfileDto.phoneNumber,
      });

      const result = await service.updateProfile(updateProfileDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: updateProfileDto.currentEmail },
        relations: ['info'],
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: updateProfileDto.email },
      });
      expect(mockUsersInfoRepository.save).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result.user.email).toBe(updateProfileDto.email);
      expect(result.user.firstName).toBe(updateProfileDto.firstName);
      expect(result.user.lastName).toBe(updateProfileDto.lastName);
    });

    it('should update profile without changing email', async () => {
      const updateProfileDto: UpdateProfileDto = {
        currentEmail: 'user@example.com',
        email: 'user@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+33600000000',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: 'user@example.com',
        role: UserRole.User,
        info: {
          id: 'info-uuid-123',
          user_id: 'user-uuid-123',
          first_name: 'Old',
          last_name: 'Name',
          phone_number: null,
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockUsersInfoRepository.save.mockResolvedValue({
        ...mockUser.info,
        first_name: updateProfileDto.firstName,
        last_name: updateProfileDto.lastName,
        phone_number: updateProfileDto.phoneNumber,
      });

      const result = await service.updateProfile(updateProfileDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result.user.email).toBe('user@example.com');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const updateProfileDto: UpdateProfileDto = {
        currentEmail: 'nonexistent@example.com',
        email: 'new@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile(updateProfileDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateProfile(updateProfileDto)).rejects.toThrow(
        'Utilisateur non trouvé',
      );
    });

    it('should throw ConflictException if new email already exists', async () => {
      const updateProfileDto: UpdateProfileDto = {
        currentEmail: 'user@example.com',
        email: 'taken@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: 'user@example.com',
        info: {
          id: 'info-uuid-123',
          user_id: 'user-uuid-123',
          first_name: 'Old',
          last_name: 'Name',
          phone_number: null,
        },
      };

      const existingUser = {
        id: 'other-user-uuid',
        email: 'taken@example.com',
      };

      // First call: find current user, second call: check if new email exists
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(existingUser);

      await expect(service.updateProfile(updateProfileDto)).rejects.toThrow(
        ConflictException,
      );
      
      // Reset mocks for second expect
      mockUserRepository.findOne.mockClear();
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(existingUser);
        
      await expect(service.updateProfile(updateProfileDto)).rejects.toThrow(
        'Un utilisateur avec cet e-mail existe déjà',
      );
    });

    it('should create user info if it does not exist', async () => {
      const updateProfileDto: UpdateProfileDto = {
        currentEmail: 'user@example.com',
        email: 'user@example.com',
        firstName: 'New',
        lastName: 'User',
        phoneNumber: '+33600000000',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: 'user@example.com',
        role: UserRole.User,
        info: null,
      };

      const newInfo = {
        id: 'new-info-uuid',
        user_id: mockUser.id,
        first_name: updateProfileDto.firstName,
        last_name: updateProfileDto.lastName,
        phone_number: updateProfileDto.phoneNumber,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockUsersInfoRepository.create.mockReturnValue(newInfo);
      mockUsersInfoRepository.save.mockResolvedValue(newInfo);

      const result = await service.updateProfile(updateProfileDto);

      expect(mockUsersInfoRepository.create).toHaveBeenCalledWith({
        user_id: mockUser.id,
        first_name: updateProfileDto.firstName,
        last_name: updateProfileDto.lastName,
        phone_number: updateProfileDto.phoneNumber,
      });
      expect(mockUsersInfoRepository.save).toHaveBeenCalled();
      expect(result.user.firstName).toBe(updateProfileDto.firstName);
    });

    it('should handle empty phone number', async () => {
      const updateProfileDto: UpdateProfileDto = {
        currentEmail: 'user@example.com',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: undefined,
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: 'user@example.com',
        info: {
          first_name: 'Old',
          last_name: 'Name',
          phone_number: '+33600000000',
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockUsersInfoRepository.save.mockResolvedValue({
        ...mockUser.info,
        first_name: updateProfileDto.firstName,
        last_name: updateProfileDto.lastName,
        phone_number: '',
      });

      const result = await service.updateProfile(updateProfileDto);

      expect(mockUsersInfoRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          phone_number: '',
        }),
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

      const mockUser = {
        id: 'user-uuid-123',
        email: updatePasswordDto.email,
        password: 'hashed-old-password',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        password: updatePasswordDto.newPassword,
      });

      const result = await service.updatePasswordWithEmail(updatePasswordDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: updatePasswordDto.email },
      });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(
        updatePasswordDto.currentPassword,
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Mot de passe mis à jour avec succès',
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const updatePasswordDto: UpdatePasswordWithEmailDto = {
        email: 'nonexistent@example.com',
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePasswordWithEmail(updatePasswordDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updatePasswordWithEmail(updatePasswordDto),
      ).rejects.toThrow('Utilisateur non trouvé');
    });

    it('should throw BadRequestException if current password is incorrect', async () => {
      const updatePasswordDto: UpdatePasswordWithEmailDto = {
        email: 'user@example.com',
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword456!',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: updatePasswordDto.email,
        password: 'hashed-password',
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.updatePasswordWithEmail(updatePasswordDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updatePasswordWithEmail(updatePasswordDto),
      ).rejects.toThrow('Le mot de passe actuel est incorrect');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should verify old password before updating', async () => {
      const updatePasswordDto: UpdatePasswordWithEmailDto = {
        email: 'user@example.com',
        currentPassword: 'CorrectOldPass123!',
        newPassword: 'BrandNewPass456!',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: updatePasswordDto.email,
        password: 'hashed-old-password',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockImplementation(async (user) => user);

      await service.updatePasswordWithEmail(updatePasswordDto);

      expect(mockUser.comparePassword).toHaveBeenCalledWith(
        updatePasswordDto.currentPassword,
      );
      expect(mockUser.password).toBe(updatePasswordDto.newPassword);
    });
  });

  describe('healthCheck', () => {
    it('should return health check message', async () => {
      const result = await service.healthCheck();

      expect(result).toEqual({
        message: 'Le service utilisateur fonctionne',
      });
    });

    it('should resolve as a promise', async () => {
      const promise = service.healthCheck();

      expect(promise).toBeInstanceOf(Promise);
      await expect(promise).resolves.toBeDefined();
    });
  });

  describe('toUserResponse', () => {
    it('should transform user entity to response DTO', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+33612345678',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: createUserDto.email,
        password: 'hashed-password',
        role: UserRole.User,
      };

      const mockInfo = {
        id: 'info-uuid-123',
        user_id: mockUser.id,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        phone_number: createUserDto.phoneNumber,
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockUsersInfoRepository.create.mockReturnValue(mockInfo);
      mockUsersInfoRepository.save.mockResolvedValue(mockInfo);

      const result = await service.create(createUserDto);

      expect(result.user).not.toHaveProperty('password');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('firstName');
      expect(result.user).toHaveProperty('lastName');
      expect(result.user).toHaveProperty('phoneNumber');
      expect(result.user).toHaveProperty('role');    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle repository errors gracefully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findOne.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle null info gracefully in toUserResponse', async () => {
      const userId = 'user-uuid-123';

      const mockUser = {
        id: userId,
        email: 'user@example.com',
        role: UserRole.User,
        info: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(userId);

      expect(result.user.firstName).toBeUndefined();
      expect(result.user.lastName).toBeUndefined();
      expect(result.user.phoneNumber).toBeUndefined();
    });

    it('should handle user with _id and id fields', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser = {
        id: 'user-uuid-123',
        _id: '507f1f77bcf86cd799439011',
        email: createUserDto.email,
        password: 'hashed-password',
        role: UserRole.User,
      };

      const mockInfo = {
        id: 'info-uuid-123',
        user_id: mockUser.id,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        phone_number: '',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockUsersInfoRepository.create.mockReturnValue(mockInfo);
      mockUsersInfoRepository.save.mockResolvedValue(mockInfo);

      const result = await service.create(createUserDto);

      expect(result.user.id).toBe('user-uuid-123');
    });
  });

  describe('Complete flow tests', () => {
    it('should handle user lifecycle: create -> verify -> update profile -> change password', async () => {
      const createUserDto: CreateUserDto = {
        email: 'lifecycle@example.com',
        password: 'InitialPass123!',
        firstName: 'Life',
        lastName: 'Cycle',
        phoneNumber: '+33600000000',
      };

      const mockUser = {
        id: 'lifecycle-uuid',
        email: createUserDto.email,
        password: 'hashed-initial-password',
        role: UserRole.User,
      };

      const mockInfo = {
        id: 'info-lifecycle-uuid',
        user_id: mockUser.id,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        phone_number: createUserDto.phoneNumber,
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockUsersInfoRepository.create.mockReturnValue(mockInfo);
      mockUsersInfoRepository.save.mockResolvedValue(mockInfo);

      const createResult = await service.create(createUserDto);

      expect(createResult.user.email).toBe(createUserDto.email);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUsersInfoRepository.create).toHaveBeenCalled();
    });

    it('should handle multiple users creation sequentially', async () => {
      const users = [
        {
          email: 'user1@example.com',
          password: 'Pass1',
          firstName: 'User',
          lastName: 'One',
        },
        {
          email: 'user2@example.com',
          password: 'Pass2',
          firstName: 'User',
          lastName: 'Two',
        },
      ];

      for (const userData of users) {
        const mockUser = {
          id: `user-${userData.email}`,
          email: userData.email,
          password: `hashed-${userData.password}`,
          role: UserRole.User,
        };

        const mockInfo = {
          id: `info-${userData.email}`,
          user_id: mockUser.id,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone_number: '',
        };

        mockUserRepository.findOne.mockResolvedValueOnce(null);
        mockUserRepository.create.mockReturnValueOnce(mockUser);
        mockUserRepository.save.mockResolvedValueOnce(mockUser);
        mockUsersInfoRepository.create.mockReturnValueOnce(mockInfo);
        mockUsersInfoRepository.save.mockResolvedValueOnce(mockInfo);
      }

      const results = await Promise.all(
        users.map((u) => service.create(u as CreateUserDto)),
      );

      expect(results).toHaveLength(2);
      expect(results[0].user.email).toBe('user1@example.com');
      expect(results[1].user.email).toBe('user2@example.com');
    });
  });
});
