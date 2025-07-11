import { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode-svg';

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

  const { url, name } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL parameter is required',
    });
  }

  try {
    // Generate QR code with prayer hands styling
    const qr = new QRCode({
      content: url as string,
      width: 300,
      height: 300,
      color: '#1e293b',
      background: '#ffffff',
      ecl: 'M', // Medium error correction (allows for logo in center)
      join: true,
      pretty: true,
      container: 'svg-viewbox',
      xmlDeclaration: false,
      padding: 2,
    });

    // Get the SVG string
    const svgString = qr.svg();

    // Add prayer hands icon in the center and artistic styling
    const styledSvg = svgString.replace(
      '<svg',
      `<svg style="border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);"`
    ).replace(
      '</svg>',
      `
      <!-- Prayer hands icon in center -->
      <g transform="translate(${300/2 - 25}, ${300/2 - 25})">
        <circle cx="25" cy="25" r="25" fill="white" stroke="#8B5CF6" stroke-width="2"/>
        <g transform="translate(10, 8) scale(0.6)">
          <path d="M12 2L10 4V16L12 18H14L16 16V4L14 2H12Z" fill="#8B5CF6"/>
          <path d="M8 2L6 4V16L8 18H10L12 16V4L10 2H8Z" fill="#8B5CF6"/>
          <path d="M6 18C6 20.21 7.79 22 10 22S14 20.21 14 18V16H6V18Z" fill="#8B5CF6"/>
          <text x="10" y="32" text-anchor="middle" font-size="8" fill="#6B46C1">🙏</text>
        </g>
      </g>
      
      <!-- Decorative corners -->
      <g opacity="0.3">
        <circle cx="40" cy="40" r="3" fill="#8B5CF6"/>
        <circle cx="260" cy="40" r="3" fill="#8B5CF6"/>
        <circle cx="40" cy="260" r="3" fill="#8B5CF6"/>
        <circle cx="260" cy="260" r="3" fill="#8B5CF6"/>
      </g>
      
      <!-- Inspirational text -->
      <text x="150" y="280" text-anchor="middle" font-size="10" fill="#6B46C1" font-family="serif" font-weight="bold">Health & Hope</text>
      
      </svg>`
    );

    // Set response headers
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    if (name) {
      res.setHeader('Content-Disposition', `attachment; filename="${name}-prayer-qr.svg"`);
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename="prayer-qr.svg"');
    }

    // Send the styled SVG
    res.status(200).send(styledSvg);

  } catch (error) {
    console.error('Prayer QR Code generation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate prayer hands QR code',
    });
  }
} 