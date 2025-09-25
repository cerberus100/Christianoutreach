import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, clearAuthCookies, getClientIP } from '@/lib/auth';
import { ApiResponse } from '@/types';

interface InvalidateSessionResponse {
  invalidated: boolean;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<InvalidateSessionResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Verify admin authentication
  const user = requireAdmin(req, res);
  if (!user) return; // Response already sent by requireAdmin

  const clientIP = getClientIP(req);

  try {
    // Clear all auth cookies
    clearAuthCookies(res);

    // Log session invalidation (in production, save to database)
    console.log(`🔒 Session invalidated - User: ${user.email}, IP: ${clientIP}, UserAgent: ${req.headers['user-agent']}, Timestamp: ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      data: {
        invalidated: true,
        message: 'All sessions have been invalidated',
      },
      message: 'Session invalidated successfully',
    });

  } catch (error) {
    console.error('Session invalidation error:', error);

    res.status(500).json({
      success: false,
      error: 'Session invalidation failed',
      message: 'Failed to invalidate session',
    });
  }
}
