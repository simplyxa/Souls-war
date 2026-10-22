import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './guards';

const ctx = (user: unknown) =>
  ({
    getHandler: () => ctx,
    getClass: () => RolesGuard,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = new Reflector();

  it('allows routes without role metadata', () => {
    expect(new RolesGuard(reflector).canActivate(ctx({ role: 'PLAYER' }))).toBe(true);
  });

  it('rejects non-admins and accepts admins on admin routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(ctx({ role: 'PLAYER' }))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx({ role: 'ADMIN' }))).toBe(true);
  });
});
