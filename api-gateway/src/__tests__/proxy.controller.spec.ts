import { Test, TestingModule } from '@nestjs/testing';
import { ProxyController } from '../proxy/proxy.controller';
import { ProxyService, ProxyResult } from '../proxy/proxy.service';
import { Request, Response } from 'express';
/* eslint-disable */
describe('ProxyController', () => {
  let controller: ProxyController;

  const mockProxyService = {
    forward: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyController],
      providers: [
        {
          provide: ProxyService,
          useValue: mockProxyService,
        },
      ],
    }).compile();

    controller = module.get<ProxyController>(ProxyController);
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('devrait être défini', () => {
      expect(controller).toBeDefined();
    });

    it('devrait transférer la requête et renvoyer la réponse avec succès', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/auth/login',
      } as Request;

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      const mockResult: ProxyResult = {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
        data: { message: 'Success' },
      };

      mockProxyService.forward.mockResolvedValue(mockResult);

      await controller.handle(mockRequest, mockResponse);

      expect(mockProxyService.forward).toHaveBeenCalledWith(mockRequest);
       
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'content-type',
        'application/json',
      );
       
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      expect(mockResponse.send).toHaveBeenCalledWith({ message: 'Success' });
    });

    it('devrait gérer plusieurs headers', async () => {
      const mockRequest = {} as Request;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      const mockResult: ProxyResult = {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
          authorization: 'Bearer token',
        },
        data: {},
      };

      mockProxyService.forward.mockResolvedValue(mockResult);

      await controller.handle(mockRequest, mockResponse);

       
      expect(mockResponse.setHeader).toHaveBeenCalledTimes(3);
       
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'content-type',
        'application/json',
      );
       
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'x-custom-header',
        'custom-value',
      );
       
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'authorization',
        'Bearer token',
      );
    });

    it('devrait ignorer les headers undefined', async () => {
      const mockRequest = {} as Request;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      const mockResult: ProxyResult = {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'undefined-header': undefined,
        },
        data: {},
      };

      mockProxyService.forward.mockResolvedValue(mockResult);

      await controller.handle(mockRequest, mockResponse);

       
      expect(mockResponse.setHeader).toHaveBeenCalledTimes(1);
       
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'content-type',
        'application/json',
      );
    });

    it('devrait gérer les réponses sans headers', async () => {
      const mockRequest = {} as Request;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      const mockResult: ProxyResult = {
        status: 200,
        headers: {},
        data: { message: 'No headers' },
      };

      mockProxyService.forward.mockResolvedValue(mockResult);

      await controller.handle(mockRequest, mockResponse);

       
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
       
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      expect(mockResponse.send).toHaveBeenCalledWith({ message: 'No headers' });
    });

    it('devrait gérer différents codes de statut', async () => {
      const testCases = [200, 201, 400, 401, 404, 500];

      for (const statusCode of testCases) {
        const mockRequest = {} as Request;
        const mockResponse = {
          status: jest.fn().mockReturnThis(),
          send: jest.fn(),
          setHeader: jest.fn(),
        } as unknown as Response;

        const mockResult: ProxyResult = {
          status: statusCode,
          headers: {},
          data: { status: statusCode },
        };

        mockProxyService.forward.mockResolvedValue(mockResult);

        await controller.handle(mockRequest, mockResponse);

         
        expect(mockResponse.status).toHaveBeenCalledWith(statusCode);
      }
    });

    it("devrait retourner une erreur 500 en cas d'erreur du service", async () => {
      const mockRequest = {} as Request;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      const error = new Error('Service error');
      mockProxyService.forward.mockRejectedValue(error);

      await controller.handle(mockRequest, mockResponse);

       
      expect(mockResponse.status).toHaveBeenCalledWith(500);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Erreur de passerelle',
        error: 'Service error',
      });
    });

    it('devrait gérer les erreurs non-Error', async () => {
      const mockRequest = {} as Request;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      mockProxyService.forward.mockRejectedValue('String error');

      await controller.handle(mockRequest, mockResponse);

       
      expect(mockResponse.status).toHaveBeenCalledWith(500);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Erreur de passerelle',
        error: 'String error',
      });
    });

    it('devrait gérer différents types de données de réponse', async () => {
      const mockRequest = {} as Request;

      // Test avec un objet
      const mockResponse1 = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      mockProxyService.forward.mockResolvedValue({
        status: 200,
        headers: {},
        data: { key: 'value' },
      });

      await controller.handle(mockRequest, mockResponse1);
      expect(mockResponse1.send).toHaveBeenCalledWith({ key: 'value' });

      // Test avec une chaîne
      const mockResponse2 = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      mockProxyService.forward.mockResolvedValue({
        status: 200,
        headers: {},
        data: 'plain text',
      });

      await controller.handle(mockRequest, mockResponse2);
      expect(mockResponse2.send).toHaveBeenCalledWith('plain text');

      // Test avec un buffer
      const mockResponse3 = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      const buffer = Buffer.from('test');
      mockProxyService.forward.mockResolvedValue({
        status: 200,
        headers: {},
        data: buffer,
      });

      await controller.handle(mockRequest, mockResponse3);
      expect(mockResponse3.send).toHaveBeenCalledWith(buffer);
    });

    it('devrait gérer les headers null', async () => {
      const mockRequest = {} as Request;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      const mockResult: ProxyResult = {
        status: 200,
        headers: null as any,
        data: {},
      };

      mockProxyService.forward.mockResolvedValue(mockResult);

      await controller.handle(mockRequest, mockResponse);

      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
