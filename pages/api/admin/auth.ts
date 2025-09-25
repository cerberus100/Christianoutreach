import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { docClient, TABLES } from '@/lib/aws-config';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

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
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  error?: string;
  message?: string;
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

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid login credentials',
        validationErrors: validation.errors,
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

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

    // Generate JWT token
    const tokenPayload = {
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      name: adminUser.name,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '8h' }
    );

    // Update last login timestamp (optional for demo)
    if (adminUser.id !== 'demo-admin-001') {
      try {
        // Update last login in database if not demo user
      } catch (updateError) {
        console.warn('Failed to update last login timestamp:', updateError);
      }
    }

    // Successful login
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
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