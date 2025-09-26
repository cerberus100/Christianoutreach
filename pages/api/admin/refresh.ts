import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRefreshToken, generateTokenPair, setAuthTokens, clearAuthCookies } from '@/lib/auth';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { ApiResponse } from '@/types';

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  retryAfter?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RefreshResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Rate limiting for refresh attempts
  const clientIP = req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || 'unknown';
  const rateLimitResult = checkRateLimit(clientIP, 'REFRESH');

  // Add rate limit headers
  const rateLimitHeaders = createRateLimitHeaders(rateLimitResult.remainingAttempts, rateLimitResult.resetTime, 'REFRESH');
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (!rateLimitResult.allowed) {
    console.warn(`Refresh rate limit exceeded for IP: ${clientIP} at ${new Date().toISOString()}`);

    return res.status(429).json({
      success: false,
      error: 'Too many refresh attempts',
      message: 'Please try again later',
    });
  }

  try {
    // Verify refresh token exists and is valid
    const refreshTokenUser = getUserFromRefreshToken(req);

    if (!refreshTokenUser) {
      // Clear any existing cookies for security
      clearAuthCookies(res);

      console.warn(`Invalid refresh token attempt from IP: ${clientIP} at ${new Date().toISOString()}`);

      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Please log in again',
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: refreshTokenUser.userId,
      email: refreshTokenUser.email,
      role: refreshTokenUser.role,
    });

    // Set new cookies
    setAuthTokens(res, tokens.accessToken, tokens.refreshToken);

    // Log token refresh (in production, save to database)
    console.log(`✅ Token refreshed - User: ${refreshTokenUser.email}, IP: ${clientIP}, UserAgent: ${req.headers['user-agent']}, Timestamp: ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: refreshTokenUser.userId,
          email: refreshTokenUser.email,
          role: refreshTokenUser.role,
        },
      },
      message: 'Tokens refreshed successfully',
    });

  } catch (error) {
    console.error('Token refresh error:', error);

    // Clear cookies on error
    clearAuthCookies(res);

    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: 'Please log in again',
    });
  }
}
