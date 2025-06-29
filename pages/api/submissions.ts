import { NextApiRequest, NextApiResponse } from 'next';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import fs from 'fs';
import { docClient, s3Client, TABLES, S3_BUCKET } from '@/lib/aws-config';
import { aryaAI } from '@/lib/arya-ai';
import { 
  validateUploadedFile, 
  SELFIE_VALIDATION_OPTIONS, 
  checkUploadRateLimit,
  cleanupRateLimitEntries 
} from '@/lib/file-validation';
import { 
  extractNetworkInfo, 
  parseUserAgent, 
  generateSubmissionFingerprint,
  detectFraudIndicators 
} from '@/lib/device-tracker';
import { HealthSubmission, ApiResponse, DeviceInfo, NetworkInfo } from '@/types';

// Development mode check
const isDevelopment = process.env.NODE_ENV === 'development';
const hasAWSCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

console.log('API Environment:', {
  isDevelopment,
  hasAWSCredentials,
  bucket: S3_BUCKET,
  table: TABLES.SUBMISSIONS,
  region: process.env.AWS_REGION || 'us-east-1'
});

export const config = {
  api: {
    bodyParser: false,
    // Increase timeout for file processing
    externalResolver: true,
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
  console.log('=== API SUBMISSION REQUEST ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  
  if (req.method !== 'POST') {
    console.log('Invalid method, returning 405');
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    console.log('Starting form processing...');
    
    // Extract client IP for rate limiting and security
    const clientIP = req.headers['x-forwarded-for']?.toString().split(',')[0] || 
                    req.headers['x-real-ip']?.toString() || 
                    req.socket.remoteAddress || 
                    'unknown';

    console.log('Client IP:', clientIP);

    // Rate limiting check
    if (!checkUploadRateLimit(clientIP, 5, 60000)) {
      console.log('Rate limit exceeded for IP:', clientIP);
      return res.status(429).json({
        success: false,
        error: 'Too many upload attempts. Please wait before trying again.',
      });
    }

    // Basic CSRF protection - check for custom header
    const customHeader = req.headers['x-requested-with'];
    if (customHeader !== 'XMLHttpRequest') {
      console.warn(`Potential CSRF attempt from ${clientIP} - missing custom header`);
    }

    // Clean up old rate limit entries periodically (1% chance per request)
    if (Math.random() < 0.01) {
      cleanupRateLimitEntries();
    }

    console.log('Parsing form data...');
    
    // Parse form data including file upload with secure settings
    const form = formidable({
      maxFileSize: SELFIE_VALIDATION_OPTIONS.maxSizeBytes, // 5MB limit
      keepExtensions: false, // We'll generate our own secure extensions
      allowEmptyFiles: false,
      maxFields: 20, // Limit number of fields
      maxFieldsSize: 1024 * 1024, // 1MB limit for text fields
    });

    const [fields, files] = await form.parse(req);
    
    console.log('Form parsed successfully');
    console.log('Fields:', Object.keys(fields));
    console.log('Files:', Object.keys(files));
    console.log('File details:', files.selfie ? {
      size: Array.isArray(files.selfie) ? files.selfie[0]?.size : (files.selfie as any)?.size,
      mimetype: Array.isArray(files.selfie) ? files.selfie[0]?.mimetype : (files.selfie as any)?.mimetype,
      originalFilename: Array.isArray(files.selfie) ? files.selfie[0]?.originalFilename : (files.selfie as any)?.originalFilename
    } : 'No file');
    
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
    
    // Extract and validate form data
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

    console.log('Extracted form data:', {
      ...formData,
      phone: formData.phone ? '[REDACTED]' : 'MISSING',
      email: formData.email ? '[REDACTED]' : 'MISSING'
    });

    // Validate required fields with enhanced security
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.churchId || !formData.phone) {
      console.log('Missing required fields:', {
        firstName: !!formData.firstName,
        lastName: !!formData.lastName,
        dateOfBirth: !!formData.dateOfBirth,
        churchId: !!formData.churchId,
        phone: !!formData.phone
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields (firstName, lastName, dateOfBirth, churchId, phone)',
      });
    }

    // Validate field lengths to prevent DoS
    if (formData.firstName.length > 100 || formData.lastName.length > 100) {
      console.log('Name fields too long');
      return res.status(400).json({
        success: false,
        error: 'Name fields too long',
      });
    }

    // Validate TCPA consent
    if (!formData.tcpaConsent) {
      console.log('TCPA consent missing:', formData.tcpaConsent);
      return res.status(400).json({
        success: false,
        error: 'TCPA consent is required',
      });
    }

    console.log('Form validation passed');

    // Handle selfie upload with comprehensive validation
    const selfieFile = Array.isArray(files.selfie) ? files.selfie[0] : files.selfie;
    if (!selfieFile) {
      console.log('No selfie file found in upload');
      return res.status(400).json({
        success: false,
        error: 'Selfie photo is required',
      });
    }

    console.log('Validating uploaded file...');
    
    // Comprehensive file validation
    const fileValidation = validateUploadedFile(
      selfieFile.filepath,
      selfieFile.originalFilename || 'unknown',
      selfieFile.mimetype || 'application/octet-stream',
      SELFIE_VALIDATION_OPTIONS
    );

    if (!fileValidation.isValid) {
      console.log('File validation failed:', fileValidation.error);
      // Clean up the rejected file
      try {
        fs.unlinkSync(selfieFile.filepath);
      } catch (error) {
        console.warn('Failed to clean up rejected file:', error);
      }
      
      return res.status(400).json({
        success: false,
        error: `File validation failed: ${fileValidation.error}`,
      });
    }

    console.log('File validation passed, proceeding with upload...');

    const submissionId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Read file with error handling
    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(selfieFile.filepath);
      console.log('File read successfully, size:', fileBuffer.length);
    } catch (error) {
      console.error('Failed to read uploaded file:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process uploaded file',
      });
    }

    // Use secure filename from validation
    const secureFilename = fileValidation.sanitizedFilename!;
    const s3Key = `submissions/${submissionId}/${secureFilename}`;
    
    let selfieUrl: string;
    
    console.log('Uploading to S3...');
    console.log('S3 Bucket:', S3_BUCKET);
    console.log('S3 Key:', s3Key);
    
    // Upload photo to S3 with enhanced security
    if (!hasAWSCredentials && isDevelopment) {
      // Development mode: simulate S3 upload
      console.log('Development mode: Simulating S3 upload (no real AWS credentials)');
      selfieUrl = `https://development-mock-bucket.s3.amazonaws.com/${s3Key}`;
    } else {
      // Production mode: real S3 upload
      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: fileValidation.detectedMimeType || 'image/jpeg',
          ContentDisposition: 'inline', // Prevent downloads as executable
          ContentEncoding: undefined, // Prevent encoding tricks
          Metadata: {
            submissionId,
            churchId: formData.churchId,
            uploadDate: timestamp,
            originalSize: fileBuffer.length.toString(),
            clientIP: clientIP.substring(0, 12), // Partial IP for privacy
          },
          ServerSideEncryption: 'AES256', // Encrypt at rest
          StorageClass: 'STANDARD_IA', // Cost optimization
        }));
        console.log('S3 upload successful');
        selfieUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`;
      } catch (error) {
        console.error('S3 upload failed:', error);
        // Clean up local file
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
    }

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

    console.log('Starting AI analysis...');
    
    // Analyze photo with Arya.ai
    let aiAnalysis = null;
    let healthRisk = null;
    
    if (!hasAWSCredentials && isDevelopment) {
      // Development mode: mock AI analysis
      console.log('Development mode: Simulating AI analysis');
      aiAnalysis = {
        success: true,
        bmi: { value: 25.5, category: 'Normal' },
        age: { estimated: 35 },
        gender: { predicted: 'Unknown' }
      };
      healthRisk = {
        riskLevel: 'Moderate' as const,
        riskScore: 65,
        recommendations: ['Regular exercise', 'Healthy diet', 'Regular checkups']
      };
    } else {
      // Production mode: real AI analysis
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
        console.log('AI analysis completed');
      } catch (error) {
        console.error('AI Analysis error:', error);
        // Continue without AI analysis if it fails
      }
    }

    console.log('Saving to DynamoDB...');

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

    // Save to DynamoDB with error handling
    if (!hasAWSCredentials && isDevelopment) {
      // Development mode: simulate database save
      console.log('Development mode: Simulating DynamoDB save (no real AWS credentials)');
      console.log('Mock submission saved:', {
        id: submissionId,
        name: `${formData.firstName} ${formData.lastName}`,
        church: formData.churchId
      });
    } else {
      // Production mode: real database save
      try {
        await docClient.send(new PutCommand({
          TableName: TABLES.SUBMISSIONS,
          Item: submission,
          ConditionExpression: 'attribute_not_exists(id)', // Prevent overwrites
        }));
        console.log('DynamoDB save successful');
      } catch (error) {
        console.error('DynamoDB save failed:', error);
        
        // Clean up S3 file if database save fails (only in production)
        if (hasAWSCredentials) {
          try {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: S3_BUCKET,
              Key: s3Key,
            }));
          } catch (s3Error) {
            console.error('Failed to clean up S3 file after DB error:', s3Error);
          }
        }
        
        return res.status(500).json({
          success: false,
          error: 'Failed to save submission data',
        });
      }
    }

    // Clean up temporary file
    try {
      fs.unlinkSync(selfieFile.filepath);
      console.log('Temporary file cleaned up');
    } catch (error) {
      console.warn('Failed to clean up temporary file:', error);
    }

    console.log('=== SUBMISSION SUCCESSFUL ===');
    console.log('Submission ID:', submissionId);

    // Return success response
    res.status(201).json({
      success: true,
      data: { id: submissionId },
      message: 'Health screening submitted successfully',
    });

  } catch (error) {
    console.error('=== SUBMISSION API ERROR ===');
    console.error('Submission API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process health screening submission',
    });
  }
} 