import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES, INDEXES } from '@/lib/aws-config';
import {
  HealthSubmission,
  PaginatedResult,
  SubmissionsQueryParams,
} from '@/types';

export interface SubmissionQueryOptions extends SubmissionsQueryParams {
  pageSize?: number;
  exclusiveStartKey?: Record<string, unknown> | undefined;
}

function encodeCursor(key?: Record<string, unknown>): string | undefined {
  if (!key) return undefined;
  return Buffer.from(JSON.stringify(key), 'utf8').toString('base64');
}

export function decodeCursor(cursor?: string): Record<string, unknown> | undefined {
  if (!cursor) return undefined;
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    console.warn('Failed to decode submissions cursor', error);
    return undefined;
  }
}

function hasChurchAndDateFilters(options: SubmissionQueryOptions): boolean {
  return Boolean(options.churchId && (options.startDate || options.endDate) && INDEXES.SUBMISSIONS_BY_CHURCH_DATE);
}

function buildDynamoInput(
  options: SubmissionQueryOptions
) {
  const {
    churchId,
    startDate,
    endDate,
    riskLevels,
    followUpStatuses,
    pageSize,
    exclusiveStartKey,
  } = options;

  const filterExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {};
  const expressionAttributeNames: Record<string, string> = {};

  if (churchId) {
    expressionAttributeNames['#churchId'] = 'churchId';
    expressionAttributeValues[':churchId'] = churchId;
    filterExpressions.push('#churchId = :churchId');
  }

  if (startDate) {
    expressionAttributeNames['#submissionDate'] = 'submissionDate';
    expressionAttributeValues[':startDate'] = startDate;
    filterExpressions.push('#submissionDate >= :startDate');
  }

  if (endDate) {
    expressionAttributeNames['#submissionDate'] = 'submissionDate';
    expressionAttributeValues[':endDate'] = endDate;
    filterExpressions.push('#submissionDate <= :endDate');
  }

  if (riskLevels && riskLevels.length > 0) {
    expressionAttributeNames['#riskLevel'] = 'healthRiskLevel';
    const placeholders = riskLevels.map((level, idx) => {
      const placeholder = `:riskLevel${idx}`;
      expressionAttributeValues[placeholder] = level;
      return placeholder;
    });
    filterExpressions.push(`#riskLevel IN (${placeholders.join(', ')})`);
  }

  if (followUpStatuses && followUpStatuses.length > 0) {
    expressionAttributeNames['#followUpStatus'] = 'followUpStatus';
    const placeholders = followUpStatuses.map((status, idx) => {
      const placeholder = `:followUpStatus${idx}`;
      expressionAttributeValues[placeholder] = status;
      return placeholder;
    });
    filterExpressions.push(`#followUpStatus IN (${placeholders.join(', ')})`);
  }

  if (hasChurchAndDateFilters(options)) {
    const queryParams: any = {
      TableName: TABLES.SUBMISSIONS,
      IndexName: INDEXES.SUBMISSIONS_BY_CHURCH_DATE,
      KeyConditionExpression: '#churchId = :churchId',
      ExpressionAttributeNames: {
        '#churchId': 'churchId',
      },
      ExpressionAttributeValues: {
        ':churchId': churchId,
      },
      Limit: pageSize,
    };

    if (startDate && endDate) {
      queryParams.KeyConditionExpression += ' AND #submissionDate BETWEEN :startDate AND :endDate';
      queryParams.ExpressionAttributeNames['#submissionDate'] = 'submissionDate';
      queryParams.ExpressionAttributeValues[':startDate'] = startDate;
      queryParams.ExpressionAttributeValues[':endDate'] = endDate;
    } else if (startDate) {
      queryParams.KeyConditionExpression += ' AND #submissionDate >= :startDate';
      queryParams.ExpressionAttributeNames['#submissionDate'] = 'submissionDate';
      queryParams.ExpressionAttributeValues[':startDate'] = startDate;
    } else if (endDate) {
      queryParams.KeyConditionExpression += ' AND #submissionDate <= :endDate';
      queryParams.ExpressionAttributeNames['#submissionDate'] = 'submissionDate';
      queryParams.ExpressionAttributeValues[':endDate'] = endDate;
    }

    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(' AND ');
      if (Object.keys(expressionAttributeNames).length > 0) {
        queryParams.ExpressionAttributeNames = {
          ...queryParams.ExpressionAttributeNames,
          ...expressionAttributeNames,
        };
      }
      if (Object.keys(expressionAttributeValues).length > 0) {
        queryParams.ExpressionAttributeValues = {
          ...queryParams.ExpressionAttributeValues,
          ...expressionAttributeValues,
        };
      }
    }

    if (exclusiveStartKey) {
      queryParams.ExclusiveStartKey = exclusiveStartKey;
    }

    return { type: 'Query' as const, params: queryParams };
  }

  const scanParams: any = {
    TableName: TABLES.SUBMISSIONS,
    Limit: pageSize,
  };

  if (exclusiveStartKey) {
    scanParams.ExclusiveStartKey = exclusiveStartKey;
  }

  if (filterExpressions.length > 0) {
    scanParams.FilterExpression = filterExpressions.join(' AND ');
    if (Object.keys(expressionAttributeNames).length > 0) {
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
    }
    if (Object.keys(expressionAttributeValues).length > 0) {
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
    }
  }

  return { type: 'Scan' as const, params: scanParams };
}

