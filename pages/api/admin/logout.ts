import { NextApiRequest, NextApiResponse } from 'next';
import { clearAuthCookie } from '@/lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  clearAuthCookie(res);
  return res.status(200).json({ success: true, message: 'Logged out' });
}

