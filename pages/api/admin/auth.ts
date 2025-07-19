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

  try {
    const { email, password }: LoginRequest = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
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
    const demoAdmin = {
      id: 'demo-admin-001',
      email: 'admin@demo.org',
      passwordHash: await bcrypt.hash('demo123', 12),
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