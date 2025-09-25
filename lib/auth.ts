import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

/**
 * JWT payload interface
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Cookie options for different environments
 */
const getCookieOptions = (isProduction: boolean = process.env.NODE_ENV === 'production') => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
});

/**
 * Set JWT token as HttpOnly cookie
 */
export function setAuthCookie(res: NextApiResponse, token: string): void {
  const cookieName = 'health-screening-auth';
  const options = getCookieOptions();

  res.setHeader('Set-Cookie', `${cookieName}=${token}; ${Object.entries(options)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')}`);
}

/**
 * Clear auth cookie
 */
export function clearAuthCookie(res: NextApiResponse): void {
  const cookieName = 'health-screening-auth';
  const options = getCookieOptions();

  res.setHeader('Set-Cookie', `${cookieName}=; ${Object.entries(options)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')}; expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}

/**
 * Extract JWT token from HttpOnly cookie
 */
export function getTokenFromCookie(req: NextApiRequest): string | null {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    return cookies['health-screening-auth'] || null;
  } catch {
    return null;
  }
}

/**
 * Middleware to verify JWT token from HttpOnly cookie
 */
export function verifyAuth(req: NextApiRequest): boolean {
  const token = getTokenFromCookie(req);
  if (!token) {
    return false;
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract user information from JWT token in cookie
 */
export function getUserFromToken(req: NextApiRequest): JwtPayload | null {
  const token = getTokenFromCookie(req);
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if user has specific role
 */
export function hasRole(req: NextApiRequest, role: string): boolean {
  const user = getUserFromToken(req);
  return user && user.role === role;
}

/**
 * Check if user is admin
 */
export function isAdmin(req: NextApiRequest): boolean {
  return hasRole(req, 'admin');
}

/**
 * Admin middleware function - guards admin-only endpoints
 */
export function requireAdmin(req: NextApiRequest, res: NextApiResponse): JwtPayload | null {
  const user = getUserFromToken(req);

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
    return null;
  }

  if (user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      message: 'Admin access required'
    });
    return null;
  }

  return user;
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JwtPayload): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
} 