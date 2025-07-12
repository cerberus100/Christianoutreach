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

    // Create a clean prayer hands shaped QR code based on the reference design
    const prayerHandsQR = `<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Clean prayer hands shape as clipping mask -->
        <clipPath id="prayerHandsClip">
          <path d="M200 80
                   C205 75, 210 78, 215 85
                   L225 110
                   C230 120, 235 130, 240 140
                   L250 165
                   C255 175, 260 185, 265 195
                   L275 220
                   C280 235, 285 250, 288 265
                   L290 280
                   C292 295, 290 310, 285 325
                   L275 350
                   C270 365, 260 375, 245 380
                   L225 385
                   C215 387, 205 385, 200 380
                   C195 385, 185 387, 175 385
                   L155 380
                   C140 375, 130 365, 125 350
                   L115 325
                   C110 310, 108 295, 110 280
                   L112 265
                   C115 250, 120 235, 125 220
                   L135 195
                   C140 185, 145 175, 150 165
                   L160 140
                   C165 130, 170 120, 175 110
                   L185 85
                   C190 78, 195 75, 200 80 Z" 
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
      <path d="M200 80
               C205 75, 210 78, 215 85
               L225 110
               C230 120, 235 130, 240 140
               L250 165
               C255 175, 260 185, 265 195
               L275 220
               C280 235, 285 250, 288 265
               L290 280
               C292 295, 290 310, 285 325
               L275 350
               C270 365, 260 375, 245 380
               L225 385
               C215 387, 205 385, 200 380
               C195 385, 185 387, 175 385
               L155 380
               C140 375, 130 365, 125 350
               L115 325
               C110 310, 108 295, 110 280
               L112 265
               C115 250, 120 235, 125 220
               L135 195
               C140 185, 145 175, 150 165
               L160 140
               C165 130, 170 120, 175 110
               L185 85
               C190 78, 195 75, 200 80 Z" 
               fill="url(#prayerGradient)" 
               stroke="#8B5CF6" 
               stroke-width="2"
               filter="url(#dropShadow)"/>
      
      <!-- QR Code clipped to prayer hands shape -->
      <g transform="translate(0, 25)" clip-path="url(#prayerHandsClip)">
        ${svgString.replace(/<svg[^>]*>/g, '').replace(/<\/svg>/g, '')}
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
      <text x="200" y="450" text-anchor="middle" font-size="14" fill="#6B46C1" font-family="serif" font-weight="bold">Health &amp; Hope</text>
      <text x="200" y="470" text-anchor="middle" font-size="10" fill="#8B5CF6" font-family="serif">Scan to connect with care</text>
      
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