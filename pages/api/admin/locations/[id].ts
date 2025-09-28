import { NextApiRequest, NextApiResponse } from 'next';
import { GetCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '@/lib/aws-config';
import { ApiResponse, OutreachLocation } from '@/types';
import { requireAdmin } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OutreachLocation | null>>
) {
  // Verify authentication
  try {
    requireAdmin(req);
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { id } = req.query;
  const locationId = Array.isArray(id) ? id[0] : id;

  if (!locationId) {
    return res.status(400).json({ success: false, error: 'Location id is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(locationId, res);
      case 'PUT':
        return await handlePut(locationId, req, res);
      case 'DELETE':
        return await handleDelete(locationId, req, res);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Locations [id] API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function handleGet(
  locationId: string,
  res: NextApiResponse<ApiResponse<OutreachLocation | null>>
) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLES.CHURCHES,
      Key: { id: locationId },
    }));

    const item = (result.Item || null) as OutreachLocation | null;
    if (!item) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }

    return res.status(200).json({ success: true, data: item, message: 'Location retrieved' });
  } catch (error) {
    console.error('Get location error:', error);
    throw error;
  }
}

async function handlePut(
  locationId: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OutreachLocation | null>>
) {
  const { name, address, contactPerson, contactEmail, contactPhone } = req.body || {};

  // Validate required fields (UI sends all fields on edit)
  if (!name || !address || !contactPerson || !contactEmail || !contactPhone) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  try {
    const updateResult = await docClient.send(new UpdateCommand({
      TableName: TABLES.CHURCHES,
      Key: { id: locationId },
      UpdateExpression: 'SET #name = :name, #address = :address, contactPerson = :contactPerson, contactEmail = :contactEmail, contactPhone = :contactPhone',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#address': 'address',
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':address': address,
        ':contactPerson': contactPerson,
        ':contactEmail': contactEmail,
        ':contactPhone': contactPhone,
      },
      ConditionExpression: 'attribute_exists(id)',
      ReturnValues: 'ALL_NEW',
    }));

    const updated = (updateResult.Attributes || null) as OutreachLocation | null;
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }

    return res.status(200).json({ success: true, data: updated, message: 'Location updated successfully' });
  } catch (error: any) {
    if (error?.name === 'ConditionalCheckFailedException') {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }
    console.error('Update location error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update location' });
  }
}

async function handleDelete(
  locationId: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<null>>
) {
  try {
    // Check if submissions exist for this location (limit 1 for quick existence test)
    const submissionsExist = await hasSubmissions(locationId);

    // Determine requested action: default is hard delete when no submissions; require explicit archive when submissions exist
    const actionFromQuery = typeof req.query.action === 'string' ? req.query.action : undefined;
    const actionFromBody = (req.body && typeof req.body === 'object' && 'action' in req.body) ? (req.body as any).action : undefined;
    const action = (actionFromQuery || actionFromBody || '').toString();

    if (submissionsExist) {
      if (action !== 'archive') {
        return res.status(409).json({
          success: false,
          error: 'Location has existing submissions. Specify action=archive to archive instead of deleting.',
          message: 'This location has submissions. To proceed without deleting data, archive the location by sending action=archive.',
        } as ApiResponse<null>);
      }

      // Archive (soft delete) the location: set isActive=false and archivedAt timestamp
      await docClient.send(new UpdateCommand({
        TableName: TABLES.CHURCHES,
        Key: { id: locationId },
        UpdateExpression: 'SET isActive = :inactive, archivedAt = :ts',
        ExpressionAttributeValues: {
          ':inactive': false,
          ':ts': new Date().toISOString(),
        },
        ConditionExpression: 'attribute_exists(id)',
        ReturnValues: 'NONE',
      }));

      return res.status(200).json({ success: true, data: null, message: 'Location archived successfully' });
    }

    // No submissions, allow hard delete
    await docClient.send(new DeleteCommand({
      TableName: TABLES.CHURCHES,
      Key: { id: locationId },
      ConditionExpression: 'attribute_exists(id)',
    }));

    return res.status(200).json({ success: true, data: null, message: 'Location deleted successfully' });
  } catch (error: any) {
    if (error?.name === 'ConditionalCheckFailedException') {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }
    console.error('Delete location error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete location' });
  }
}

async function hasSubmissions(locationId: string): Promise<boolean> {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLES.SUBMISSIONS,
      FilterExpression: 'churchId = :cid',
      ExpressionAttributeValues: { ':cid': locationId },
      ProjectionExpression: 'id',
      Limit: 1,
    }));
    return !!(result.Items && result.Items.length > 0);
  } catch (error) {
    console.error('Error checking submissions existence:', error);
    // Fail-safe: if check fails, assume submissions might exist to avoid accidental deletion
    return true;
  }
}

