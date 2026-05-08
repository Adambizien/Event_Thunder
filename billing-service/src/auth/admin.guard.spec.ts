import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

type RequestMock = {
  user?: {
    role?: string;
  };
};

const createContext = (req: RequestMock): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  }) as unknown as ExecutionContext;

describe('AdminGuard', () => {
  it('autorise un administrateur', () => {
    const guard = new AdminGuard();

    expect(guard.canActivate(createContext({ user: { role: 'Admin' } }))).toBe(
      true,
    );
  });

  it('refuse un utilisateur non administrateur', () => {
    const guard = new AdminGuard();

    expect(() =>
      guard.canActivate(createContext({ user: { role: 'User' } })),
    ).toThrow(ForbiddenException);
  });
});
