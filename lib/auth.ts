import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

/**
 * Middleware to verify JWT token from Authorization header
 */
export function verifyAuth(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  try {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract user information from JWT token
 */
export function getUserFromToken(req: NextApiRequest): any | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
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