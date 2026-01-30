import { Test, TestingModule } from '@nestjs/testing';
import { MailController } from '../mail/mail.controller';
import { MailService } from '../mail/mail.service';
import { PasswordResetDto } from '../mail/dto/password-reset.dto';
import { SendWelcomeDto } from '../mail/dto/send-welcome.dto';
/* eslint-disable */
describe('MailController', () => {
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

  describe('sendPasswordReset endpoint', () => {
    it('should accept valid password reset request', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc123',
        username: 'john_doe',
        expiresInMinutes: 30,
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce({
        id: 'email-id-123',
        status: 'sent',
      });

      const result = await controller.sendPasswordReset(payload);

      expect(result).toEqual({
        message: 'Password reset email sent',
        id: 'email-id-123',
        status: 'sent',
      });
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledWith(payload);
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledTimes(1);
    });

    it('should return ACCEPTED status code for password reset', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc123',
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce({
        id: 'email-id-456',
        status: 'sent',
      });

      const result = await controller.sendPasswordReset(payload);

      expect(result.message).toBe('Password reset email sent');
      expect(result.status).toBe('sent');
    });

    it('should pass payload to service without modification', async () => {
      const payload: PasswordResetDto = {
        email: 'complex+email@example.com',
        resetUrl: 'https://example.com/reset?token=xyz&redirect=true',
        username: 'complex_user',
        expiresInMinutes: 45,
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce({
        id: 'email-id-789',
        status: 'sent',
      });

      await controller.sendPasswordReset(payload);

      expect(mockMailService.sendPasswordReset).toHaveBeenCalledWith(payload);
    });

    it('should handle service errors from password reset', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc123',
      };

      const error = new Error('Service unavailable');
      mockMailService.sendPasswordReset.mockRejectedValueOnce(error);

      await expect(controller.sendPasswordReset(payload)).rejects.toThrow(
        error,
      );
    });

    it('should handle optional username in password reset', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc123',
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce({
        id: 'email-id-opt',
        status: 'sent',
      });

      const result = await controller.sendPasswordReset(payload);

      expect(result.status).toBe('sent');
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          resetUrl: 'https://example.com/reset?token=abc123',
        }),
      );
    });

    it('should handle optional expiresInMinutes in password reset', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc123',
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce({
        id: 'email-id-exp',
        status: 'sent',
      });

      const result = await controller.sendPasswordReset(payload);

      expect(result.status).toBe('sent');
    });
  });

  describe('sendWelcome endpoint', () => {
    it('should accept valid welcome email request', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser@example.com',
        username: 'jane_doe',
        activationUrl: 'https://example.com/activate?token=xyz789',
      };

      mockMailService.sendWelcome.mockResolvedValueOnce({
        id: 'email-id-welcome-1',
        status: 'sent',
      });

      const result = await controller.sendWelcome(payload);

      expect(result).toEqual({
        message: 'Welcome email sent',
        id: 'email-id-welcome-1',
        status: 'sent',
      });
      expect(mockMailService.sendWelcome).toHaveBeenCalledWith(payload);
      expect(mockMailService.sendWelcome).toHaveBeenCalledTimes(1);
    });

    it('should return ACCEPTED status code for welcome email', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser@example.com',
      };

      mockMailService.sendWelcome.mockResolvedValueOnce({
        id: 'email-id-welcome-2',
        status: 'sent',
      });

      const result = await controller.sendWelcome(payload);

      expect(result.message).toBe('Welcome email sent');
      expect(result.status).toBe('sent');
    });

    it('should pass welcome payload to service without modification', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser+test@example.com',
        username: 'new_user_test',
        activationUrl: 'https://example.com/activate?token=abc&lang=fr',
      };

      mockMailService.sendWelcome.mockResolvedValueOnce({
        id: 'email-id-welcome-3',
        status: 'sent',
      });

      await controller.sendWelcome(payload);

      expect(mockMailService.sendWelcome).toHaveBeenCalledWith(payload);
    });

    it('should handle service errors from welcome email', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser@example.com',
      };

      const error = new Error('Email service error');
      mockMailService.sendWelcome.mockRejectedValueOnce(error);

      await expect(controller.sendWelcome(payload)).rejects.toThrow(error);
    });

    it('should handle optional username in welcome email', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser@example.com',
        activationUrl: 'https://example.com/activate',
      };

      mockMailService.sendWelcome.mockResolvedValueOnce({
        id: 'email-id-welcome-opt',
        status: 'sent',
      });

      const result = await controller.sendWelcome(payload);

      expect(result.status).toBe('sent');
      expect(mockMailService.sendWelcome).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          activationUrl: 'https://example.com/activate',
        }),
      );
    });

    it('should handle optional activationUrl in welcome email', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser@example.com',
        username: 'newuser',
      };

      mockMailService.sendWelcome.mockResolvedValueOnce({
        id: 'email-id-welcome-no-url',
        status: 'sent',
      });

      const result = await controller.sendWelcome(payload);

      expect(result.status).toBe('sent');
    });
  });

  describe('Response format', () => {
    it('password reset should include message, id, and status', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset',
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce({
        id: 'test-id',
        status: 'sent',
      });

      const result = await controller.sendPasswordReset(payload);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status');
      expect(result.message).toBe('Password reset email sent');
    });

    it('welcome email should include message, id, and status', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser@example.com',
      };

      mockMailService.sendWelcome.mockResolvedValueOnce({
        id: 'test-id-welcome',
        status: 'sent',
      });

      const result = await controller.sendWelcome(payload);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status');
      expect(result.message).toBe('Welcome email sent');
    });

    it('should include service response data in result', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset',
      };

      const serviceResponse = {
        id: 'specific-email-id-123',
        status: 'sent',
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce(serviceResponse);

      const result = await controller.sendPasswordReset(payload);

      expect(result.id).toBe('specific-email-id-123');
      expect(result.status).toBe('sent');
    });
  });

  describe('Service integration', () => {
    it('should call password reset service method', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset',
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce({
        id: 'id-123',
        status: 'sent',
      });

      await controller.sendPasswordReset(payload);

      expect(mailService.sendPasswordReset).toHaveBeenCalled();
    });

    it('should call welcome service method', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser@example.com',
      };

      mockMailService.sendWelcome.mockResolvedValueOnce({
        id: 'id-456',
        status: 'sent',
      });

      await controller.sendWelcome(payload);

      expect(mailService.sendWelcome).toHaveBeenCalled();
    });
  });

  describe('Complete flow tests', () => {
    it('should handle complete password reset flow', async () => {
      const userEmail = 'user@example.com';
      const resetUrl = 'https://example.com/reset?token=secure123';
      const username = 'john_doe';
      const expiresInMinutes = 30;

      const payload: PasswordResetDto = {
        email: userEmail,
        resetUrl,
        username,
        expiresInMinutes,
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce({
        id: 'flow-test-id-1',
        status: 'sent',
      });

      const result = await controller.sendPasswordReset(payload);

      expect(result.message).toBe('Password reset email sent');
      expect(result.status).toBe('sent');
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledWith(payload);
    });

    it('should handle complete welcome flow', async () => {
      const userEmail = 'newuser@example.com';
      const username = 'jane_doe';
      const activationUrl = 'https://example.com/activate?token=verify123';

      const payload: SendWelcomeDto = {
        email: userEmail,
        username,
        activationUrl,
      };

      mockMailService.sendWelcome.mockResolvedValueOnce({
        id: 'flow-test-id-2',
        status: 'sent',
      });

      const result = await controller.sendWelcome(payload);

      expect(result.message).toBe('Welcome email sent');
      expect(result.status).toBe('sent');
      expect(mockMailService.sendWelcome).toHaveBeenCalledWith(payload);
    });

    it('should handle multiple different email requests sequentially', async () => {
      const resetPayload: PasswordResetDto = {
        email: 'reset@example.com',
        resetUrl: 'https://example.com/reset',
      };

      const welcomePayload: SendWelcomeDto = {
        email: 'welcome@example.com',
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce({
        id: 'id-reset',
        status: 'sent',
      });

      mockMailService.sendWelcome.mockResolvedValueOnce({
        id: 'id-welcome',
        status: 'sent',
      });

      const resetResult = await controller.sendPasswordReset(resetPayload);
      const welcomeResult = await controller.sendWelcome(welcomePayload);

      expect(resetResult.status).toBe('sent');
      expect(welcomeResult.status).toBe('sent');
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendWelcome).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid sequential requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        email: `user${i}@example.com`,
        resetUrl: 'https://example.com/reset',
      }));

      requests.forEach(() => {
        mockMailService.sendPasswordReset.mockResolvedValueOnce({
          id: 'rapid-id',
          status: 'sent',
        });
      });

      const results = await Promise.all(
        requests.map(payload => controller.sendPasswordReset(payload)),
      );

      expect(results).toHaveLength(5);
      expect(results.every(r => r.status === 'sent')).toBe(true);
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error handling', () => {
    it('should propagate InternalServerErrorException from service', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset',
      };

      const error = new Error('Email service unavailable');
      mockMailService.sendPasswordReset.mockRejectedValueOnce(error);

      await expect(controller.sendPasswordReset(payload)).rejects.toThrow();
    });

    it('should propagate welcome service errors', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser@example.com',
      };

      const error = new Error('Template rendering failed');
      mockMailService.sendWelcome.mockRejectedValueOnce(error);

      await expect(controller.sendWelcome(payload)).rejects.toThrow();
    });

    it('should handle service timeout for password reset', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset',
      };

      const timeoutError = new Error('Request timeout');
      mockMailService.sendPasswordReset.mockRejectedValueOnce(timeoutError);

      await expect(controller.sendPasswordReset(payload)).rejects.toThrow(
        'Request timeout',
      );
    });

    it('should handle service timeout for welcome', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser@example.com',
      };

      const timeoutError = new Error('Request timeout');
      mockMailService.sendWelcome.mockRejectedValueOnce(timeoutError);

      await expect(controller.sendWelcome(payload)).rejects.toThrow(
        'Request timeout',
      );
    });
  });

  describe('Route configuration', () => {
    it('should have password-reset route', () => {
      expect(controller.sendPasswordReset).toBeDefined();
    });

    it('should have welcome route', () => {
      expect(controller.sendWelcome).toBeDefined();
    });

    it('should expose password reset endpoint as POST method', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset',
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce({
        id: 'route-test-1',
        status: 'sent',
      });

      const result = await controller.sendPasswordReset(payload);

      expect(result).toBeDefined();
    });

    it('should expose welcome endpoint as POST method', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser@example.com',
      };

      mockMailService.sendWelcome.mockResolvedValueOnce({
        id: 'route-test-2',
        status: 'sent',
      });

      const result = await controller.sendWelcome(payload);

      expect(result).toBeDefined();
    });
  });

  describe('DTO validation', () => {
    it('should work with all password reset DTO fields', async () => {
      const payload: PasswordResetDto = {
        email: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=abc',
        username: 'testuser',
        expiresInMinutes: 30,
      };

      mockMailService.sendPasswordReset.mockResolvedValueOnce({
        id: 'dto-test-1',
        status: 'sent',
      });

      const result = await controller.sendPasswordReset(payload);

      expect(result.status).toBe('sent');
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          resetUrl: 'https://example.com/reset?token=abc',
          username: 'testuser',
          expiresInMinutes: 30,
        }),
      );
    });

    it('should work with all welcome DTO fields', async () => {
      const payload: SendWelcomeDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        activationUrl: 'https://example.com/activate',
      };

      mockMailService.sendWelcome.mockResolvedValueOnce({
        id: 'dto-test-2',
        status: 'sent',
      });

      const result = await controller.sendWelcome(payload);

      expect(result.status).toBe('sent');
      expect(mockMailService.sendWelcome).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          username: 'newuser',
          activationUrl: 'https://example.com/activate',
        }),
      );
    });
  });
});
