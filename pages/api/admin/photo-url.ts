import { NextApiRequest, NextApiResponse } from 'next';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET } from '@/lib/aws-config';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const requestSchema = z.object({
  photoPath: z.string().min(1, 'Photo path is required'),
});

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

  try {
    requireAdmin(req);
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  try {
    const parseResult = requestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'Invalid request body' });
    }

    const { photoPath } = parseResult.data;

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