import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { fetchSubmissionsPage, decodeCursor } from '@/lib/submissions-service';
import { ApiResponse, HealthSubmission, SubmissionFollowUpStatus } from '@/types';

const querySchema = z.object({
  churchId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  riskLevels: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').filter(Boolean) : undefined)),
  followUpStatuses: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item): item is SubmissionFollowUpStatus =>
          ['Pending', 'Contacted', 'Scheduled', 'Completed'].includes(item)
        );
    }),
  searchTerm: z.string().optional(),
  pageSize: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine((value) => value === undefined || (Number.isInteger(value) && value > 0 && value <= 200), {
      message: 'pageSize must be between 1 and 200',
    }),
  cursor: z.string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<HealthSubmission[] | { items: HealthSubmission[]; nextToken?: string }>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    requireAdmin(req);
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const parseResult = querySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, error: 'Invalid query parameters' });
  }

  const {
    churchId,
    startDate,
    endDate,
    riskLevels,
    followUpStatuses,
    searchTerm,
    pageSize,
    cursor,
  } = parseResult.data;

  try {
    const page = await fetchSubmissionsPage({
      churchId,
      startDate,
      endDate,
      riskLevels,
      followUpStatuses,
      searchTerm,
      pageSize,
      exclusiveStartKey: decodeCursor(cursor),
    });

    return res.status(200).json({
      success: true,
      data: {
        items: page.items,
        nextToken: page.nextToken,
      },
      message: `Retrieved ${page.items.length} submissions`,
    });
  } catch (error) {
    console.error('Submissions API error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve submissions' });
  }
} 