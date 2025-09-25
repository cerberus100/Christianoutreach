import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth';
import { submissionsService } from '@/lib/submissions-service';
import { validateData, followUpUpdateSchema, FollowUpUpdateInput } from '@/lib/validation';
import { HealthSubmission, ApiResponse } from '@/types';

// Development mode check
const isDevelopment = process.env.NODE_ENV === 'development';
const hasAWSCredentials = !!(process.env.APP_ACCESS_KEY_ID && process.env.APP_SECRET_ACCESS_KEY);

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
    console.log(`Admin ${user.email} fetching submissions...`);

    // Extract query parameters
    const {
      limit,
      nextToken,
      location,
      riskLevel,
      followUpStatus,
      search,
      startDate,
      endDate
    } = req.query;

    // Convert limit to number with validation
    const limitNum = limit ? Math.min(parseInt(limit as string, 10), 100) : undefined;

    // Get submissions using the service
    const result = await submissionsService.getSubmissions({
      limit: limitNum,
      nextToken: nextToken as string,
      churchId: location as string,
      riskLevel: riskLevel as string,
      followUpStatus: followUpStatus as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

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