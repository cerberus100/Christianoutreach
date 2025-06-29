import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { ApiResponse } from '@/types';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface LocalSubmission {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  churchId: string;
  selfieFileName: string;
  familyHistoryDiabetes: boolean;
  familyHistoryHighBP: boolean;
  familyHistoryDementia: boolean;
  nerveSymptoms: boolean;
  tcpaConsent: boolean;
  submissionDate: string;
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
    console.log('Processing local submission...');
    
    // Create directories
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const dataDir = path.join(process.cwd(), 'data');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Parse form data
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const submissionId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Handle photo upload
    const selfieFile = Array.isArray(files.selfie) ? files.selfie[0] : files.selfie;
    if (!selfieFile) {
      return res.status(400).json({
        success: false,
        error: 'Photo is required',
      });
    }

    // Save photo locally
    const fileName = `${submissionId}-${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);
    
    const fileBuffer = fs.readFileSync(selfieFile.filepath);
    fs.writeFileSync(filePath, fileBuffer);
    
    // Clean up temp file
    fs.unlinkSync(selfieFile.filepath);

    // Extract form data
    const submission: LocalSubmission = {
      id: submissionId,
      firstName: Array.isArray(fields.firstName) ? fields.firstName[0] : fields.firstName || '',
      lastName: Array.isArray(fields.lastName) ? fields.lastName[0] : fields.lastName || '',
      dateOfBirth: Array.isArray(fields.dateOfBirth) ? fields.dateOfBirth[0] : fields.dateOfBirth || '',
      phone: Array.isArray(fields.phone) ? fields.phone[0] : fields.phone || '',
      email: Array.isArray(fields.email) ? fields.email[0] : fields.email,
      churchId: Array.isArray(fields.churchId) ? fields.churchId[0] : fields.churchId || '',
      selfieFileName: fileName,
      familyHistoryDiabetes: (Array.isArray(fields.familyHistoryDiabetes) ? fields.familyHistoryDiabetes[0] : fields.familyHistoryDiabetes) === 'true',
      familyHistoryHighBP: (Array.isArray(fields.familyHistoryHighBP) ? fields.familyHistoryHighBP[0] : fields.familyHistoryHighBP) === 'true',
      familyHistoryDementia: (Array.isArray(fields.familyHistoryDementia) ? fields.familyHistoryDementia[0] : fields.familyHistoryDementia) === 'true',
      nerveSymptoms: (Array.isArray(fields.nerveSymptoms) ? fields.nerveSymptoms[0] : fields.nerveSymptoms) === 'true',
      tcpaConsent: (Array.isArray(fields.tcpaConsent) ? fields.tcpaConsent[0] : fields.tcpaConsent) === 'true',
      submissionDate: timestamp,
    };

    // Save data to JSON file
    const dataFile = path.join(dataDir, 'submissions.json');
    let submissions: LocalSubmission[] = [];
    
    if (fs.existsSync(dataFile)) {
      const existingData = fs.readFileSync(dataFile, 'utf8');
      submissions = JSON.parse(existingData);
    }
    
    submissions.push(submission);
    fs.writeFileSync(dataFile, JSON.stringify(submissions, null, 2));

    console.log('Local submission saved:', submissionId);

    res.status(201).json({
      success: true,
      data: { id: submissionId },
      message: 'Health screening submitted successfully (local storage)',
    });

  } catch (error) {
    console.error('Local submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save submission locally',
    });
  }
} 