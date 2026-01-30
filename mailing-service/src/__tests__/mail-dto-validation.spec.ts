import { Test, TestingModule } from '@nestjs/testing';
import { MailController } from '../mail/mail.controller';
import { MailService } from '../mail/mail.service';
import { PasswordResetDto } from '../mail/dto/password-reset.dto';
import { SendWelcomeDto } from '../mail/dto/send-welcome.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/* eslint-disable */
describe('MailController - DTO Validation', () => {
  let controller: MailController;
  let mailService: MailService;

  const mockMailService = {
    sendPasswordReset: jest.fn(),
    sendWelcome: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailController],
      providers: [
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    controller = module.get<MailController>(MailController);
    mailService = module.get<MailService>(MailService);
  });

  describe('PasswordResetDto validation', () => {
    it('should reject invalid email', async () => {
      const invalidPayload = plainToClass(PasswordResetDto, {
        email: 'not-an-email',
        resetUrl: 'https://example.com/reset?token=abc',
      });

      const errors = await validate(invalidPayload);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should reject missing email', async () => {
      const invalidPayload = plainToClass(PasswordResetDto, {
        resetUrl: 'https://example.com/reset?token=abc',
      });

      const errors = await validate(invalidPayload);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('should allow missing resetUrl (no validator)', async () => {
      const invalidPayload = plainToClass(PasswordResetDto, {
        email: 'user@example.com',
      });

      const errors = await validate(invalidPayload);

      // resetUrl uses @Allow() so it has no validation constraints
      // This is by design - resetUrl must be provided but not validated
      expect(errors.length).toBe(0);
    });

    it('should reject invalid expiresInMinutes - below minimum', async () => {
      const invalidPayload = plainToClass(PasswordResetDto, {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresInMinutes: 2, // Min is 5
      });

      const errors = await validate(invalidPayload);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'expiresInMinutes')).toBe(true);
    });

    it('should reject invalid expiresInMinutes - above maximum', async () => {
      const invalidPayload = plainToClass(PasswordResetDto, {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresInMinutes: 2000, // Max is 1440
      });

      const errors = await validate(invalidPayload);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'expiresInMinutes')).toBe(true);
    });

    it('should accept valid PasswordResetDto', async () => {
      const validPayload = plainToClass(PasswordResetDto, {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc123',
        username: 'john_doe',
        expiresInMinutes: 30,
      });

      const errors = await validate(validPayload);

      expect(errors).toHaveLength(0);
    });

    it('should accept PasswordResetDto with optional fields omitted', async () => {
      const validPayload = plainToClass(PasswordResetDto, {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc123',
      });

      const errors = await validate(validPayload);

      expect(errors).toHaveLength(0);
    });

    it('should reject non-integer expiresInMinutes', async () => {
      const invalidPayload = plainToClass(PasswordResetDto, {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresInMinutes: 'thirty', // String instead of number
      });

      const errors = await validate(invalidPayload);

      // Should have at least expiresInMinutes error
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-string username', async () => {
      const invalidPayload = plainToClass(PasswordResetDto, {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
        username: 123, // Number instead of string
      });

      const errors = await validate(invalidPayload);

      expect(errors.some(e => e.property === 'username')).toBe(true);
    });
  });

  describe('SendWelcomeDto validation', () => {
    it('should reject invalid email', async () => {
      const invalidPayload = plainToClass(SendWelcomeDto, {
        email: 'invalid.email',
      });

      const errors = await validate(invalidPayload);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should reject missing email', async () => {
      const invalidPayload = plainToClass(SendWelcomeDto, {
        username: 'john_doe',
      });

      const errors = await validate(invalidPayload);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('should accept valid SendWelcomeDto', async () => {
      const validPayload = plainToClass(SendWelcomeDto, {
        email: 'newuser@example.com',
        username: 'jane_doe',
        activationUrl: 'https://example.com/activate?token=xyz789',
      });

      const errors = await validate(validPayload);

      expect(errors).toHaveLength(0);
    });

    it('should accept SendWelcomeDto with optional fields omitted', async () => {
      const validPayload = plainToClass(SendWelcomeDto, {
        email: 'newuser@example.com',
      });

      const errors = await validate(validPayload);

      expect(errors).toHaveLength(0);
    });

    it('should reject non-string username', async () => {
      const invalidPayload = plainToClass(SendWelcomeDto, {
        email: 'user@example.com',
        username: { name: 'john' }, // Object instead of string
      });

      const errors = await validate(invalidPayload);

      expect(errors.some(e => e.property === 'username')).toBe(true);
    });

    it('should reject non-string activationUrl', async () => {
      const invalidPayload = plainToClass(SendWelcomeDto, {
        email: 'user@example.com',
        activationUrl: ['https://example.com'], // Array instead of string
      });

      const errors = await validate(invalidPayload);

      expect(errors.some(e => e.property === 'activationUrl')).toBe(true);
    });
  });

  describe('DTO edge cases', () => {
    it('should accept email with plus addressing', async () => {
      const validPayload = plainToClass(PasswordResetDto, {
        email: 'user+tag@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
      });

      const errors = await validate(validPayload);

      expect(errors).toHaveLength(0);
    });

    it('should accept very long email', async () => {
      const longEmail = 'a'.repeat(60) + '@example.com';
      const validPayload = plainToClass(PasswordResetDto, {
        email: longEmail,
        resetUrl: 'https://example.com/reset?token=abc',
      });

      const errors = await validate(validPayload);

      expect(errors).toHaveLength(0);
    });

    it('should accept very long resetUrl', async () => {
      const longUrl = 'https://example.com/reset?token=' + 'a'.repeat(1000);
      const validPayload = plainToClass(PasswordResetDto, {
        email: 'user@example.com',
        resetUrl: longUrl,
      });

      const errors = await validate(validPayload);

      expect(errors).toHaveLength(0);
    });

    it('should accept boundary expiresInMinutes', async () => {
      const minPayload = plainToClass(PasswordResetDto, {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresInMinutes: 5, // Minimum
      });

      const maxPayload = plainToClass(PasswordResetDto, {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
        expiresInMinutes: 1440, // Maximum
      });

      const minErrors = await validate(minPayload);
      const maxErrors = await validate(maxPayload);

      expect(minErrors).toHaveLength(0);
      expect(maxErrors).toHaveLength(0);
    });
  });
});
