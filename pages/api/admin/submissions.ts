import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth';
import { submissionsService } from '@/lib/submissions-service';
import { validateData, followUpUpdateSchema, FollowUpUpdateInput } from '@/lib/validation';
import { HealthSubmission, ApiResponse } from '@/types';

// Production mode - always use DynamoDB

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<HealthSubmission[] | HealthSubmission>>
) {
  if (req.method === 'GET') {
    return handleGetSubmissions(req, res);
  } else if (req.method === 'PUT') {
    return handleUpdateSubmission(req, res);
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }
}

async function handleGetSubmissions(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<HealthSubmission[]>>
) {
  // Verify admin authentication
  const user = requireAdmin(req, res);
  if (!user) return; // Response already sent by requireAdmin

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

    console.log(`Returning ${result.items.length} submissions to admin ${user.email}`);

    res.status(200).json({
      success: true,
      data: result.items,
      nextToken: result.nextToken,
      count: result.count,
      message: `Retrieved ${result.items.length} submissions`,
    });

  } catch (error) {
    console.error('Submissions API error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to retrieve submissions',
    });
  }
}

async function handleUpdateSubmission(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<HealthSubmission>>
) {
  // Verify admin authentication
  const user = requireAdmin(req, res);
  if (!user) return; // Response already sent by requireAdmin

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid submission ID',
        message: 'Submission ID is required',
      });
    }

    // Validate request body using Zod
    const validation = validateData(followUpUpdateSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid request data',
        validationErrors: validation.errors,
      });
    }

    const { followUpStatus, followUpNotes, followUpDate } = validation.data;

    console.log(`Admin ${user.email} updating submission ${id}...`);

    // Update the submission using the service
    const updatedSubmission = await submissionsService.updateFollowUp(id, {
      followUpStatus,
      followUpNotes,
      followUpDate,
    });

    console.log(`Submission ${id} updated successfully by admin ${user.email}`);

    res.status(200).json({
      success: true,
      data: updatedSubmission,
      message: 'Submission updated successfully',
    });

  } catch (error) {
    console.error('Update submission API error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to update submission',
    });
  }
} 