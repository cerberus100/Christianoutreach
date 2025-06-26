import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OutreachLocation, ApiResponse } from '@/types';

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
  res: NextApiResponse<ApiResponse<OutreachLocation | OutreachLocation[]>>
) {
  // Verify authentication
  if (!verifyAuth(req)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

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
    // For now, return mock data
    // TODO: Replace with actual DynamoDB query
    const mockLocations: OutreachLocation[] = [
      {
        id: 'loc-001',
        name: 'First Baptist Church',
        address: '123 Main St, Atlanta, GA 30309',
        contactPerson: 'Pastor John Smith',
        contactEmail: 'pastor@firstbaptist.org',
        contactPhone: '(404) 555-0123',
        qrCode: 'qr-loc-001',
        createdDate: '2024-01-15T10:00:00Z',
        isActive: true,
        totalSubmissions: 25,
        recentSubmissions: 5,
        conversionRate: 0.78,
      },
      {
        id: 'loc-002',
        name: 'Mount Olive Church',
        address: '456 Oak Ave, Atlanta, GA 30310',
        contactPerson: 'Pastor Mary Johnson',
        contactEmail: 'pastor@mountolive.org',
        contactPhone: '(404) 555-0456',
        qrCode: 'qr-loc-002',
        createdDate: '2024-01-20T14:30:00Z',
        isActive: true,
        totalSubmissions: 18,
        recentSubmissions: 3,
        conversionRate: 0.85,
      },
      {
        id: 'loc-003',
        name: 'New Hope Community Church',
        address: '789 Pine St, Atlanta, GA 30311',
        contactPerson: 'Pastor David Wilson',
        contactEmail: 'pastor@newhope.org',
        contactPhone: '(404) 555-0789',
        qrCode: 'qr-loc-003',
        createdDate: '2024-02-01T09:15:00Z',
        isActive: true,
        totalSubmissions: 32,
        recentSubmissions: 8,
        conversionRate: 0.72,
      },
    ];

    return res.status(200).json({
      success: true,
      data: mockLocations,
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

    // TODO: Save to DynamoDB
    // await docClient.send(new PutCommand({
    //   TableName: TABLES.CHURCHES,
    //   Item: newLocation,
    // }));

    // For now, just return the created location
    console.warn('Created location:', newLocation);

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