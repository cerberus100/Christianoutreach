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
    // Generate QR code with high error correction for logo in center
    const qr = new QRCode({
      content: url as string,
      width: 400,
      height: 400,
      color: '#1e293b',
      background: '#ffffff',
      ecl: 'H', // High error correction (allows for logo in center)
      join: true,
      pretty: true,
      container: 'svg-viewbox',
      xmlDeclaration: false,
      padding: 2,
    });

    // Get the SVG string
    const svgString = qr.svg();

    // Create a simple, clean prayer hands QR code
    const prayerHandsQR = `<svg viewBox="0 0 450 550" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradient for depth effect -->
        <linearGradient id="prayerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:0.1"/>
          <stop offset="100%" style="stop-color:#6B46C1;stop-opacity:0.2"/>
        </linearGradient>
        
        <!-- Drop shadow filter -->
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="450" height="550" fill="white"/>
      
      <!-- QR Code container with subtle styling -->
      <g transform="translate(25, 50)">
        <!-- QR Code background with gradient -->
        <rect width="400" height="400" fill="url(#prayerGradient)" rx="15" ry="15" filter="url(#dropShadow)"/>
        
        <!-- QR Code -->
        <g transform="translate(0, 0)">
          ${svgString.replace(/<svg[^>]*>/g, '').replace(/<\/svg>/g, '')}
        </g>
        
        <!-- Center circle for prayer hands -->
        <circle cx="200" cy="200" r="35" fill="white" stroke="#8B5CF6" stroke-width="3"/>
        
        <!-- Simple prayer hands emoji in center -->
        <text x="200" y="210" text-anchor="middle" font-size="40" dominant-baseline="middle">🙏</text>
      </g>
      
      <!-- Decorative elements -->
      <g opacity="0.4">
        <!-- Corner accents -->
        <g transform="translate(50, 50)">
          <circle cx="0" cy="0" r="3" fill="#8B5CF6"/>
          <circle cx="350" cy="0" r="3" fill="#8B5CF6"/>
          <circle cx="0" cy="350" r="3" fill="#8B5CF6"/>
          <circle cx="350" cy="350" r="3" fill="#8B5CF6"/>
        </g>
        
        <!-- Subtle cross accent -->
        <g transform="translate(225, 30)">
          <line x1="0" y1="-6" x2="0" y2="6" stroke="#8B5CF6" stroke-width="2"/>
          <line x1="-6" y1="0" x2="6" y2="0" stroke="#8B5CF6" stroke-width="2"/>
        </g>
      </g>
      
      <!-- Clean text styling -->
      <text x="225" y="500" text-anchor="middle" font-size="16" fill="#6B46C1" font-family="serif" font-weight="bold">Health &amp; Hope</text>
      <text x="225" y="520" text-anchor="middle" font-size="12" fill="#8B5CF6" font-family="serif" font-style="italic">Scan to connect with care</text>
      
      <!-- Clean border frame -->
      <rect x="10" y="10" width="430" height="530" fill="none" stroke="#E5E7EB" stroke-width="1" rx="8" ry="8"/>
      
    </svg>`;

    // Set response headers
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    if (name) {
      res.setHeader('Content-Disposition', `attachment; filename="${name}-prayer-qr.svg"`);
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename="prayer-qr.svg"');
    }

    // Send the simple, clean prayer hands QR code
    res.status(200).send(prayerHandsQR);

  } catch (error) {
    console.error('Prayer QR Code generation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate prayer hands QR code',
    });
  }
} 