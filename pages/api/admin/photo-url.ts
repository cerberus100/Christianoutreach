import { NextApiRequest, NextApiResponse } from 'next';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET } from '@/lib/aws-config';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

function verifyAuth(req: NextApiRequest): boolean {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return false;
    
    // For now, basic auth verification
    // In production, you'd verify the JWT token here
    return true;
  } catch {
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ signedUrl: string }>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Verify authentication
  if (!verifyAuth(req)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  try {
    const { photoPath } = req.body;

    if (!photoPath) {
      return res.status(400).json({
        success: false,
        error: 'Photo path is required',
      });
    }

    // Extract S3 key from the existing selfieUrl
    // selfieUrl format: https://bucket-name.s3.amazonaws.com/submissions/id/filename
    let s3Key = photoPath;
    
    // If it's a full URL, extract just the key part
    if (photoPath.includes('s3.amazonaws.com/')) {
      const urlParts = photoPath.split('s3.amazonaws.com/');
      if (urlParts.length > 1) {
        s3Key = urlParts[1];
      }
    }

    // Generate signed URL valid for 1 hour
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600 // 1 hour
    });

    res.status(200).json({
      success: true,
      data: { signedUrl },
      message: 'Signed URL generated successfully',
    });

  } catch (error) {
    console.error('Photo URL generation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to generate photo URL',
    });
  }
}