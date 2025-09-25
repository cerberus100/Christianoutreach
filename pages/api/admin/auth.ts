import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '@/types';
import { setAuthCookie, clearAuthCookie, generateToken, JwtPayload } from '@/lib/auth';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
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

  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

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
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(tokenPayload);

    // Set HttpOnly cookie
    setAuthCookie(res, token);

    // Log successful login (in production, save to database)
    console.warn(`Admin login successful: ${email} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      data: {
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
    // Clear the auth cookie
    clearAuthCookie(res);

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