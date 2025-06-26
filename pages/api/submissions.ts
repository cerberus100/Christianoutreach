import { NextApiRequest, NextApiResponse } from 'next';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import fs from 'fs';
import { docClient, s3Client, TABLES, S3_BUCKET } from '@/lib/aws-config';
import { aryaAI } from '@/lib/arya-ai';
import { 
  extractNetworkInfo, 
  parseUserAgent, 
  generateSubmissionFingerprint,
  detectFraudIndicators 
} from '@/lib/device-tracker';
import { HealthSubmission, ApiResponse, DeviceInfo, NetworkInfo } from '@/types';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface FormSubmissionData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  churchId: string;
  phone: string;
  email?: string;
  familyHistoryDiabetes: boolean;
  familyHistoryHighBP: boolean;
  familyHistoryDementia: boolean;
  nerveSymptoms: boolean;
  tcpaConsent: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ id: string }>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Parse form data including file upload
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    // Extract client device info if provided
    const clientDeviceInfoStr = Array.isArray(fields.clientDeviceInfo) 
      ? fields.clientDeviceInfo[0] 
      : fields.clientDeviceInfo;
    
    let clientDeviceInfo = {};
    if (clientDeviceInfoStr) {
      try {
        clientDeviceInfo = JSON.parse(clientDeviceInfoStr);
      } catch (error) {
        console.warn('Failed to parse client device info:', error);
      }
    }
    
    // Extract form data
    const formData: FormSubmissionData = {
      firstName: Array.isArray(fields.firstName) ? fields.firstName[0] : fields.firstName || '',
      lastName: Array.isArray(fields.lastName) ? fields.lastName[0] : fields.lastName || '',
      dateOfBirth: Array.isArray(fields.dateOfBirth) ? fields.dateOfBirth[0] : fields.dateOfBirth || '',
      churchId: Array.isArray(fields.churchId) ? fields.churchId[0] : fields.churchId || '',
      phone: Array.isArray(fields.phone) ? fields.phone[0] : fields.phone || '',
      email: Array.isArray(fields.email) ? fields.email[0] : fields.email,
      familyHistoryDiabetes: (Array.isArray(fields.familyHistoryDiabetes) ? fields.familyHistoryDiabetes[0] : fields.familyHistoryDiabetes) === 'true',
      familyHistoryHighBP: (Array.isArray(fields.familyHistoryHighBP) ? fields.familyHistoryHighBP[0] : fields.familyHistoryHighBP) === 'true',
      familyHistoryDementia: (Array.isArray(fields.familyHistoryDementia) ? fields.familyHistoryDementia[0] : fields.familyHistoryDementia) === 'true',
      nerveSymptoms: (Array.isArray(fields.nerveSymptoms) ? fields.nerveSymptoms[0] : fields.nerveSymptoms) === 'true',
      tcpaConsent: (Array.isArray(fields.tcpaConsent) ? fields.tcpaConsent[0] : fields.tcpaConsent) === 'true',
    };

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.churchId || !formData.phone) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields (firstName, lastName, dateOfBirth, churchId, phone)',
      });
    }

    // Validate TCPA consent
    if (!formData.tcpaConsent) {
      return res.status(400).json({
        success: false,
        error: 'TCPA consent is required',
      });
    }

    // Handle selfie upload
    const selfieFile = Array.isArray(files.selfie) ? files.selfie[0] : files.selfie;
    if (!selfieFile) {
      return res.status(400).json({
        success: false,
        error: 'Selfie photo is required',
      });
    }

    const submissionId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Upload photo to S3
    const fileBuffer = fs.readFileSync(selfieFile.filepath);
    const fileExtension = selfieFile.originalFilename?.split('.').pop() || 'jpg';
    const s3Key = `submissions/${submissionId}/selfie.${fileExtension}`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: selfieFile.mimetype || 'image/jpeg',
      Metadata: {
        submissionId,
        churchId: formData.churchId,
        uploadDate: timestamp,
      },
    }));

    const selfieUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`;

    // Capture device and network information
    const networkInfo: NetworkInfo = extractNetworkInfo(req);
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo: DeviceInfo = {
      userAgent,
      ...parseUserAgent(userAgent),
      ...clientDeviceInfo, // Merge client-side info
    };

    // Generate submission fingerprint
    const submissionFingerprint = generateSubmissionFingerprint(
      deviceInfo,
      networkInfo,
      formData as unknown as Record<string, unknown>
    );

    // Detect potential fraud indicators
    const fraudIndicators = detectFraudIndicators(deviceInfo, networkInfo);
    if (fraudIndicators.length > 0) {
      console.warn(`Fraud indicators detected for submission ${submissionId}:`, fraudIndicators);
    }

    // Analyze photo with Arya.ai
    let aiAnalysis = null;
    let healthRisk = null;
    
    try {
      aiAnalysis = await aryaAI.analyzeSelfie(fileBuffer, selfieFile.mimetype || 'image/jpeg');
      
      if (aiAnalysis.success) {
        healthRisk = aryaAI.assessHealthRisk(
          aiAnalysis.bmi.value,
          formData.familyHistoryDiabetes,
          formData.familyHistoryHighBP,
          formData.familyHistoryDementia,
          formData.nerveSymptoms
        );
      }
    } catch (error) {
      console.error('AI Analysis error:', error);
      // Continue without AI analysis if it fails
    }

    // Create submission record
    const submission: HealthSubmission = {
      id: submissionId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      dateOfBirth: formData.dateOfBirth,
      selfieUrl,
      churchId: formData.churchId,
      submissionDate: timestamp,
      
      // Health screening responses
      familyHistoryDiabetes: formData.familyHistoryDiabetes,
      familyHistoryHighBP: formData.familyHistoryHighBP,
      familyHistoryDementia: formData.familyHistoryDementia,
      nerveSymptoms: formData.nerveSymptoms,
      
      // TCPA Consent
      tcpaConsent: formData.tcpaConsent,
      
      // Contact info (phone now required)
      phone: formData.phone,
      email: formData.email,
      
      // AI Analysis results
      estimatedBMI: aiAnalysis?.bmi.value,
      bmiCategory: aiAnalysis?.bmi.category,
      estimatedAge: aiAnalysis?.age.estimated,
      estimatedGender: aiAnalysis?.gender.predicted,
      healthRiskLevel: healthRisk?.riskLevel,
      healthRiskScore: healthRisk?.riskScore,
      recommendations: healthRisk?.recommendations,
      
      // Follow-up tracking
      followUpStatus: 'Pending',
      
      // Device and Network Tracking
      deviceInfo,
      networkInfo,
      submissionFingerprint,
      sessionId: uuidv4(),
    };

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: TABLES.SUBMISSIONS,
      Item: submission,
    }));

    // Clean up temporary file
    fs.unlinkSync(selfieFile.filepath);

    // Return success response
    res.status(201).json({
      success: true,
      data: { id: submissionId },
      message: 'Health screening submitted successfully',
    });

  } catch (error) {
    console.error('Submission API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process health screening submission',
    });
  }
} 