import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '@/lib/auth';
import { OutreachLocation, ApiResponse } from '@/types';
import { docClient, TABLES } from '@/lib/aws-config';
import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OutreachLocation | OutreachLocation[]>>
) {
  // Verify admin authentication
  const user = requireAdmin(req, res);
  if (!user) return; // Response already sent by requireAdmin

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
        });
    }
  } catch (_error) {
    console.error('Locations API error:', _error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OutreachLocation[]>>
) {
  try {
    // Get all locations from DynamoDB
    const result = await docClient.send(new ScanCommand({
      TableName: TABLES.CHURCHES,
    }));

    const locations = (result.Items || []) as OutreachLocation[];

    return res.status(200).json({
      success: true,
      data: locations,
      message: 'Locations retrieved successfully',
    });
  } catch (error) {
    console.error('Get locations error:', error);
    throw error;
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OutreachLocation>>
) {
  try {
    const { name, address, contactPerson, contactEmail, contactPhone } = req.body;

    // Validate required fields
    if (!name || !address || !contactPerson || !contactEmail || !contactPhone) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
    }

    // Create new location
    const locationId = uuidv4();
    const newLocation: OutreachLocation = {
      id: locationId,
      name,
      address,
      contactPerson,
      contactEmail,
      contactPhone,
      qrCode: `qr-${locationId}`,
      createdDate: new Date().toISOString(),
      isActive: true,
      totalSubmissions: 0,
      recentSubmissions: 0,
      conversionRate: 0,
    };

    // TODO: Save to DynamoDB when database is configured
    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: TABLES.CHURCHES,
      Item: newLocation,
    }));

    console.log('Location saved successfully:', newLocation);

    return res.status(201).json({
      success: true,
      data: newLocation,
      message: 'Location created successfully',
    });
  } catch (error) {
    console.error('Create location error:', error);
    throw error;
  }
} 