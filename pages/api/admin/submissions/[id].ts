import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '@/lib/aws-config';
import { ApiResponse, HealthSubmission, SubmissionFollowUpStatus } from '@/types';

const FOLLOW_UP_STATUS_VALUES: SubmissionFollowUpStatus[] = [
  'Pending',
  'Contacted',
  'Scheduled',
  'Completed',
];

const updateSchema = z.object({
  followUpStatus: z
    .enum(FOLLOW_UP_STATUS_VALUES as [SubmissionFollowUpStatus, ...SubmissionFollowUpStatus[]])
    .optional(),
  followUpNotes: z
    .string()
    .max(2000, 'Notes must be 2000 characters or less')
    .optional(),
  followUpDate: z.string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<HealthSubmission>>
) {
  const { id } = req.query;
  const submissionId = Array.isArray(id) ? id[0] : id;

  if (!submissionId) {
    return res.status(400).json({ success: false, error: 'Submission id is required' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    requireAdmin(req, res);
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const parseResult = updateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, error: 'Invalid request body' });
  }

  const { followUpStatus, followUpNotes, followUpDate } = parseResult.data;

  if (!followUpStatus && !followUpNotes && !followUpDate) {
    return res.status(400).json({ success: false, error: 'No update fields provided' });
  }

  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  if (followUpStatus) {
    expressionAttributeNames['#followUpStatus'] = 'followUpStatus';
    expressionAttributeValues[':followUpStatus'] = followUpStatus;
    updateExpressions.push('#followUpStatus = :followUpStatus');
  }

  if (typeof followUpNotes === 'string') {
    expressionAttributeNames['#followUpNotes'] = 'followUpNotes';
    expressionAttributeValues[':followUpNotes'] = followUpNotes;
    updateExpressions.push('#followUpNotes = :followUpNotes');
  }

  if (followUpDate) {
    expressionAttributeNames['#followUpDate'] = 'followUpDate';
    expressionAttributeValues[':followUpDate'] = followUpDate;
    updateExpressions.push('#followUpDate = :followUpDate');
  }

  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  updateExpressions.push('#updatedAt = :updatedAt');

  try {
    const command = new UpdateCommand({
      TableName: TABLES.SUBMISSIONS,
      Key: { id: submissionId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(id)',
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(command);
    const updatedSubmission = result.Attributes as HealthSubmission | undefined;

    if (!updatedSubmission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    return res.status(200).json({
      success: true,
      data: updatedSubmission,
      message: 'Submission updated successfully',
    });
  } catch (error: any) {
    if (error?.name === 'ConditionalCheckFailedException') {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    console.error('Update submission error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update submission' });
  }
}
