import { NextApiRequest, NextApiResponse } from 'next';
import { smsService } from '../../../lib/sms-service';
import { verifyAuth } from '../../../lib/auth';

interface SendSMSRequest {
  phoneNumber: string;
  message: string;
  firstName?: string;
  messageType?: 'welcome' | 'followup' | 'custom';
}

interface SendSMSResponse {
  success: boolean;
  data?: {
    messageId?: string;
    status: string;
  };
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendSMSResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Verify admin authentication
  if (!verifyAuth(req)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Admin access required',
    });
  }

  try {
    const { phoneNumber, message, firstName, messageType }: SendSMSRequest = req.body;

    // Validate input
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    // Check if SMS service is enabled
    if (!smsService.isEnabled()) {
      return res.status(400).json({
        success: false,
        error: 'SMS service is not enabled. Please configure APP_SNS_ENABLED=true in environment variables.',
      });
    }

    let result;

    // Send different types of SMS based on messageType
    switch (messageType) {
      case 'welcome':
        if (!firstName) {
          return res.status(400).json({
            success: false,
            error: 'First name is required for welcome messages',
          });
        }
        result = await smsService.sendWelcomeSMS(phoneNumber, firstName);
        break;
      
      case 'followup':
        if (!firstName) {
          return res.status(400).json({
            success: false,
            error: 'First name is required for follow-up messages',
          });
        }
        result = await smsService.sendFollowUpSMS(phoneNumber, firstName);
        break;
      
      case 'custom':
      default:
        if (!message) {
          return res.status(400).json({
            success: false,
            error: 'Message content is required for custom messages',
          });
        }
        result = await smsService.sendSMS({
          phoneNumber,
          message,
        });
        break;
    }

    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          messageId: result.messageId,
          status: 'sent',
        },
        message: 'SMS sent successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to send SMS',
      });
    }
  } catch (error) {
    console.error('SMS send endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
} 