function applySearchFilter(
  submissions: HealthSubmission[],
  searchTerm?: string
): HealthSubmission[] {
  if (!searchTerm) {
    return submissions;
  }

  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) {
    return submissions;
  }

  return submissions.filter((submission) => {
    const valuesToCheck = [
      submission.firstName,
      submission.lastName,
      submission.email,
      submission.phone,
      submission.id,
    ];

    return valuesToCheck.some((value) =>
      value ? value.toLowerCase().includes(normalized) : false
    );
  });
}

export async function fetchSubmissionsPage(
  options: SubmissionQueryOptions
): Promise<PaginatedResult<HealthSubmission>> {
  const { searchTerm } = options;

  const input = buildDynamoInput(options);
  const result = await docClient.send(
    input.type === 'Query'
      ? new QueryCommand(input.params)
      : new ScanCommand(input.params)
  );

  const items = (result.Items || []) as HealthSubmission[];
  const filteredItems = applySearchFilter(items, searchTerm).sort(
    (a, b) =>
      new Date(b.submissionDate).getTime() -
      new Date(a.submissionDate).getTime()
  );

  return {
    items: filteredItems,
    lastEvaluatedKey: result.LastEvaluatedKey,
    nextToken: encodeCursor(result.LastEvaluatedKey as Record<string, unknown> | undefined),
  };
}

export async function fetchAllSubmissions(
  options: SubmissionsQueryParams
): Promise<HealthSubmission[]> {
  const submissions: HealthSubmission[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const page = await fetchSubmissionsPage({
      ...options,
      pageSize: 1000,
      exclusiveStartKey,
    });

    submissions.push(...page.items);
    exclusiveStartKey = page.lastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey);

  return submissions;
}

export async function updateFollowUp(
  submissionId: string,
  updates: {
    followUpStatus?: string;
    followUpNotes?: string;
    followUpDate?: string;
  }
): Promise<HealthSubmission> {
  const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
  const { docClient, TABLES } = await import('@/lib/aws-config');

  const updateExpression: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};
  const expressionAttributeNames: Record<string, string> = {};

  if (updates.followUpStatus !== undefined) {
    updateExpression.push('#followUpStatus = :followUpStatus');
    expressionAttributeNames['#followUpStatus'] = 'followUpStatus';
    expressionAttributeValues[':followUpStatus'] = updates.followUpStatus;
  }

  if (updates.followUpNotes !== undefined) {
    updateExpression.push('#followUpNotes = :followUpNotes');
    expressionAttributeNames['#followUpNotes'] = 'followUpNotes';
    expressionAttributeValues[':followUpNotes'] = updates.followUpNotes;
  }

  if (updates.followUpDate !== undefined) {
    updateExpression.push('#followUpDate = :followUpDate');
    expressionAttributeNames['#followUpDate'] = 'followUpDate';
    expressionAttributeValues[':followUpDate'] = updates.followUpDate;
  }

  const updateParams = {
    TableName: TABLES.SUBMISSIONS,
    Key: { id: submissionId },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW' as const,
  };

  try {
    const result = await docClient.send(new UpdateCommand(updateParams));
    return result.Attributes as HealthSubmission;
  } catch (error) {
    console.error('Error updating follow-up:', error);
    throw new Error('Failed to update follow-up information');
  }
}

// Export singleton instance for backward compatibility
export const submissionsService = {
  fetchSubmissionsPage,
  fetchAllSubmissions,
  decodeCursor,
  updateFollowUp,
};
