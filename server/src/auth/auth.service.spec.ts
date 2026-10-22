import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const jwt = { sign: jest.fn().mockReturnValue('token') } as unknown as JwtService;

  it('login rejects unknown users and wrong passwords', async () => {
    const prisma: any = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new AuthService(prisma, jwt);
    await expect(service.login({ username: 'x', password: 'y' })).rejects.toThrow(
      UnauthorizedException,
    );

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      username: 'x',
      role: 'PLAYER',
      passwordHash: await bcrypt.hash('right', 4),
    });
    await expect(service.login({ username: 'x', password: 'wrong' })).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.login({ username: 'x', password: 'right' })).resolves.toEqual({
      accessToken: 'token',
      role: 'PLAYER',
    });
  });

  it('register rejects duplicate usernames', async () => {
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      player: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new AuthService(prisma, jwt);
    await expect(service.register({ username: 'dup', password: 'secret1' })).rejects.toThrow(
      ConflictException,
    );
  });
});
