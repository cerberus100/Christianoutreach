import fs from 'fs';
import path from 'path';

interface FileValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedFilename?: string;
  detectedMimeType?: string;
}

interface FileValidationOptions {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  checkMagicBytes: boolean;
}

// Magic bytes for common image formats
const IMAGE_SIGNATURES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF],
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // "RIFF" at start, followed by WEBP
  ],
};

/**
 * Validates file upload security following OWASP guidelines
 * @param filePath - Path to the uploaded file
 * @param originalName - Original filename from user
 * @param mimeType - MIME type from formidable
 * @param options - Validation options
 * @returns Validation result with security checks
 */
export function validateUploadedFile(
  filePath: string,
  originalName: string,
  mimeType: string,
  options: FileValidationOptions
): FileValidationResult {
  try {
    // 1. Check if file exists and is readable
    if (!fs.existsSync(filePath)) {
      return { isValid: false, error: 'File not found' };
    }

    const stats = fs.statSync(filePath);
    
    // 2. File size validation
    if (stats.size > options.maxSizeBytes) {
      return { 
        isValid: false, 
        error: `File size ${stats.size} bytes exceeds maximum ${options.maxSizeBytes} bytes` 
      };
    }

    if (stats.size === 0) {
      return { isValid: false, error: 'File is empty' };
    }

    // 3. MIME type validation (don't trust user input)
    if (!options.allowedMimeTypes.includes(mimeType)) {
      return { 
        isValid: false, 
        error: `MIME type ${mimeType} not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}` 
      };
    }

    // 4. File extension validation
    const fileExtension = path.extname(originalName).toLowerCase();
    if (!options.allowedExtensions.includes(fileExtension)) {
      return { 
        isValid: false, 
        error: `File extension ${fileExtension} not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}` 
      };
    }

    // 5. Filename security validation
    const filenameValidation = validateFilename(originalName);
    if (!filenameValidation.isValid) {
      return filenameValidation;
    }

    // 6. Magic byte validation (file signature)
    if (options.checkMagicBytes) {
      const magicByteValidation = validateFileMagicBytes(filePath, mimeType);
      if (!magicByteValidation.isValid) {
        return magicByteValidation;
      }
    }

    // 7. Generate secure filename
    const sanitizedFilename = generateSecureFilename(fileExtension);

    return {
      isValid: true,
      sanitizedFilename,
      detectedMimeType: mimeType,
    };

  } catch (error) {
    console.error('File validation error:', error);
    return { 
      isValid: false, 
      error: 'File validation failed due to internal error' 
    };
  }
}

/**
 * Validates filename for security issues
 */
function validateFilename(filename: string): FileValidationResult {
  // Check for null bytes (directory traversal)
  if (filename.includes('\0')) {
    return { isValid: false, error: 'Filename contains null bytes' };
  }

  // Check for directory traversal patterns
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { isValid: false, error: 'Filename contains directory traversal patterns' };
  }

  // Check for Windows reserved names
  const windowsReserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  if (windowsReserved.test(filename)) {
    return { isValid: false, error: 'Filename uses reserved system name' };
  }

  // Check for excessive length
  if (filename.length > 255) {
    return { isValid: false, error: 'Filename too long (max 255 characters)' };
  }

  // Check for leading dots or spaces (hidden files, parsing issues)
  if (filename.startsWith('.') || filename.startsWith(' ')) {
    return { isValid: false, error: 'Filename cannot start with dot or space' };
  }

  // Check for dangerous characters
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(filename)) {
    return { isValid: false, error: 'Filename contains dangerous characters' };
  }

  return { isValid: true };
}

/**
 * Validates file magic bytes against expected MIME type
 */
function validateFileMagicBytes(filePath: string, expectedMimeType: string): FileValidationResult {
  try {
    const buffer = fs.readFileSync(filePath, { flag: 'r' });
    const signatures = IMAGE_SIGNATURES[expectedMimeType as keyof typeof IMAGE_SIGNATURES];
    
    if (!signatures) {
      return { isValid: false, error: `No signature validation available for ${expectedMimeType}` };
    }

    // Check if file starts with any of the expected signatures
    const isValidSignature = signatures.some(signature => 
      signature.every((byte, index) => buffer[index] === byte)
    );

    if (!isValidSignature) {
      return { 
        isValid: false, 
        error: `File signature does not match expected MIME type ${expectedMimeType}` 
      };
    }

    // Additional WebP validation
    if (expectedMimeType === 'image/webp') {
      // Check for "WEBP" at bytes 8-11
      const webpSignature = buffer.slice(8, 12).toString();
      if (webpSignature !== 'WEBP') {
        return { isValid: false, error: 'Invalid WebP file structure' };
      }
    }

    return { isValid: true };

  } catch (error) {
    console.error('Magic byte validation error:', error);
    return { isValid: false, error: 'Failed to validate file signature' };
  }
}

/**
 * Generates a secure, random filename
 */
function generateSecureFilename(extension: string): string {
  // Generate cryptographically secure random filename
  const timestamp = Date.now();
  const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${timestamp}-${randomBytes}${extension}`;
}

/**
 * Default validation options for health screening selfies
 */
export const SELFIE_VALIDATION_OPTIONS: FileValidationOptions = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  checkMagicBytes: true,
};

/**
 * Rate limiting for file uploads (simple in-memory implementation)
 */
const uploadAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkUploadRateLimit(identifier: string, maxAttempts = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const userAttempts = uploadAttempts.get(identifier);

  if (!userAttempts) {
    uploadAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset if window has passed
  if (now - userAttempts.lastAttempt > windowMs) {
    uploadAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // Check if under limit
  if (userAttempts.count < maxAttempts) {
    userAttempts.count++;
    userAttempts.lastAttempt = now;
    return true;
  }

  return false;
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimitEntries(maxAge = 3600000): void {
  const now = Date.now();
  for (const [key, value] of uploadAttempts.entries()) {
    if (now - value.lastAttempt > maxAge) {
      uploadAttempts.delete(key);
    }
  }
} 