import { DeviceInfo, NetworkInfo } from '@/types';
import { NextApiRequest } from 'next';

/**
 * Parse User-Agent string to extract browser, OS, and device information
 */
export function parseUserAgent(userAgent: string): Partial<DeviceInfo> {
  const deviceInfo: Partial<DeviceInfo> = {
    userAgent,
  };

  // Browser detection
  if (userAgent.includes('Chrome/')) {
    const version = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] || '';
    deviceInfo.browser = { name: 'Chrome', version };
  } else if (userAgent.includes('Firefox/')) {
    const version = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || '';
    deviceInfo.browser = { name: 'Firefox', version };
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    const version = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || '';
    deviceInfo.browser = { name: 'Safari', version };
  } else if (userAgent.includes('Edge/')) {
    const version = userAgent.match(/Edge\/(\d+\.\d+)/)?.[1] || '';
    deviceInfo.browser = { name: 'Edge', version };
  } else if (userAgent.includes('Opera/')) {
    const version = userAgent.match(/Opera\/(\d+\.\d+)/)?.[1] || '';
    deviceInfo.browser = { name: 'Opera', version };
  }

  // OS detection
  if (userAgent.includes('Windows NT')) {
    const version = userAgent.match(/Windows NT (\d+\.\d+)/)?.[1] || '';
    deviceInfo.os = { name: 'Windows', version };
  } else if (userAgent.includes('Mac OS X')) {
    const version = userAgent.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
    deviceInfo.os = { name: 'macOS', version };
  } else if (userAgent.includes('Linux')) {
    deviceInfo.os = { name: 'Linux', version: '' };
  } else if (userAgent.includes('Android')) {
    const version = userAgent.match(/Android (\d+\.\d+)/)?.[1] || '';
    deviceInfo.os = { name: 'Android', version };
  } else if (userAgent.includes('iPhone OS') || userAgent.includes('iOS')) {
    const version = userAgent.match(/OS (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
    deviceInfo.os = { name: 'iOS', version };
  }

  // Device type detection
  if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android')) {
    deviceInfo.device = { type: 'mobile' };
    
    // iPhone detection
    if (userAgent.includes('iPhone')) {
      deviceInfo.device.brand = 'Apple';
      const model = userAgent.match(/iPhone(\d+,\d+)/)?.[1] || 'iPhone';
      deviceInfo.device.model = model;
    }
    
    // Android device detection
    if (userAgent.includes('Android')) {
      const deviceMatch = userAgent.match(/\(.*?;\s*(.*?)\s*Build/);
      if (deviceMatch) {
        const deviceName = deviceMatch[1];
        deviceInfo.device.brand = deviceName.split(' ')[0] || 'Android';
        deviceInfo.device.model = deviceName;
      }
    }
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    deviceInfo.device = { type: 'tablet' };
    
    if (userAgent.includes('iPad')) {
      deviceInfo.device.brand = 'Apple';
      deviceInfo.device.model = 'iPad';
    }
  } else {
    deviceInfo.device = { type: 'desktop' };
  }

  return deviceInfo;
}

/**
 * Extract IP address from request, considering proxies and load balancers
 */
export function extractIpAddress(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIp = req.headers['x-real-ip'] as string;
  const cfConnectingIp = req.headers['cf-connecting-ip'] as string; // Cloudflare
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;

  // Priority order for IP detection
  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (remoteAddress) return remoteAddress;
  
  return 'unknown';
}

/**
 * Determine IP address type (IPv4 or IPv6)
 */
export function getIpType(ip: string): 'IPv4' | 'IPv6' {
  if (ip.includes(':')) return 'IPv6';
  return 'IPv4';
}

/**
 * Extract network information from request
 */
export function extractNetworkInfo(req: NextApiRequest): NetworkInfo {
  const ipAddress = extractIpAddress(req);
  const userAgent = req.headers['user-agent'] || '';
  const referrerHeader = req.headers.referer || req.headers.referrer;
  const referrer = Array.isArray(referrerHeader) ? referrerHeader[0] : referrerHeader;
  const forwardedFor = req.headers['x-forwarded-for'] as string;

  // Extract important headers for debugging/analysis
  const requestHeaders: Record<string, string> = {};
  const importantHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-forwarded-proto',
    'x-forwarded-host',
    'accept-language',
    'accept-encoding',
    'connection',
    'cache-control',
  ];

  importantHeaders.forEach(header => {
    const value = req.headers[header];
    if (value) {
      requestHeaders[header] = Array.isArray(value) ? value.join(', ') : value;
    }
  });

  return {
    ipAddress,
    ipType: getIpType(ipAddress),
    userAgent,
    referrer,
    forwardedFor,
    requestHeaders,
  };
}

/**
 * Generate a unique fingerprint for the submission
 */
export function generateSubmissionFingerprint(
  deviceInfo: DeviceInfo,
  networkInfo: NetworkInfo,
  formData: Record<string, unknown>
): string {
  const fingerprintData = {
    ip: networkInfo.ipAddress,
    userAgent: deviceInfo.userAgent,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    device: deviceInfo.device,
    screen: deviceInfo.screen,
    timezone: deviceInfo.timezone,
    timestamp: Date.now(),
    formHash: hashObject(formData),
  };

  return btoa(JSON.stringify(fingerprintData)).substring(0, 32);
}

/**
 * Create a simple hash of an object for fingerprinting
 */
function hashObject(obj: Record<string, unknown>): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Client-side device information collection
 * This function should be called from the browser
 */
export function collectClientDeviceInfo(): Partial<DeviceInfo> {
  if (typeof window === 'undefined') {
    return {}; // Server-side, return empty
  }

  const nav = window.navigator;
  const screen = window.screen;

  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookiesEnabled: nav.cookieEnabled,
    javaEnabled: typeof nav.javaEnabled === 'function' ? nav.javaEnabled() : false,
    screen: {
      width: screen.width,
      height: screen.height,
    },
  };
}

/**
 * Detect potential fraud indicators
 */
export function detectFraudIndicators(
  deviceInfo: DeviceInfo,
  networkInfo: NetworkInfo
): string[] {
  const indicators: string[] = [];

  // Check for suspicious user agents
  if (!deviceInfo.userAgent || deviceInfo.userAgent.length < 10) {
    indicators.push('suspicious_user_agent');
  }

  // Check for automation tools
  const automationKeywords = ['bot', 'crawler', 'spider', 'headless', 'phantom'];
  if (automationKeywords.some(keyword => 
    deviceInfo.userAgent.toLowerCase().includes(keyword)
  )) {
    indicators.push('automation_detected');
  }

  // Check for VPN/Proxy indicators
  if (networkInfo.forwardedFor && networkInfo.forwardedFor.split(',').length > 2) {
    indicators.push('multiple_proxy_hops');
  }

  // Check for private/local IP addresses
  if (networkInfo.ipAddress.startsWith('192.168.') || 
      networkInfo.ipAddress.startsWith('10.') ||
      networkInfo.ipAddress.startsWith('172.16.') ||
      networkInfo.ipAddress === '127.0.0.1' ||
      networkInfo.ipAddress === 'localhost') {
    indicators.push('private_ip_address');
  }

  return indicators;
} 