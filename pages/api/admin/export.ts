import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { createObjectCsvWriter } from 'csv-writer';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFileSync, unlinkSync } from 'fs';
// import { ExportOptions } from '@/types';

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
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
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
    // const exportOptions: ExportOptions = req.body;
    // TODO: Use exportOptions to filter/customize export data

    // Generate sample data for export (replace with actual database query)
    const mockData = [
      {
        id: 'sub-001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '05/15/1990',
        phone: '(555) 123-4567',
        email: 'john.doe@email.com',
        churchId: 'church-a',
        submissionDate: '2024-01-15T10:30:00Z',
        familyHistoryDiabetes: 'Yes',
        familyHistoryHighBP: 'No',
        familyHistoryDementia: 'No',
        nerveSymptoms: 'Yes',
        estimatedBMI: '26.5',
        bmiCategory: 'Overweight',
        estimatedAge: '34',
        estimatedGender: 'Male',
        healthRiskLevel: 'Moderate',
        healthRiskScore: '3',
        followUpStatus: 'Pending',
        consentScheduling: 'Yes',
        consentTexting: 'Yes',
        consentFollowup: 'Yes',
        // Device and Network Information
        ipAddress: '192.168.1.100',
        deviceType: 'mobile',
        browser: 'Chrome 120.0',
        operatingSystem: 'iOS 17.1',
        submissionFingerprint: 'abc123def456',
        timezone: 'America/New_York',
        screenResolution: '375x812',
      },
      {
        id: 'sub-002',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '03/22/1985',
        phone: '(555) 987-6543',
        email: 'jane.smith@email.com',
        churchId: 'church-b',
        submissionDate: '2024-01-16T14:20:00Z',
        familyHistoryDiabetes: 'Yes',
        familyHistoryHighBP: 'Yes',
        familyHistoryDementia: 'No',
        nerveSymptoms: 'No',
        estimatedBMI: '22.1',
        bmiCategory: 'Normal',
        estimatedAge: '39',
        estimatedGender: 'Female',
        healthRiskLevel: 'Moderate',
        healthRiskScore: '4',
        followUpStatus: 'Contacted',
        consentScheduling: 'Yes',
        consentTexting: 'Yes',
        consentFollowup: 'Yes',
        // Device and Network Information
        ipAddress: '10.0.1.45',
        deviceType: 'desktop',
        browser: 'Firefox 119.0',
        operatingSystem: 'Windows 11',
        submissionFingerprint: 'xyz789ghi012',
        timezone: 'America/Chicago',
        screenResolution: '1920x1080',
      },
      // Add more sample data as needed
    ];

    // Define CSV headers
    const csvHeaders = [
      { id: 'id', title: 'Submission ID' },
      { id: 'firstName', title: 'First Name' },
      { id: 'lastName', title: 'Last Name' },
      { id: 'dateOfBirth', title: 'Date of Birth' },
      { id: 'phone', title: 'Phone Number' },
      { id: 'email', title: 'Email Address' },
      { id: 'churchId', title: 'Outreach Location' },
      { id: 'submissionDate', title: 'Submission Date' },
      { id: 'familyHistoryDiabetes', title: 'Family History - Diabetes' },
      { id: 'familyHistoryHighBP', title: 'Family History - High BP' },
      { id: 'familyHistoryDementia', title: 'Family History - Dementia' },
      { id: 'nerveSymptoms', title: 'Nerve Symptoms' },
      { id: 'estimatedBMI', title: 'Estimated BMI' },
      { id: 'bmiCategory', title: 'BMI Category' },
      { id: 'estimatedAge', title: 'Estimated Age' },
      { id: 'estimatedGender', title: 'Estimated Gender' },
      { id: 'healthRiskLevel', title: 'Health Risk Level' },
      { id: 'healthRiskScore', title: 'Health Risk Score' },
      { id: 'followUpStatus', title: 'Follow-up Status' },
      { id: 'consentScheduling', title: 'Consent - Scheduling' },
      { id: 'consentTexting', title: 'Consent - Texting' },
      { id: 'consentFollowup', title: 'Consent - Follow-up' },
      // Device and Network Information
      { id: 'ipAddress', title: 'IP Address' },
      { id: 'deviceType', title: 'Device Type' },
      { id: 'browser', title: 'Browser' },
      { id: 'operatingSystem', title: 'Operating System' },
      { id: 'submissionFingerprint', title: 'Submission Fingerprint' },
      { id: 'timezone', title: 'Timezone' },
      { id: 'screenResolution', title: 'Screen Resolution' },
    ];

    // Create temporary file
    const fileName = `health-screening-export-${Date.now()}.csv`;
    const filePath = join(tmpdir(), fileName);

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: csvHeaders,
    });

    // Write data to CSV
    await csvWriter.writeRecords(mockData);

    // Read the file and send as response
    const fileBuffer = readFileSync(filePath);
    
    // Set headers for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    // Clean up temporary file
    unlinkSync(filePath);

    // Send file
    res.status(200).send(fileBuffer);

  } catch (_error) {
    console.error('Export API error:', _error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to export data',
    });
  }
} 