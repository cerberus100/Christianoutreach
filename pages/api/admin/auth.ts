import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '@/lib/aws-config';
import { ApiResponse, AdminUser } from '@/types';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
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

    // Production admin credentials
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'faith+1';
    
    let user: AdminUser | null = null;

    // Check for hardcoded admin credentials first
    if (email.toLowerCase() === ADMIN_USERNAME) {
      if (password === ADMIN_PASSWORD) {
        user = {
          id: 'admin-prod-001',
          email: 'admin',
          hashedPassword: await bcrypt.hash(ADMIN_PASSWORD, 10),
          role: 'admin',
          firstName: 'System',
          lastName: 'Administrator',
          createdDate: new Date().toISOString(),
          isActive: true,
          permissions: {
            canViewSubmissions: true,
            canExportData: true,
            canManageChurches: true,
            canManageUsers: true,
            canViewAnalytics: true,
          },
        } as AdminUser;
      }
    } else {
      // Try DynamoDB lookup for other users
      try {
        const result = await docClient.send(new QueryCommand({
          TableName: TABLES.USERS,
          IndexName: 'EmailIndex', // Assuming GSI on email
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: {
            ':email': email.toLowerCase(),
          },
        }));

        if (result.Items && result.Items.length > 0) {
          const dbUser = result.Items[0] as AdminUser;
          
          // Verify password for database users
          const isValidPassword = await bcrypt.compare(password, dbUser.hashedPassword);
          if (isValidPassword) {
            user = dbUser;
          }
        }
      } catch (dbError) {
        console.error('Database lookup error:', dbError);
        // Continue to check hardcoded admin if DB fails
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      {
        expiresIn: '24h',
      }
    );

    // Update last login timestamp (only for database users)
    if (user.id !== 'admin-prod-001') {
      try {
        await docClient.send(new UpdateCommand({
          TableName: TABLES.USERS,
          Key: { id: user.id },
          UpdateExpression: 'SET lastLogin = :timestamp',
          ExpressionAttributeValues: {
            ':timestamp': new Date().toISOString(),
          },
        }));
      } catch (updateError) {
        // Log but don't fail login for this
        console.warn('Failed to update last login timestamp:', updateError);
      }
    }

    console.log(`Admin login successful: ${email} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      data: {
        token,
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