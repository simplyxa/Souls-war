import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Marks a route as accessible without a JWT. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restricts a route (or controller) to the given roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthUser {
  userId: number;
  username: string;
  role: Role;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user as AuthUser;
});
