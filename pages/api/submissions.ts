import { NextApiRequest, NextApiResponse } from 'next';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { tmpdir } from 'os';
import formidable from 'formidable';
import fs from 'fs';
import { docClient, s3Client, TABLES, S3_BUCKET } from '@/lib/aws-config';
import { aryaAI } from '@/lib/arya-ai';
import { validateUploadedFile, SELFIE_VALIDATION_OPTIONS, checkUploadRateLimit } from '@/lib/file-validation';
import { SMSService } from '@/lib/sms-service';
import { 
  extractNetworkInfo, 
  parseUserAgent, 
  generateSubmissionFingerprint,
  extractIpAddress
} from '@/lib/device-tracker';
import { HealthSubmission, ApiResponse, DeviceInfo, NetworkInfo } from '@/types';

// Production mode - always use AWS services
console.log('API Environment:', {
  bucket: S3_BUCKET,
  table: TABLES.SUBMISSIONS,
  region: process.env.AWS_REGION || 'us-east-1'
});

export const config = {
  api: {
    bodyParser: false,
  },
};



export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  let submissionId: string = '';
  
  try {
    // Extract client IP for rate limiting and fraud detection
    const clientIP = extractIpAddress(req);

    // Check rate limiting
    if (!checkUploadRateLimit(clientIP, 5, 60000)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Please wait before submitting again.',
      });
    }

    // CSRF protection - check for custom header
    if (!req.headers['x-health-form'] || req.headers['x-health-form'] !== 'submission') {
      console.warn(`Potential CSRF attempt from ${clientIP} - missing custom header`);
      return res.status(403).json({
        success: false,
        error: 'Invalid request',
        message: 'Request validation failed.',
      });
    }

    // Parse multipart form data
    const form = formidable({
      uploadDir: tmpdir(),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      maxFields: 20,
      multiples: false,
    });

    const [fields, files] = await form.parse(req);

    // Extract device info safely
    const userAgent = req.headers['user-agent'] || '';
    const clientDeviceInfo: DeviceInfo = {
      userAgent,
      ...parseUserAgent(userAgent),
    };

    // Extract form data with validation
    const formData = {
      firstName: Array.isArray(fields.firstName) ? fields.firstName[0] : fields.firstName || '',
      lastName: Array.isArray(fields.lastName) ? fields.lastName[0] : fields.lastName || '',
      dateOfBirth: Array.isArray(fields.dateOfBirth) ? fields.dateOfBirth[0] : fields.dateOfBirth || '',
      churchId: Array.isArray(fields.churchId) ? fields.churchId[0] : fields.churchId || '',
      familyHistoryDiabetes: (Array.isArray(fields.familyHistoryDiabetes) ? fields.familyHistoryDiabetes[0] : fields.familyHistoryDiabetes) === 'true',
      familyHistoryHighBP: (Array.isArray(fields.familyHistoryHighBP) ? fields.familyHistoryHighBP[0] : fields.familyHistoryHighBP) === 'true',
      familyHistoryDementia: (Array.isArray(fields.familyHistoryDementia) ? fields.familyHistoryDementia[0] : fields.familyHistoryDementia) === 'true',
      nerveSymptoms: (Array.isArray(fields.nerveSymptoms) ? fields.nerveSymptoms[0] : fields.nerveSymptoms) === 'true',
      sex: (Array.isArray(fields.sex) ? fields.sex[0] : fields.sex || 'male') as 'male' | 'female',
      cardiovascularHistory: (Array.isArray(fields.cardiovascularHistory) ? fields.cardiovascularHistory[0] : fields.cardiovascularHistory) === 'true',
      chronicKidneyDisease: (Array.isArray(fields.chronicKidneyDisease) ? fields.chronicKidneyDisease[0] : fields.chronicKidneyDisease) === 'true',
      diabetes: (Array.isArray(fields.diabetes) ? fields.diabetes[0] : fields.diabetes) === 'true',
      insuranceType: (Array.isArray(fields.insuranceType) ? fields.insuranceType[0] : fields.insuranceType || 'not-sure') as 'private' | 'government' | 'none' | 'not-sure',
      tcpaConsent: (Array.isArray(fields.tcpaConsent) ? fields.tcpaConsent[0] : fields.tcpaConsent) === 'true',
      phone: Array.isArray(fields.phone) ? fields.phone[0] : fields.phone || '',
      email: Array.isArray(fields.email) ? fields.email[0] : fields.email || '',
    };

    // Validation checks
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'churchId'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Please fill in: ${missingFields.join(', ')}`,
      });
    }

    // Name length validation
    if (formData.firstName.length > 50 || formData.lastName.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Name too long',
        message: 'Names must be 50 characters or less.',
      });
    }

    // TCPA consent validation
    if (!formData.tcpaConsent) {
      return res.status(400).json({
        success: false,
        error: 'Consent required',
        message: 'You must agree to receive communications.',
      });
    }

    // File validation
    const selfieFile = Array.isArray(files.selfie) ? files.selfie[0] : files.selfie;
    if (!selfieFile) {
      return res.status(400).json({
        success: false,
        error: 'Photo required',
        message: 'Please upload a selfie photo.',
      });
    }

    const fileValidation = validateUploadedFile(
      selfieFile.filepath,
      selfieFile.originalFilename || 'unknown',
      selfieFile.mimetype || 'application/octet-stream',
      SELFIE_VALIDATION_OPTIONS
    );
    if (!fileValidation.isValid) {
      try {
        fs.unlinkSync(selfieFile.filepath);
      } catch (error) {
        console.warn('Failed to clean up rejected file:', error);
      }
      
      return res.status(400).json({
        success: false,
        error: 'Invalid file',
        message: fileValidation.error || 'Please upload a valid image file.',
      });
    }

    // File processing
    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(selfieFile.filepath);
    } catch (error) {
      console.error('Failed to read uploaded file:', error);
      return res.status(500).json({
        success: false,
        error: 'File processing failed',
        message: 'Unable to process uploaded file.',
      });
    }

    // Generate unique identifiers
    submissionId = uuidv4();
    const timestamp = new Date().toISOString();
    const s3Key = `submissions/${submissionId}/${Date.now()}-${selfieFile.originalFilename || 'photo.jpg'}`;

    let selfieUrl = '';

    // Upload photo to S3 with enhanced security
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: fileValidation.detectedMimeType || 'image/jpeg',
        ContentDisposition: 'inline',
        ContentEncoding: undefined,
        Metadata: {
          submissionId,
          churchId: formData.churchId,
          uploadDate: timestamp,
          originalSize: fileBuffer.length.toString(),
          clientIP: clientIP.substring(0, 12),
        },
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD_IA',
      }));
      selfieUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`;
    } catch (error) {
      console.error('S3 upload failed:', error);
      try {
        fs.unlinkSync(selfieFile.filepath);
      } catch (cleanupError) {
        console.warn('Failed to clean up file after S3 error:', cleanupError);
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to store uploaded file',
      });
    }

    // Capture device and network information
    const networkInfo: NetworkInfo = extractNetworkInfo(req);

    // Fraud detection
    const fraudIndicators: string[] = [];
    if (fraudIndicators.length > 0) {
      console.warn(`Fraud indicators detected for submission ${submissionId}:`, fraudIndicators);
    }

    // AI analysis
    let aiAnalysis = null;
    let healthRisk = null;
    
    try {
      aiAnalysis = await aryaAI.analyzeSelfie(fileBuffer, fileValidation.detectedMimeType || 'image/jpeg');
      
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
      sex: formData.sex,
      cardiovascularHistory: formData.cardiovascularHistory,
      chronicKidneyDisease: formData.chronicKidneyDisease,
      diabetes: formData.diabetes,
      insuranceType: formData.insuranceType,
      
      // Contact information
      tcpaConsent: formData.tcpaConsent,
      phone: formData.phone,
      email: formData.email,
      
      // AI analysis results
      estimatedBMI: aiAnalysis?.bmi?.value || undefined,
      bmiCategory: aiAnalysis?.bmi?.category || undefined,
      estimatedAge: aiAnalysis?.age?.estimated || undefined,
      estimatedGender: aiAnalysis?.gender?.predicted || undefined,
      healthRiskLevel: healthRisk?.riskLevel || undefined,
      healthRiskScore: healthRisk?.riskScore || undefined,
      recommendations: healthRisk?.recommendations || [],
      
      // Follow-up status
      followUpStatus: 'Pending',
      
      // Tracking information
      deviceInfo: clientDeviceInfo,
      networkInfo,
      submissionFingerprint: generateSubmissionFingerprint(clientDeviceInfo, networkInfo, formData as unknown as Record<string, unknown>),
      sessionId: uuidv4(),
    };

    // Save to DynamoDB with error handling
    try {
      await docClient.send(new PutCommand({
        TableName: TABLES.SUBMISSIONS,
        Item: submission,
        ConditionExpression: 'attribute_not_exists(id)',
      }));
    } catch (error) {
      console.error('DynamoDB save failed:', error);
      
      // Clean up S3 file if database save fails
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
        }));
      } catch (s3Error) {
        console.error('Failed to clean up S3 file after DB error:', s3Error);
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to save submission data',
      });
    }

    // Clean up temporary file
    try {
      fs.unlinkSync(selfieFile.filepath);
    } catch (error) {
      console.warn('Failed to clean up temporary file:', error);
    }

    // Send welcome SMS if enabled and user consented
    if (formData.tcpaConsent && formData.phone) {
      try {
        const smsService = new SMSService();
        const smsResult = await smsService.sendWelcomeSMS(formData.phone, formData.firstName);
        
        if (smsResult.success) {
          // SMS sent successfully
        } else {
          console.warn('Failed to send welcome SMS:', smsResult.error);
        }
      } catch (error) {
        console.error('SMS service error:', error);
      }
    }

    // Return success response
    return res.status(201).json({
      success: true,
      data: {
        submissionId,
        message: 'Health screening submitted successfully!',
        estimatedBMI: submission.estimatedBMI,
        healthRiskLevel: submission.healthRiskLevel,
        recommendations: submission.recommendations,
      },
      message: 'Thank you for your submission. We will be in touch soon.',
    });

  } catch (error) {
    console.error('=== SUBMISSION API ERROR ===');
    console.error('Submission API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while processing your submission. Please try again.',
    });
  }
} 