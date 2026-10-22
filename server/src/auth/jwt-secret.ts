import { ConfigService } from '@nestjs/config';

/** JWT secret from env; production refuses to start without one. */
export function jwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (secret) return secret;
  if (config.get<string>('NODE_ENV') === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'dev-secret-change-me';
}
