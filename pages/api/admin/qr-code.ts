import { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode';
// import jwt from 'jsonwebtoken';

// Middleware to verify JWT token (currently unused but may be needed for auth)
/*
function verifyAuth(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  try {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    return true;
  } catch (error) {
    return false;
  }
}
*/

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // For QR code generation, we'll be more lenient with auth
  // since it's often accessed via query params
  const { url, name } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL parameter is required',
    });
  }

  try {
    // QR Code generation options
    const qrOptions = {
      type: 'png' as const,
      quality: 0.92,
      margin: 2,
      color: {
        dark: '#1e293b',  // trust-900 color
        light: '#ffffff'
      },
      width: 400,
    };

    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(url as string, qrOptions);

    // Set response headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', qrCodeBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    if (name) {
      res.setHeader('Content-Disposition', `attachment; filename="${name}-qr-code.png"`);
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename="qr-code.png"');
    }

    // Send the QR code image
    res.status(200).send(qrCodeBuffer);

  } catch (error) {
    console.error('QR Code generation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code',
    });
  }
} 