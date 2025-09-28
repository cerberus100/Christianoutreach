<<<<<<< HEAD
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
    lastEvaluatedKey: result.LastEvaluatedKey
      ? JSON.stringify(result.LastEvaluatedKey)
      : undefined,
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

=======
import {
  ScanCommand,
  QueryCommand,
  UpdateCommand,
  GetCommand,
  ScanCommandInput,
  QueryCommandInput
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES, GSI } from '@/lib/aws-config';
import { HealthSubmission } from '@/types';
import { validatePhotoUrl, verifyPhotoAccess } from './photo-security';

export interface PaginationParams {
  limit?: number;
  nextToken?: string;
  churchId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextToken?: string;
  count: number;
}

export interface SubmissionFilters {
  churchId?: string;
  riskLevel?: string;
  followUpStatus?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class SubmissionsService {
  private readonly defaultLimit = 50;
  private readonly maxLimit = 100;

  /**
   * Get paginated submissions with optional filtering
   */
  async getSubmissions(
    params: PaginationParams & SubmissionFilters = {}
  ): Promise<PaginatedResponse<HealthSubmission>> {
    const {
      limit = this.defaultLimit,
      nextToken,
      churchId,
      startDate,
      endDate,
      riskLevel,
      followUpStatus,
      search
    } = params;

    // Validate limit
    const actualLimit = Math.min(limit, this.maxLimit);

    // Check if we should use GSI for church-based queries
    const shouldUseGSI = churchId && !nextToken && !search && !riskLevel && !followUpStatus;
    const hasDateRange = startDate || endDate;

    if (shouldUseGSI && !hasDateRange) {
      // Use GSI for church-specific queries without date filtering
      return this.queryByChurch(churchId, actualLimit);
    }

    if (shouldUseGSI && hasDateRange) {
      // Use GSI for church-specific queries with date filtering
      return this.queryByChurchAndDate(churchId, startDate, endDate, actualLimit, nextToken);
    }

    // Fall back to scan for complex queries
    return this.scanWithFilters({
      limit: actualLimit,
      nextToken,
      churchId,
      startDate,
      endDate,
      riskLevel,
      followUpStatus,
      search
    });
  }

  /**
   * Query submissions by church using GSI
   */
  private async queryByChurch(
    churchId: string,
    limit: number
  ): Promise<PaginatedResponse<HealthSubmission>> {
    if (!GSI.SUBMISSIONS_CHURCH_DATE) {
      throw new Error('Church submissions GSI not configured. Set APP_DYNAMODB_SUBMISSIONS_GSI_CHURCH_DATE environment variable.');
    }

    const queryParams: QueryCommandInput = {
      TableName: TABLES.SUBMISSIONS,
      IndexName: GSI.SUBMISSIONS_CHURCH_DATE,
      KeyConditionExpression: 'churchId = :churchId',
      ExpressionAttributeValues: {
        ':churchId': churchId,
      },
      Limit: limit,
      ScanIndexForward: false, // Sort by submissionDate descending
    };

    try {
      const result = await docClient.send(new QueryCommand(queryParams));
      const items = (result.Items || []) as HealthSubmission[];

      return {
        items,
        count: items.length,
        nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
      };
    } catch (error) {
      console.error('Error querying submissions by church:', error);
      throw new Error('Failed to query submissions by church');
    }
  }

  /**
   * Query submissions by church and date range using GSI
   */
  private async queryByChurchAndDate(
    churchId: string,
    startDate?: string,
    endDate?: string,
    limit: number = this.defaultLimit,
    nextToken?: string
  ): Promise<PaginatedResponse<HealthSubmission>> {
    if (!GSI.SUBMISSIONS_CHURCH_DATE) {
      throw new Error('Church submissions GSI not configured. Set APP_DYNAMODB_SUBMISSIONS_GSI_CHURCH_DATE environment variable.');
    }

    let keyConditionExpression = 'churchId = :churchId';
    const expressionAttributeValues: Record<string, any> = {
      ':churchId': churchId,
    };

    if (startDate && endDate) {
      keyConditionExpression += ' AND submissionDate BETWEEN :startDate AND :endDate';
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeValues[':endDate'] = endDate;
    } else if (startDate) {
      keyConditionExpression += ' AND submissionDate >= :startDate';
      expressionAttributeValues[':startDate'] = startDate;
    } else if (endDate) {
      keyConditionExpression += ' AND submissionDate <= :endDate';
      expressionAttributeValues[':endDate'] = endDate;
    }

    const queryParams: QueryCommandInput = {
      TableName: TABLES.SUBMISSIONS,
      IndexName: GSI.SUBMISSIONS_CHURCH_DATE,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ScanIndexForward: false, // Sort by submissionDate descending
    };

    if (nextToken) {
      try {
        queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
      } catch {
        throw new Error('Invalid nextToken provided');
      }
    }

    try {
      const result = await docClient.send(new QueryCommand(queryParams));
      const items = (result.Items || []) as HealthSubmission[];

      return {
        items,
        count: items.length,
        nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
      };
    } catch (error) {
      console.error('Error querying submissions by church and date:', error);
      throw new Error('Failed to query submissions by church and date');
    }
  }

  /**
   * Scan submissions with filters (fallback for complex queries)
   */
  private async scanWithFilters(
    params: PaginationParams & SubmissionFilters
  ): Promise<PaginatedResponse<HealthSubmission>> {
    const {
      limit = this.defaultLimit,
      nextToken,
      churchId,
      startDate,
      endDate,
      riskLevel,
      followUpStatus,
      search
    } = params;

    const scanParams: ScanCommandInput = {
      TableName: TABLES.SUBMISSIONS,
      Limit: limit,
    };

    // Add filter expressions
    let filterExpression = '';
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    if (churchId) {
      filterExpression += '#churchId = :churchId';
      expressionAttributeNames['#churchId'] = 'churchId';
      expressionAttributeValues[':churchId'] = churchId;
    }

    if (riskLevel) {
      if (filterExpression) filterExpression += ' AND ';
      filterExpression += '#riskLevel = :riskLevel';
      expressionAttributeNames['#riskLevel'] = 'healthRiskLevel';
      expressionAttributeValues[':riskLevel'] = riskLevel;
    }

    if (followUpStatus) {
      if (filterExpression) filterExpression += ' AND ';
      filterExpression += '#followUpStatus = :followUpStatus';
      expressionAttributeNames['#followUpStatus'] = 'followUpStatus';
      expressionAttributeValues[':followUpStatus'] = followUpStatus;
    }

    if (startDate || endDate) {
      if (filterExpression) filterExpression += ' AND ';

      if (startDate && endDate) {
        filterExpression += '#submissionDate BETWEEN :startDate AND :endDate';
        expressionAttributeValues[':startDate'] = startDate;
        expressionAttributeValues[':endDate'] = endDate;
      } else if (startDate) {
        filterExpression += '#submissionDate >= :startDate';
        expressionAttributeValues[':startDate'] = startDate;
      } else {
        filterExpression += '#submissionDate <= :endDate';
        expressionAttributeValues[':endDate'] = endDate;
      }

      expressionAttributeNames['#submissionDate'] = 'submissionDate';
    }

    if (filterExpression) {
      scanParams.FilterExpression = filterExpression;
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
    }

    if (nextToken) {
      try {
        scanParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
      } catch {
        throw new Error('Invalid nextToken provided');
      }
    }

    try {
      const result = await docClient.send(new ScanCommand(scanParams));

      let items = (result.Items || []) as HealthSubmission[];

      // Apply search filter client-side (since DynamoDB doesn't support full-text search)
      if (search) {
        const searchTerm = search.toLowerCase();
        items = items.filter(item =>
          item.firstName.toLowerCase().includes(searchTerm) ||
          item.lastName.toLowerCase().includes(searchTerm) ||
          item.email?.toLowerCase().includes(searchTerm) ||
          item.phone?.includes(searchTerm) ||
          item.id.toLowerCase().includes(searchTerm)
        );
      }

      // Sort by submission date (newest first)
      items.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

      return {
        items,
        count: items.length,
        nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
      };
    } catch (error) {
      console.error('Error scanning submissions:', error);
      throw new Error('Failed to scan submissions');
    }
  }

  /**
   * Update follow-up information for a submission
   */
  async updateFollowUp(
    submissionId: string,
    updates: {
      followUpStatus?: string;
      followUpNotes?: string;
      followUpDate?: string;
      selfieUrl?: string; // Allow photo URL updates
    }
  ): Promise<HealthSubmission> {
    // Validate photo URL if provided
    if (updates.selfieUrl) {
      const photoValidation = validatePhotoUrl(updates.selfieUrl, submissionId);
      if (!photoValidation.isValid) {
        throw new Error(`Invalid photo URL: ${photoValidation.errors.join(', ')}`);
      }

      // Verify photo exists and is accessible
      const photoAccess = await verifyPhotoAccess(updates.selfieUrl);
      if (!photoAccess.exists) {
        throw new Error(`Photo not accessible: ${photoAccess.errors.join(', ')}`);
      }
    }
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

  /**
   * Get a single submission by ID
   */
  async getSubmissionById(submissionId: string): Promise<HealthSubmission | null> {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: TABLES.SUBMISSIONS,
        Key: { id: submissionId },
      }));

      return (result.Item as HealthSubmission) || null;
    } catch (error) {
      console.error('Error getting submission by ID:', error);
      throw new Error('Failed to get submission');
    }
  }
}

// Export singleton instance
export const submissionsService = new SubmissionsService();
>>>>>>> ee7ad6508d6a63dc3c6f4c4cf2b6657ba41b7171
