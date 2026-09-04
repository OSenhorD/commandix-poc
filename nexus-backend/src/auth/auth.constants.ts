export const JWT_ACCESS_SECRET = process.env['JWT_ACCESS_SECRET'] ?? 'dev-access-secret';
export const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret';
export const JWT_ACCESS_EXPIRES_IN = process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m';
export const JWT_REFRESH_EXPIRES_IN = process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d';

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: 'ADMIN' | 'VIEWER';
  email: string;
}
