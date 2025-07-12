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
    // Generate QR code with high error correction for better shape tolerance
    const qr = new QRCode({
      content: url as string,
      width: 400,
      height: 400,
      color: '#1e293b',
      background: 'transparent',
      ecl: 'H', // High error correction (allows for more distortion)
      join: true,
      pretty: true,
      container: 'svg-viewbox',
      xmlDeclaration: false,
      padding: 1,
    });

    // Get the SVG string
    const svgString = qr.svg();

    // Create a prayer hands shaped QR code
    const prayerHandsQR = `<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Prayer hands shape as clipping mask -->
        <clipPath id="prayerHandsClip">
          <path d="M200 50 
                   C190 45, 180 50, 175 60
                   L175 150
                   C175 160, 170 170, 160 175
                   L140 185
                   C130 190, 125 200, 125 210
                   L125 280
                   C125 300, 130 320, 140 335
                   L155 365
                   C165 380, 175 390, 185 395
                   L195 400
                   C198 402, 202 402, 205 400
                   L215 395
                   C225 390, 235 380, 245 365
                   L260 335
                   C270 320, 275 300, 275 280
                   L275 210
                   C275 200, 270 190, 260 185
                   L240 175
                   C230 170, 225 160, 225 150
                   L225 60
                   C220 50, 210 45, 200 50 Z" 
                   fill="white"/>
        </clipPath>
        
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
      <rect width="400" height="500" fill="white"/>
      
      <!-- Prayer hands outline -->
      <path d="M200 50 
               C190 45, 180 50, 175 60
               L175 150
               C175 160, 170 170, 160 175
               L140 185
               C130 190, 125 200, 125 210
               L125 280
               C125 300, 130 320, 140 335
               L155 365
               C165 380, 175 390, 185 395
               L195 400
               C198 402, 202 402, 205 400
               L215 395
               C225 390, 235 380, 245 365
               L260 335
               C270 320, 275 300, 275 280
               L275 210
               C275 200, 270 190, 260 185
               L240 175
               C230 170, 225 160, 225 150
               L225 60
               C220 50, 210 45, 200 50 Z" 
               fill="url(#prayerGradient)" 
               stroke="#8B5CF6" 
               stroke-width="2"
               filter="url(#dropShadow)"/>
      
      <!-- QR Code clipped to prayer hands shape -->
      <g transform="translate(0, 25)" clip-path="url(#prayerHandsClip)">
        ${svgString.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
      </g>
      
      <!-- Decorative elements -->
      <g opacity="0.6">
        <!-- Small crosses at corners -->
        <g transform="translate(50, 30)">
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#8B5CF6" stroke-width="2"/>
          <line x1="-5" y1="0" x2="5" y2="0" stroke="#8B5CF6" stroke-width="2"/>
        </g>
        <g transform="translate(350, 30)">
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#8B5CF6" stroke-width="2"/>
          <line x1="-5" y1="0" x2="5" y2="0" stroke="#8B5CF6" stroke-width="2"/>
        </g>
      </g>
      
      <!-- Inspirational text -->
      <text x="200" y="460" text-anchor="middle" font-size="14" fill="#6B46C1" font-family="serif" font-weight="bold">Health & Hope</text>
      <text x="200" y="480" text-anchor="middle" font-size="10" fill="#8B5CF6" font-family="serif">Scan to connect with care</text>
      
    </svg>`;

    // Set response headers
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    if (name) {
      res.setHeader('Content-Disposition', `attachment; filename="${name}-prayer-qr.svg"`);
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename="prayer-qr.svg"');
    }

    // Send the prayer hands shaped QR code
    res.status(200).send(prayerHandsQR);

  } catch (error) {
    console.error('Prayer QR Code generation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate prayer hands QR code',
    });
  }
} 