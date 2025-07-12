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

    // Create a simple, recognizable prayer hands shaped QR code
    const prayerHandsQR = `<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Simple prayer hands shape as clipping mask -->
        <clipPath id="prayerHandsClip">
          <path d="M200 50
                   L170 65
                   L150 80
                   L140 100
                   L135 120
                   L130 140
                   L125 160
                   L120 180
                   L115 200
                   L110 220
                   L105 240
                   L100 260
                   L95 280
                   L90 300
                   L85 320
                   L80 340
                   L75 360
                   L70 380
                   L75 400
                   L85 420
                   L100 440
                   L120 450
                   L140 460
                   L160 470
                   L180 480
                   L200 485
                   L220 480
                   L240 470
                   L260 460
                   L280 450
                   L300 440
                   L315 420
                   L325 400
                   L330 380
                   L325 360
                   L320 340
                   L315 320
                   L310 300
                   L305 280
                   L300 260
                   L295 240
                   L290 220
                   L285 200
                   L280 180
                   L275 160
                   L270 140
                   L265 120
                   L260 100
                   L250 80
                   L230 65
                   L200 50 Z" 
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
               L170 65
               L150 80
               L140 100
               L135 120
               L130 140
               L125 160
               L120 180
               L115 200
               L110 220
               L105 240
               L100 260
               L95 280
               L90 300
               L85 320
               L80 340
               L75 360
               L70 380
               L75 400
               L85 420
               L100 440
               L120 450
               L140 460
               L160 470
               L180 480
               L200 485
               L220 480
               L240 470
               L260 460
               L280 450
               L300 440
               L315 420
               L325 400
               L330 380
               L325 360
               L320 340
               L315 320
               L310 300
               L305 280
               L300 260
               L295 240
               L290 220
               L285 200
               L280 180
               L275 160
               L270 140
               L265 120
               L260 100
               L250 80
               L230 65
               L200 50 Z" 
               fill="url(#prayerGradient)" 
               stroke="#8B5CF6" 
               stroke-width="2"
               filter="url(#dropShadow)"/>
      
      <!-- Center dividing line to show two hands -->
      <line x1="200" y1="50" x2="200" y2="485" stroke="#8B5CF6" stroke-width="1" opacity="0.3"/>
      
      <!-- QR Code clipped to prayer hands shape -->
      <g transform="translate(0, 0)" clip-path="url(#prayerHandsClip)">
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
      <text x="200" y="455" text-anchor="middle" font-size="14" fill="#6B46C1" font-family="serif" font-weight="bold">Health &amp; Hope</text>
      <text x="200" y="475" text-anchor="middle" font-size="10" fill="#8B5CF6" font-family="serif">Scan to connect with care</text>
      
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