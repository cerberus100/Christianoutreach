import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth';
import { createObjectCsvWriter } from 'csv-writer';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFileSync, unlinkSync } from 'fs';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '@/lib/aws-config';
import { HealthSubmission } from '@/types';

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

// Helper function to format boolean values for CSV
function formatBoolean(value: boolean | undefined): string {
  if (value === undefined || value === null) return '';
  return value ? 'Yes' : 'No';
}

// Helper function to safely get nested object values
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    value = value?.[key];
  }
  return value?.toString() || '';
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

  // Verify admin authentication
  const user = requireAdmin(req, res);
  if (!user) return; // Response already sent by requireAdmin

  try {
    // Query all submissions from DynamoDB
    console.log('Exporting submissions from DynamoDB...');
    
    const submissionsResult = await docClient.send(new ScanCommand({
      TableName: TABLES.SUBMISSIONS,
    }));

    const submissions = (submissionsResult.Items || []) as HealthSubmission[];

    // Query locations to get names for churchId mapping
    const locationsResult = await docClient.send(new ScanCommand({
      TableName: TABLES.CHURCHES,
    }));

    const locationMap = new Map();
    if (locationsResult.Items) {
      locationsResult.Items.forEach((location: any) => {
        locationMap.set(location.id, location.name);
      });
    }

    // Transform submissions data for CSV export
    const exportData = submissions.map(submission => ({
      id: submission.id,
      firstName: submission.firstName,
      lastName: submission.lastName,
      dateOfBirth: submission.dateOfBirth,
      phone: submission.phone || '',
      email: submission.email || '',
      churchId: submission.churchId,
      churchName: locationMap.get(submission.churchId) || submission.churchId,
      submissionDate: submission.submissionDate,
      
      // Health screening responses
      familyHistoryDiabetes: formatBoolean(submission.familyHistoryDiabetes),
      familyHistoryHighBP: formatBoolean(submission.familyHistoryHighBP),
      familyHistoryDementia: formatBoolean(submission.familyHistoryDementia),
      nerveSymptoms: formatBoolean(submission.nerveSymptoms),
      sex: submission.sex || '',
      cardiovascularHistory: formatBoolean(submission.cardiovascularHistory),
      chronicKidneyDisease: formatBoolean(submission.chronicKidneyDisease),
      diabetes: formatBoolean(submission.diabetes),
      insuranceType: submission.insuranceType || '',
      
      // Calculated fields
      estimatedBMI: submission.estimatedBMI?.toString() || '',
      bmiCategory: submission.bmiCategory || '',
      estimatedAge: submission.estimatedAge?.toString() || '',
      estimatedGender: submission.estimatedGender || '',
      healthRiskLevel: submission.healthRiskLevel || '',
      healthRiskScore: submission.healthRiskScore?.toString() || '',
      
      // Follow-up
      followUpStatus: submission.followUpStatus || '',
      tcpaConsent: formatBoolean(submission.tcpaConsent),
      
      // Device Information
      ipAddress: getNestedValue(submission, 'networkInfo.ipAddress'),
      deviceType: getNestedValue(submission, 'deviceInfo.device.type'),
      browser: getNestedValue(submission, 'deviceInfo.browser.name') + ' ' + getNestedValue(submission, 'deviceInfo.browser.version'),
      operatingSystem: getNestedValue(submission, 'deviceInfo.os.name') + ' ' + getNestedValue(submission, 'deviceInfo.os.version'),
      submissionFingerprint: submission.submissionFingerprint || '',
      timezone: getNestedValue(submission, 'deviceInfo.timezone'),
      screenResolution: getNestedValue(submission, 'deviceInfo.screen.width') + 'x' + getNestedValue(submission, 'deviceInfo.screen.height'),
      userAgent: getNestedValue(submission, 'deviceInfo.userAgent'),
      sessionId: submission.sessionId || '',
    }));

    // Define CSV headers
    const csvHeaders = [
      { id: 'id', title: 'Submission ID' },
      { id: 'firstName', title: 'First Name' },
      { id: 'lastName', title: 'Last Name' },
      { id: 'dateOfBirth', title: 'Date of Birth' },
      { id: 'phone', title: 'Phone Number' },
      { id: 'email', title: 'Email Address' },
      { id: 'churchId', title: 'Church ID' },
      { id: 'churchName', title: 'Church Name' },
      { id: 'submissionDate', title: 'Submission Date' },
      
      // Health screening
      { id: 'familyHistoryDiabetes', title: 'Family History - Diabetes' },
      { id: 'familyHistoryHighBP', title: 'Family History - High BP' },
      { id: 'familyHistoryDementia', title: 'Family History - Dementia' },
      { id: 'nerveSymptoms', title: 'Nerve Symptoms' },
      { id: 'sex', title: 'Sex' },
      { id: 'cardiovascularHistory', title: 'Cardiovascular History' },
      { id: 'chronicKidneyDisease', title: 'Chronic Kidney Disease' },
      { id: 'diabetes', title: 'Diabetes' },
      { id: 'insuranceType', title: 'Insurance Type' },
      
      // Calculated
      { id: 'estimatedBMI', title: 'Estimated BMI' },
      { id: 'bmiCategory', title: 'BMI Category' },
      { id: 'estimatedAge', title: 'Estimated Age' },
      { id: 'estimatedGender', title: 'Estimated Gender' },
      { id: 'healthRiskLevel', title: 'Health Risk Level' },
      { id: 'healthRiskScore', title: 'Health Risk Score' },
      
      // Follow-up
      { id: 'followUpStatus', title: 'Follow-up Status' },
      { id: 'tcpaConsent', title: 'TCPA Consent' },
      
      // Device and Network Information
      { id: 'ipAddress', title: 'IP Address' },
      { id: 'deviceType', title: 'Device Type' },
      { id: 'browser', title: 'Browser' },
      { id: 'operatingSystem', title: 'Operating System' },
      { id: 'submissionFingerprint', title: 'Submission Fingerprint' },
      { id: 'timezone', title: 'Timezone' },
      { id: 'screenResolution', title: 'Screen Resolution' },
      { id: 'userAgent', title: 'User Agent' },
      { id: 'sessionId', title: 'Session ID' },
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
    await csvWriter.writeRecords(exportData);

    // Read the file and send as response
    const fileBuffer = readFileSync(filePath);
    
    // Set headers for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    // Clean up temporary file
    unlinkSync(filePath);

    console.log(`Exported ${exportData.length} submissions to CSV`);

    // Send file
    res.status(200).send(fileBuffer);

  } catch (error) {
    console.error('Export API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to export data',
    });
  }
} 