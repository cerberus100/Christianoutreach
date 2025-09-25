import { NextApiRequest, NextApiResponse } from 'next';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET, docClient, TABLES } from '@/lib/aws-config';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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

  try {
    const { submissionId, phoneVerification } = req.body;

    if (!submissionId) {
      return res.status(400).json({
        success: false,
        error: 'Submission ID is required',
      });
    }

    // Get submission from database to verify ownership and get photo path
    const getCommand = new GetCommand({
      TableName: TABLES.SUBMISSIONS,
      Key: { id: submissionId },
    });

    const result = await docClient.send(getCommand);
    
    if (!result.Item) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    const submission = result.Item;

    // Optional: Verify user owns this submission via phone number
    // This adds a layer of security without requiring full auth
    if (phoneVerification && submission.phone !== phoneVerification) {
      return res.status(403).json({
        success: false,
        error: 'Phone verification failed',
      });
    }

    if (!submission.selfieUrl) {
      return res.status(404).json({
        success: false,
        error: 'No photo found for this submission',
      });
    }

    // Extract S3 key from the existing selfieUrl
    let s3Key = submission.selfieUrl;
    
    // If it's a full URL, extract just the key part
    if (submission.selfieUrl.includes('s3.amazonaws.com/')) {
      const urlParts = submission.selfieUrl.split('s3.amazonaws.com/');
      if (urlParts.length > 1) {
        s3Key = urlParts[1];
      }
    }

    // Generate signed URL valid for 2 hours (longer than admin for user convenience)
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 7200 // 2 hours
    });

    res.status(200).json({
      success: true,
      data: { signedUrl },
      message: 'Photo URL generated successfully',
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