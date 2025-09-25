import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '@/types';
import { setAuthTokens, clearAuthCookies, generateTokenPair, JwtPayload, getClientIP } from '@/lib/auth';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { validateData, loginSchema, LoginInput } from '@/lib/validation';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<LoginResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, 'LOGIN');

  // Add rate limit headers
  const rateLimitHeaders = createRateLimitHeaders(rateLimitResult.remainingAttempts, rateLimitResult.resetTime, 'LOGIN');
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (!rateLimitResult.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIP} at ${new Date().toISOString()}`);

    return res.status(429).json({
      success: false,
      error: 'Too many login attempts',
      message: 'Please try again later',
      retryAfter: rateLimitResult.resetTime,
    });
  }

  try {
    // Validate request body using Zod
    const validation = validateData(loginSchema, req.body);

    if (!validation.success) {
      console.warn(`Invalid login attempt - validation failed from IP: ${clientIP} at ${new Date().toISOString()}: ${validation.errors.join(', ')}`);

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid login credentials',
        validationErrors: validation.errors,
      });
    }

    const { email, password }: LoginInput = validation.data;

    // Demo credentials (replace with database lookup in production)
    const demoUser = {
      id: 'admin-001',
      email: 'admin@demo.org',
      hashedPassword: await bcrypt.hash('demo123', 10),
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
    };

    // In production, replace this with database query:
    // const user = await getUserByEmail(email);
    const user = email === demoUser.email ? demoUser : null;

    if (!user) {
      console.warn(`Failed login attempt - invalid email: ${email} from IP: ${clientIP} at ${new Date().toISOString()}`);

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);

    if (!isValidPassword) {
      console.warn(`Failed login attempt - invalid password for email: ${email} from IP: ${clientIP} at ${new Date().toISOString()}`);

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate access and refresh tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set HttpOnly cookies
    setAuthTokens(res, tokens.accessToken, tokens.refreshToken);

    // Log successful login (in production, save to database)
    console.log(`✅ Admin login successful - User: ${email}, IP: ${clientIP}, UserAgent: ${req.headers['user-agent']}, Timestamp: ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      message: 'Login successful',
    });

  } catch (error) {
    console.error('Auth API error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
}

// Logout endpoint - POST /api/admin/auth/logout
export async function logoutHandler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{}>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Clear the auth cookies
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Logged out successfully',
    });

  } catch (error) {
    console.error('Logout API error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Logout failed',
    });
  }
} 