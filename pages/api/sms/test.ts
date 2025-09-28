import { NextApiRequest, NextApiResponse } from 'next';
import { smsService } from '../../../lib/sms-service';
import { requireAdmin } from '../../../lib/auth';
import { validateData, testSmsSchema, TestSmsInput } from '../../../lib/validation';


interface TestSMSResponse {
  success: boolean;
  data?: {
    configValid: boolean;
    messageId?: string;
    status: string;
  };
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestSMSResponse>
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
    // Validate request body using Zod
    const validation = validateData(testSmsSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: `Invalid SMS test request data: ${validation.errors.join(', ')}`,
      });
    }

    const { phoneNumber }: TestSmsInput = validation.data;

    // Check if SMS service is enabled
    if (!smsService.isEnabled()) {
      return res.status(400).json({
        success: false,
        error: 'SMS service is not enabled. Please configure APP_SNS_ENABLED=true in environment variables.',
      });
    }

    // Send test SMS
    const result = await smsService.sendTestSMS(phoneNumber);

    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          configValid: true,
          messageId: result.messageId,
          status: 'sent',
        },
        message: 'Test SMS sent successfully via AWS SNS',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to send SMS',
      });
    }
  } catch (error) {
    console.error('SMS test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
} 