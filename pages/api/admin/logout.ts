import { NextApiRequest, NextApiResponse } from 'next';
import { clearAuthCookies } from '@/lib/auth';
import { ApiResponse } from '@/types';

export default async function handler(
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
