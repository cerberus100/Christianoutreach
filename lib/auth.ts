import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

/**
 * JWT payload interface
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  type: 'access' | 'refresh';
}

/**
 * Token response interface
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Cookie options for different environments and token types
 */
const getCookieOptions = (
  isProduction: boolean = process.env.NODE_ENV === 'production',
  tokenType: 'access' | 'refresh' = 'access'
) => {
  const baseOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  };

  // Access tokens: 4 hours
  if (tokenType === 'access') {
    return {
      ...baseOptions,
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
    };
  }

  // Refresh tokens: 30 days
  return {
    ...baseOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
};

/**
 * Set access token as HttpOnly cookie
 */
export function setAccessTokenCookie(res: NextApiResponse, token: string): void {
  const cookieName = 'health-screening-access';
  const options = getCookieOptions(true, 'access');

  res.setHeader('Set-Cookie', `${cookieName}=${token}; ${Object.entries(options)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')}`);
}

/**
 * Set refresh token as HttpOnly cookie
 */
export function setRefreshTokenCookie(res: NextApiResponse, token: string): void {
  const cookieName = 'health-screening-refresh';
  const options = getCookieOptions(true, 'refresh');

  res.setHeader('Set-Cookie', `${cookieName}=${token}; ${Object.entries(options)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')}`);
}

/**
 * Clear auth cookies
 */
export function clearAuthCookies(res: NextApiResponse): void {
  const accessOptions = getCookieOptions(true, 'access');
  const refreshOptions = getCookieOptions(true, 'refresh');

  res.setHeader('Set-Cookie', [
    `health-screening-access=; ${Object.entries(accessOptions)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')}; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `health-screening-refresh=; ${Object.entries(refreshOptions)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  ]);
}

/**
 * Set both access and refresh tokens as HttpOnly cookies
 */
export function setAuthTokens(res: NextApiResponse, accessToken: string, refreshToken: string): void {
  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);
}

/**
 * Extract access token from HttpOnly cookie
 */
export function getAccessTokenFromCookie(req: NextApiRequest): string | null {
  try {
    const cookies = parse(req.headers.cookie || '');
    return cookies['health-screening-access'] || null;
  } catch {
    return null;
  }
}

/**
 * Extract refresh token from HttpOnly cookie
 */
export function getRefreshTokenFromCookie(req: NextApiRequest): string | null {
  try {
    const cookies = parse(req.headers.cookie || '');
    return cookies['health-screening-refresh'] || null;
  } catch {
    return null;
  }
}

/**
 * Middleware to verify access token from HttpOnly cookie
 */
export function verifyAuth(req: NextApiRequest): boolean {
  return hasValidToken(req);
}

/**
 * Verify refresh token from HttpOnly cookie
 */
export function verifyRefreshToken(req: NextApiRequest): boolean {
  const token = getRefreshTokenFromCookie(req);
  if (!token) {
    return false;
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-development';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded.type === 'refresh';
  } catch {
    return false;
  }
}

/**
 * Extract user information from access token in cookie
 */
export function getUserFromToken(req: NextApiRequest): JwtPayload | null {
  const token = getAccessTokenFromCookie(req);
  if (!token) {
    return null;
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-development';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded.type === 'access' ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Extract user information from refresh token in cookie
 */
export function getUserFromRefreshToken(req: NextApiRequest): JwtPayload | null {
  const token = getRefreshTokenFromCookie(req);
  if (!token) {
    return null;
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-development';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded.type === 'refresh' ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Check if user has specific role
 */
export function hasRole(req: NextApiRequest, role: string): boolean {
  const user = getUserFromToken(req);
  return !!(user && user.role === role);
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
      message: 'Please log in to access this resource',
      requiresAuth: true
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
 * Check if request has valid access token or refresh token
 */
export function hasValidToken(req: NextApiRequest): boolean {
  const accessToken = getAccessTokenFromCookie(req);
  const refreshToken = getRefreshTokenFromCookie(req);

  if (!accessToken && !refreshToken) {
    return false;
  }

  // If we have an access token, verify it's valid
  if (accessToken) {
    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-for-development';
      const decoded = jwt.verify(accessToken, secret) as JwtPayload;
      return decoded.type === 'access';
    } catch {
      // Access token is invalid/expired
    }
  }

  // If we have a refresh token, verify it's valid
  if (refreshToken) {
    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-for-development';
      const decoded = jwt.verify(refreshToken, secret) as JwtPayload;
      return decoded.type === 'refresh';
    } catch {
      // Refresh token is invalid/expired
    }
  }

  return false;
}

/**
 * Generate access token (4 hours)
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-development';

  const tokenPayload: JwtPayload = {
    ...payload,
    type: 'access',
  };

  return jwt.sign(tokenPayload, secret, {
    expiresIn: '4h',
  });
}

/**
 * Generate refresh token (30 days)
 */
export function generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-development';

  const tokenPayload: JwtPayload = {
    ...payload,
    type: 'refresh',
  };

  return jwt.sign(tokenPayload, secret, {
    expiresIn: '30d',
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: Omit<JwtPayload, 'type'>): { accessToken: string; refreshToken: string } {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
} 