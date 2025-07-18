import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '@/lib/aws-config';
import { HealthSubmission, ApiResponse } from '@/types';

// Production mode - always use DynamoDB

// Middleware to verify JWT token
function verifyAuth(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  try {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    return true;
  } catch {
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<HealthSubmission[]>>
) {
  if (req.method !== 'GET') {
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
    console.log('Fetching submissions from DynamoDB...');
    console.log('Table name:', TABLES.SUBMISSIONS);

    // Query all submissions from DynamoDB
    console.log('Querying DynamoDB for submissions...');
    
    const scanParams: ScanCommandInput = {
      TableName: TABLES.SUBMISSIONS,
      // We'll scan the entire table for now
      // In production with large datasets, consider using Query with GSI
    };

    let submissions: HealthSubmission[] = [];
    try {
      const result = await docClient.send(new ScanCommand(scanParams));
      submissions = (result.Items || []) as HealthSubmission[];
      console.log(`Retrieved ${submissions.length} submissions from DynamoDB`);
    } catch (error) {
      console.error('DynamoDB scan error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: 'Failed to retrieve submissions from database',
      });
    }

    // Apply filters if provided
    const { location, riskLevel, followUpStatus, search } = req.query;
    
    let filteredSubmissions = [...submissions];

    if (location) {
      filteredSubmissions = filteredSubmissions.filter(s => s.churchId === location);
    }

    if (riskLevel) {
      filteredSubmissions = filteredSubmissions.filter(s => s.healthRiskLevel === riskLevel);
    }

    if (followUpStatus) {
      filteredSubmissions = filteredSubmissions.filter(s => s.followUpStatus === followUpStatus);
    }

    if (search) {
      const searchTerm = search.toString().toLowerCase();
      filteredSubmissions = filteredSubmissions.filter(s => 
        s.firstName.toLowerCase().includes(searchTerm) ||
        s.lastName.toLowerCase().includes(searchTerm) ||
        s.email?.toLowerCase().includes(searchTerm) ||
        s.phone?.includes(searchTerm) ||
        s.id.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by submission date (newest first)
    filteredSubmissions.sort((a, b) => 
      new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
    );

    console.log(`Returning ${filteredSubmissions.length} filtered submissions`);

    res.status(200).json({
      success: true,
      data: filteredSubmissions,
      message: `Retrieved ${filteredSubmissions.length} submissions`,
    });

  } catch (error) {
    console.error('Submissions API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve submissions',
    });
  }
} 