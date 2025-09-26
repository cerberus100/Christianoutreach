import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { docClient, TABLES } from '@/lib/aws-config';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { setAuthTokens, clearAuthCookies, generateTokenPair, JwtPayload } from '@/lib/auth';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { validateData, loginSchema, LoginInput } from '@/lib/validation';

interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  name: string;
  lastLogin?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
  error?: string;
  message?: string;
  validationErrors?: string[];
  retryAfter?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Rate limiting
  const clientIP = req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || 'unknown';
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

    // Demo admin credentials (original demo credentials for production)
    // Pre-computed hash for 'demo123' to avoid hashing on every request
    const demoAdmin = {
      id: 'demo-admin-001',
      email: 'admin@demo.org',
      passwordHash: '$2a$12$VRpRUR4Fxj3B.ZKaeiMu8u8esw63i41xG1oqvViztI9Rg44Y8zDt6', // demo123
      role: 'admin',
      name: 'Demo Administrator',
    };

    let adminUser: AdminUser | null = null;

    // Check demo credentials first
    if (email === demoAdmin.email) {
      const isValidPassword = await bcrypt.compare(password, demoAdmin.passwordHash);
      if (isValidPassword) {
        adminUser = demoAdmin;
      }
    }

    // If demo login fails, try database lookup
    if (!adminUser) {
      try {
        const scanResult = await docClient.send(new ScanCommand({
          TableName: TABLES.USERS,
          FilterExpression: 'email = :email AND #role = :role',
          ExpressionAttributeNames: {
            '#role': 'role',
          },
          ExpressionAttributeValues: {
            ':email': email.toLowerCase(),
            ':role': 'admin',
          },
        }));

        if (scanResult.Items && scanResult.Items.length > 0) {
          const user = scanResult.Items[0] as AdminUser;
          const isValidPassword = await bcrypt.compare(password, user.passwordHash);
          if (isValidPassword) {
            adminUser = user;
          }
        }
      } catch (dbError) {
        console.error('Database lookup error:', dbError);
        // Continue with demo admin fallback
      }
    }

    if (!adminUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect.',
      });
    }

    // Generate access and refresh tokens
    const tokens = generateTokenPair({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
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
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
      message: 'Login successful',
    });

  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred during authentication.',
    });
  }
}

// Logout endpoint - POST /api/admin/auth/logout
export async function logoutHandler(
  req: NextApiRequest,
  res: NextApiResponse<AuthResponse>
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
      data: undefined,
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