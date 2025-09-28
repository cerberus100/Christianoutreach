import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from './aws-config';

/**
 * Photo security configuration
 */
const PHOTO_SECURITY_CONFIG = {
  allowedBuckets: [
    process.env.APP_S3_BUCKET_NAME || 'health-screening-photos-2024',
    'health-screening-photos', // Legacy bucket
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ],
  keyPrefix: 'submissions/', // Expected prefix for submission photos
} as const;

/**
 * Extract bucket and key from S3 URL
 */
export function parseS3Url(url: string): { bucket: string; key: string } | null {
  try {
    const urlObj = new URL(url);

    // Handle S3 URLs (s3.amazonaws.com or s3.region.amazonaws.com)
    if (urlObj.hostname.includes('s3.amazonaws.com') || urlObj.hostname.includes('s3-')) {
      const bucket = urlObj.hostname.split('.')[0];
      const key = decodeURIComponent(urlObj.pathname.substring(1)); // Remove leading '/'

      return { bucket, key };
    }

    // Handle CloudFront or other CDN URLs (if configured)
    // This would need additional configuration for custom domains
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate S3 photo URL security
 */
export function validatePhotoUrl(url: string, submissionId?: string): {
  isValid: boolean;
  errors: string[];
  metadata?: {
    bucket: string;
    key: string;
    size?: number;
    contentType?: string;
  };
} {
  const errors: string[] = [];

  if (!url) {
    return { isValid: false, errors: ['Photo URL is required'] };
  }

  // Parse the S3 URL
  const parsedUrl = parseS3Url(url);
  if (!parsedUrl) {
    errors.push('Invalid S3 URL format');
    return { isValid: false, errors };
  }

  const { bucket, key } = parsedUrl;

  // Validate bucket
  if (!PHOTO_SECURITY_CONFIG.allowedBuckets.includes(bucket)) {
    errors.push(`Photo is in unauthorized bucket: ${bucket}`);
  }

  // Validate key prefix
  if (!key.startsWith(PHOTO_SECURITY_CONFIG.keyPrefix)) {
    errors.push(`Photo key must start with: ${PHOTO_SECURITY_CONFIG.keyPrefix}`);
  }

  // Validate key format (should contain submission ID or related identifier)
  if (submissionId && !key.includes(submissionId)) {
    errors.push(`Photo key does not match submission ID: ${submissionId}`);
  }

  // Basic key validation (no path traversal, no system files)
  if (key.includes('../') || key.includes('..\\') || key.startsWith('/')) {
    errors.push('Invalid photo key: path traversal detected');
  }

  if (key.includes('etc/passwd') || key.includes('windows/system32') || key.includes('.env')) {
    errors.push('Invalid photo key: system file access detected');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    metadata: { bucket, key }
  };
}

/**
 * Verify photo exists and get metadata
 */
export async function verifyPhotoAccess(url: string): Promise<{
  exists: boolean;
  metadata?: {
    size: number;
    contentType: string;
    lastModified: Date;
  };
  errors: string[];
}> {
  const validation = validatePhotoUrl(url);

  if (!validation.isValid) {
    return {
      exists: false,
      errors: validation.errors
    };
  }

  const { bucket, key } = validation.metadata!;

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    // Validate file size
    if (response.ContentLength && response.ContentLength > PHOTO_SECURITY_CONFIG.maxFileSize) {
      return {
        exists: false,
        errors: [`Photo file too large: ${response.ContentLength} bytes (max: ${PHOTO_SECURITY_CONFIG.maxFileSize})`]
      };
    }

    // Validate content type
    if (response.ContentType && !PHOTO_SECURITY_CONFIG.allowedMimeTypes.includes(response.ContentType as any)) {
      return {
        exists: false,
        errors: [`Invalid photo content type: ${response.ContentType}`]
      };
    }

    return {
      exists: true,
      metadata: {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'unknown',
        lastModified: response.LastModified || new Date(),
      },
      errors: []
    };

  } catch (error: any) {
    if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
      return {
        exists: false,
        errors: ['Photo not found in S3 bucket']
      };
    }

    if (error.name === 'AccessDenied') {
      return {
        exists: false,
        errors: ['Access denied to photo in S3 bucket']
      };
    }

    console.error('Error verifying photo access:', error);
    return {
      exists: false,
      errors: ['Failed to verify photo access']
    };
  }
}

/**
 * Generate secure photo URL with expiration
 */
export function generateSecurePhotoUrl(key: string, _expiresIn: number = 3600): string {
  const bucket = PHOTO_SECURITY_CONFIG.allowedBuckets[0];

  // In a real implementation, you would generate a presigned URL here
  // For now, we'll return the standard S3 URL
  return `https://${bucket}.s3.amazonaws.com/${encodeURIComponent(key)}`;
}

/**
 * Validate and sanitize photo key
 */
export function sanitizePhotoKey(key: string): string {
  // Remove any path traversal attempts
  let sanitized = key.replace(/\.\./g, '').replace(/[\/\\]/g, '-');

  // Ensure it starts with the expected prefix
  if (!sanitized.startsWith(PHOTO_SECURITY_CONFIG.keyPrefix)) {
    sanitized = PHOTO_SECURITY_CONFIG.keyPrefix + sanitized;
  }

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

/**
 * Check if photo key belongs to specific submission
 */
export function validatePhotoOwnership(photoKey: string, submissionId: string): boolean {
  // Extract submission ID from photo key
  // Photo keys typically follow pattern: submissions/{submissionId}/{timestamp}.{extension}
  const keyParts = photoKey.split('/');
  const submissionFromKey = keyParts[1]; // Second part should be submission ID

  return submissionFromKey === submissionId;
}
