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

    // Create a professional square QR code with prayer hands icon in center
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
        
        <!-- Subtle border glow -->
        <filter id="borderGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
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
        
        <!-- Center circle for prayer hands icon -->
        <circle cx="200" cy="200" r="45" fill="white" stroke="#8B5CF6" stroke-width="3" filter="url(#borderGlow)"/>
        
        <!-- Prayer hands icon in center -->
        <g transform="translate(200, 200)">
          <!-- Beautiful prayer hands SVG icon -->
          <g transform="translate(-20, -25) scale(0.8)">
            <!-- Left hand -->
            <path d="M15 5 C12 3, 8 5, 8 10 L8 25 C8 35, 12 40, 18 42 L20 43 C22 44, 22 44, 20 43 L18 42 C24 40, 28 35, 28 25 L28 10 C28 5, 24 3, 21 5 C19 3, 17 3, 15 5 Z" 
                  fill="#8B5CF6" stroke="#6B46C1" stroke-width="0.5"/>
            
            <!-- Right hand -->
            <path d="M25 5 C28 3, 32 5, 32 10 L32 25 C32 35, 28 40, 22 42 L20 43 C18 44, 18 44, 20 43 L22 42 C16 40, 12 35, 12 25 L12 10 C12 5, 16 3, 19 5 C21 3, 23 3, 25 5 Z" 
                  fill="#8B5CF6" stroke="#6B46C1" stroke-width="0.5"/>
            
            <!-- Fingers detail -->
            <ellipse cx="15" cy="8" rx="2" ry="4" fill="#6B46C1" opacity="0.6"/>
            <ellipse cx="25" cy="8" rx="2" ry="4" fill="#6B46C1" opacity="0.6"/>
            
            <!-- Thumbs -->
            <ellipse cx="12" cy="15" rx="1.5" ry="3" fill="#6B46C1" opacity="0.8"/>
            <ellipse cx="28" cy="15" rx="1.5" ry="3" fill="#6B46C1" opacity="0.8"/>
          </g>
        </g>
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
        
        <!-- Subtle cross accents -->
        <g transform="translate(225, 30)">
          <line x1="0" y1="-6" x2="0" y2="6" stroke="#8B5CF6" stroke-width="2"/>
          <line x1="-6" y1="0" x2="6" y2="0" stroke="#8B5CF6" stroke-width="2"/>
        </g>
      </g>
      
      <!-- Professional text styling -->
      <text x="225" y="500" text-anchor="middle" font-size="16" fill="#6B46C1" font-family="serif" font-weight="bold">Health &amp; Hope</text>
      <text x="225" y="520" text-anchor="middle" font-size="12" fill="#8B5CF6" font-family="serif" font-style="italic">Scan to connect with care</text>
      
      <!-- Subtle border frame -->
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

    // Send the clean, professional prayer hands QR code
    res.status(200).send(prayerHandsQR);

  } catch (error) {
    console.error('Prayer QR Code generation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate prayer hands QR code',
    });
  }
} 