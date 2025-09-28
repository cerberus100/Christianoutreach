import { NextApiRequest, NextApiResponse } from 'next';
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { docClient, s3Client, TABLES, S3_BUCKET } from '@/lib/aws-config';
import { requireAdmin } from '@/lib/auth';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface RefreshResult {
  totalSubmissions: number;
  submissionsWithPhotos: number;
  photosFound: number;
  photosFixed: number;
  photosMissing: number;
  errors: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RefreshResult>>
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
    console.log('Starting photo refresh process...');
    
    const result: RefreshResult = {
      totalSubmissions: 0,
      submissionsWithPhotos: 0,
      photosFound: 0,
      photosFixed: 0,
      photosMissing: 0,
      errors: []
    };

    // Get all submissions from DynamoDB
    const scanResult = await docClient.send(new ScanCommand({
      TableName: TABLES.SUBMISSIONS,
    }));

    const submissions = scanResult.Items || [];
    result.totalSubmissions = submissions.length;

    console.log(`Found ${submissions.length} submissions to check`);

    for (const submission of submissions) {
      if (!submission.selfieUrl) {
        continue;
      }

      result.submissionsWithPhotos++;

      try {
        // Extract S3 key from existing URL
        let s3Key = submission.selfieUrl;
        let needsUpdate = false;
        
        // Handle different URL formats that might exist
        if (submission.selfieUrl.includes('s3.amazonaws.com/')) {
          const urlParts = submission.selfieUrl.split('s3.amazonaws.com/');
          if (urlParts.length > 1) {
            s3Key = urlParts[1];
          }
        } else if (submission.selfieUrl.startsWith('submissions/')) {
          // Already just the key
          s3Key = submission.selfieUrl;
          needsUpdate = true; // Need to add full URL
        }

        // Check if photo exists in S3
        try {
          await s3Client.send(new HeadObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
          }));
          
          result.photosFound++;
          
          // Generate correct URL format
          const correctUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`;
          
          // Update if URL format is wrong
          if (submission.selfieUrl !== correctUrl) {
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            console.log(`Updating URL for submission ${submission.id}`);
            console.log(`Old URL: ${submission.selfieUrl}`);
            console.log(`New URL: ${correctUrl}`);
            
            await docClient.send(new UpdateCommand({
              TableName: TABLES.SUBMISSIONS,
              Key: { id: submission.id },
              UpdateExpression: 'SET selfieUrl = :url',
              ExpressionAttributeValues: {
                ':url': correctUrl
              }
            }));
            
            result.photosFixed++;
          }
          
        } catch (s3Error) {
          console.error(`Photo not found in S3 for submission ${submission.id}:`, s3Error);
          result.photosMissing++;
          result.errors.push(`Photo missing for ${submission.firstName} ${submission.lastName} (${submission.id})`);
        }
        
      } catch (error) {
        console.error(`Error processing submission ${submission.id}:`, error);
        result.errors.push(`Error processing submission ${submission.id}: ${error}`);
      }
    }

    console.log('Photo refresh completed:', result);

    res.status(200).json({
      success: true,
      data: result,
      message: `Photo refresh completed. Found ${result.photosFound} photos, fixed ${result.photosFixed} URLs, ${result.photosMissing} missing.`,
    });

  } catch (error) {
    console.error('Photo refresh error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to refresh photos',
    });
  }
}