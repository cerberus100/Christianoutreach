import { NextApiRequest, NextApiResponse } from 'next';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { serialize, parse } from 'cookie';
import { AUTH_COOKIE_NAMES, AuthTokenClaims } from '@/types';

const isProduction = process.env.NODE_ENV === 'production';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export function signAuthToken(
  payload: Omit<AuthTokenClaims, 'exp' | 'iat'>,
  expiresIn: SignOptions['expiresIn'] = '8h'
): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyAuthToken(token: string): AuthTokenClaims {
  return jwt.verify(token, getJwtSecret()) as AuthTokenClaims;
}

function extractTokenFromHeader(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function extractTokenFromCookies(req: NextApiRequest): string | null {
  if (!req.headers.cookie) {
    return null;
  }
  const cookies = parse(req.headers.cookie);
  const token = cookies[AUTH_COOKIE_NAMES.accessToken];
  return token ? token : null;
}

export function getTokenFromRequest(req: NextApiRequest): string | null {
  return extractTokenFromHeader(req) || extractTokenFromCookies(req);
}

export function requireAuth(req: NextApiRequest): AuthTokenClaims {
  const token = getTokenFromRequest(req);
  if (!token) {
    throw new Error('Unauthorized');
  }
  return verifyAuthToken(token);
}

export function requireAdmin(req: NextApiRequest): AuthTokenClaims {
  const claims = requireAuth(req);
  if (claims.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return claims;
}

export function setAuthCookie(res: NextApiResponse, token: string): void {
  const cookie = serialize(AUTH_COOKIE_NAMES.accessToken, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 4, // 4 hours
  });
  res.setHeader('Set-Cookie', cookie);
}

export function clearAuthCookie(res: NextApiResponse): void {
  const cookie = serialize(AUTH_COOKIE_NAMES.accessToken, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  res.setHeader('Set-Cookie', cookie);
} 