import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  GetCommand,
  ScanCommandInput,
  QueryCommandInput
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '@/lib/aws-config';
import { HealthSubmission } from '@/types';

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
    const gsiName = process.env.APP_DYNAMODB_SUBMISSIONS_GSI_CHURCH_DATE;

    if (!gsiName) {
      throw new Error('Church submissions GSI not configured. Set APP_DYNAMODB_SUBMISSIONS_GSI_CHURCH_DATE environment variable.');
    }

    const queryParams: QueryCommandInput = {
      TableName: TABLES.SUBMISSIONS,
      IndexName: gsiName,
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
    const gsiName = process.env.APP_DYNAMODB_SUBMISSIONS_GSI_CHURCH_DATE;

    if (!gsiName) {
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
      IndexName: gsiName,
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
    }
  ): Promise<HealthSubmission> {
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
