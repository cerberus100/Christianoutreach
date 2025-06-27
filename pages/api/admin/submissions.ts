import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { HealthSubmission, ApiResponse } from '@/types';

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
  res: NextApiResponse<ApiResponse<HealthSubmission[]>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Verify authentication
  if (!verifyAuth(req)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  try {
    // For now, return mock data
    // TODO: Replace with actual DynamoDB query
    const mockSubmissions: HealthSubmission[] = [
      {
        id: 'sub-001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '05/15/1990',
        selfieUrl: 'https://example.com/selfie1.jpg',
        churchId: 'loc-001',
        submissionDate: '2024-06-20T10:30:00Z',
        familyHistoryDiabetes: true,
        familyHistoryHighBP: false,
        familyHistoryDementia: false,
        nerveSymptoms: true,
        tcpaConsent: true,
        phone: '(555) 123-4567',
        email: 'john.doe@email.com',
        estimatedBMI: 26.5,
        bmiCategory: 'Overweight',
        estimatedAge: 34,
        estimatedGender: 'Male',
        healthRiskLevel: 'Moderate',
        healthRiskScore: 3,
        recommendations: [
          'Consider weight management programs',
          'Regular blood glucose monitoring recommended',
          'Consult healthcare provider about neuropathy symptoms',
          'Maintain regular physical activity',
          'Follow a balanced, nutritious diet',
          'Schedule regular healthcare checkups'
        ],
        followUpStatus: 'Pending',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/537.36',
          device: { type: 'mobile', brand: 'Apple', model: 'iPhone 15' },
          browser: { name: 'Safari', version: '17.1' },
          os: { name: 'iOS', version: '17.1' },
          screen: { width: 393, height: 852 },
          timezone: 'America/New_York',
          language: 'en-US'
        },
        networkInfo: {
          ipAddress: '192.168.1.1',
          ipType: 'IPv4' as const,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/537.36',
          referrer: 'https://www.google.com/'
        },
        submissionFingerprint: 'abc123def456',
        sessionId: 'sess-001'
      },
      {
        id: 'sub-002',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '03/22/1985',
        selfieUrl: 'https://example.com/selfie2.jpg',
        churchId: 'loc-002',
        submissionDate: '2024-06-21T14:20:00Z',
        familyHistoryDiabetes: true,
        familyHistoryHighBP: true,
        familyHistoryDementia: false,
        nerveSymptoms: false,
        tcpaConsent: true,
        phone: '(555) 987-6543',
        email: 'jane.smith@email.com',
        estimatedBMI: 22.1,
        bmiCategory: 'Normal weight',
        estimatedAge: 39,
        estimatedGender: 'Female',
        healthRiskLevel: 'Moderate',
        healthRiskScore: 4,
        recommendations: [
          'Regular blood glucose monitoring recommended',
          'Regular blood pressure monitoring recommended',
          'Maintain regular physical activity',
          'Follow a balanced, nutritious diet',
          'Schedule regular healthcare checkups'
        ],
        followUpStatus: 'Contacted',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          device: { type: 'desktop' },
          browser: { name: 'Chrome', version: '120.0' },
          os: { name: 'Windows', version: '11' },
          screen: { width: 1920, height: 1080 },
          timezone: 'America/Chicago',
          language: 'en-US'
        },
        networkInfo: {
          ipAddress: '192.168.1.2',
          ipType: 'IPv4' as const,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        submissionFingerprint: 'xyz789ghi012',
        sessionId: 'sess-002'
      },
      {
        id: 'sub-003',
        firstName: 'Mike',
        lastName: 'Johnson',
        dateOfBirth: '11/08/1978',
        selfieUrl: 'https://example.com/selfie3.jpg',
        churchId: 'loc-001',
        submissionDate: '2024-06-22T09:15:00Z',
        familyHistoryDiabetes: false,
        familyHistoryHighBP: true,
        familyHistoryDementia: true,
        nerveSymptoms: false,
        tcpaConsent: true,
        phone: '(555) 456-7890',
        email: 'mike.johnson@email.com',
        estimatedBMI: 31.2,
        bmiCategory: 'Obese',
        estimatedAge: 46,
        estimatedGender: 'Male',
        healthRiskLevel: 'High',
        healthRiskScore: 6,
        recommendations: [
          'Consider weight management programs',
          'Regular blood pressure monitoring recommended',
          'Consider cognitive health maintenance activities',
          'Maintain regular physical activity',
          'Follow a balanced, nutritious diet',
          'Schedule regular healthcare checkups'
        ],
        followUpStatus: 'Scheduled',
        followUpDate: '2024-06-25T15:00:00Z',
        followUpNotes: 'Scheduled for consultation on diabetes prevention',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          device: { type: 'desktop', brand: 'Apple' },
          browser: { name: 'Chrome', version: '120.0' },
          os: { name: 'macOS', version: '14.1' },
          screen: { width: 1440, height: 900 },
          timezone: 'America/Denver',
          language: 'en-US'
        },
        networkInfo: {
          ipAddress: '192.168.1.3',
          ipType: 'IPv4' as const,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        submissionFingerprint: 'def456abc789',
        sessionId: 'sess-003'
      },
      {
        id: 'sub-004',
        firstName: 'Sarah',
        lastName: 'Williams',
        dateOfBirth: '07/12/1992',
        selfieUrl: 'https://example.com/selfie4.jpg',
        churchId: 'loc-003',
        submissionDate: '2024-06-23T16:45:00Z',
        familyHistoryDiabetes: false,
        familyHistoryHighBP: false,
        familyHistoryDementia: false,
        nerveSymptoms: false,
        tcpaConsent: true,
        phone: '(555) 321-0987',
        email: 'sarah.williams@email.com',
        estimatedBMI: 20.8,
        bmiCategory: 'Normal weight',
        estimatedAge: 32,
        estimatedGender: 'Female',
        healthRiskLevel: 'Low',
        healthRiskScore: 0,
        recommendations: [
          'Maintain regular physical activity',
          'Follow a balanced, nutritious diet',
          'Schedule regular healthcare checkups'
        ],
        followUpStatus: 'Completed',
        followUpDate: '2024-06-24T10:00:00Z',
        followUpNotes: 'Provided general wellness information',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15',
          device: { type: 'tablet', brand: 'Apple', model: 'iPad Air' },
          browser: { name: 'Safari', version: '17.1' },
          os: { name: 'iOS', version: '17.1' },
          screen: { width: 1024, height: 768 },
          timezone: 'America/Los_Angeles',
          language: 'en-US'
        },
        networkInfo: {
          ipAddress: '192.168.1.4',
          ipType: 'IPv4' as const,
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15'
        },
        submissionFingerprint: 'ghi012jkl345',
        sessionId: 'sess-004'
      },
      {
        id: 'sub-005',
        firstName: 'Robert',
        lastName: 'Brown',
        dateOfBirth: '12/03/1965',
        selfieUrl: 'https://example.com/selfie5.jpg',
        churchId: 'loc-002',
        submissionDate: '2024-06-24T11:30:00Z',
        familyHistoryDiabetes: true,
        familyHistoryHighBP: true,
        familyHistoryDementia: true,
        nerveSymptoms: true,
        tcpaConsent: true,
        phone: '(555) 654-3210',
        email: 'robert.brown@email.com',
        estimatedBMI: 35.4,
        bmiCategory: 'Obese',
        estimatedAge: 59,
        estimatedGender: 'Male',
        healthRiskLevel: 'Very High',
        healthRiskScore: 9,
        recommendations: [
          'Consider weight management programs',
          'Regular blood glucose monitoring recommended',
          'Regular blood pressure monitoring recommended',
          'Consider cognitive health maintenance activities',
          'Consult healthcare provider about neuropathy symptoms',
          'Maintain regular physical activity',
          'Follow a balanced, nutritious diet',
          'Schedule regular healthcare checkups'
        ],
        followUpStatus: 'Contacted',
        followUpDate: '2024-06-25T09:00:00Z',
        followUpNotes: 'Urgent follow-up scheduled for comprehensive health evaluation',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/119.0',
          device: { type: 'desktop' },
          browser: { name: 'Firefox', version: '119.0' },
          os: { name: 'Linux', version: 'Ubuntu 22.04' },
          screen: { width: 1366, height: 768 },
          timezone: 'America/New_York',
          language: 'en-US'
        },
        networkInfo: {
          ipAddress: '192.168.1.5',
          ipType: 'IPv4' as const,
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/119.0'
        },
        submissionFingerprint: 'jkl345mno678',
        sessionId: 'sess-005'
      }
    ];

    // Apply filters if provided
    const { location, riskLevel, followUpStatus, search } = req.query;
    
    let filteredSubmissions = [...mockSubmissions];

    if (location) {
      filteredSubmissions = filteredSubmissions.filter(s => s.churchId === location);
    }

    if (riskLevel) {
      filteredSubmissions = filteredSubmissions.filter(s => s.healthRiskLevel === riskLevel);
    }

    if (followUpStatus) {
      filteredSubmissions = filteredSubmissions.filter(s => s.followUpStatus === followUpStatus);
    }

    if (search) {
      const searchTerm = search.toString().toLowerCase();
      filteredSubmissions = filteredSubmissions.filter(s => 
        s.firstName.toLowerCase().includes(searchTerm) ||
        s.lastName.toLowerCase().includes(searchTerm) ||
        s.email?.toLowerCase().includes(searchTerm) ||
        s.phone?.includes(searchTerm)
      );
    }

    // Sort by submission date (newest first)
    filteredSubmissions.sort((a, b) => 
      new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
    );

    res.status(200).json({
      success: true,
      data: filteredSubmissions,
      message: `Retrieved ${filteredSubmissions.length} submissions`,
    });

  } catch (_error) {
    console.error('Submissions API error:', _error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve submissions',
    });
  }
} 