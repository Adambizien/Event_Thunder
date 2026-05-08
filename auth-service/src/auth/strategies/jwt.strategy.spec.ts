import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthService } from '../auth.service';
import { JwtStrategy } from './jwt.strategy';
import { readSecret } from '../../utils/secret.util';

jest.mock('../../utils/secret.util', () => ({
  readSecret: jest.fn(),
}));

describe('JwtStrategy', () => {
  const readSecretMock = readSecret as jest.MockedFunction<typeof readSecret>;
  let isTokenBlacklisted: jest.Mock<boolean, [string]>;
  let strategy: JwtStrategy;

  beforeEach(() => {
    readSecretMock.mockReturnValue('jwt-secret');
    isTokenBlacklisted = jest.fn<boolean, [string]>().mockReturnValue(false);
    strategy = new JwtStrategy({
      isTokenBlacklisted,
    } as unknown as AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retourne uniquement l id du payload valide', () => {
    const req = {
      headers: { authorization: 'Bearer access-token' },
    } as Request;

    expect(strategy.validate(req, { id: 'user-1' })).toEqual({
      id: 'user-1',
    });
    expect(isTokenBlacklisted).toHaveBeenCalledWith('access-token');
  });

  it('refuse un payload sans id', () => {
    const req = {
      headers: { authorization: 'Bearer access-token' },
    } as Request;

    expect(() => strategy.validate(req, { id: '' })).toThrow(
      UnauthorizedException,
    );
  });

  it('refuse un token blackliste', () => {
    isTokenBlacklisted.mockReturnValue(true);
    const req = {
      headers: { authorization: 'Bearer revoked-token' },
    } as Request;

    expect(() => strategy.validate(req, { id: 'user-1' })).toThrow(
      UnauthorizedException,
    );
  });
});
