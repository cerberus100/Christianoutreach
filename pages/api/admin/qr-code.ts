import { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode';
import { requireAdmin } from '@/lib/auth';

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

  // Verify admin authentication for QR code generation
  const user = requireAdmin(req, res);
  if (!user) return; // Response already sent by requireAdmin

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