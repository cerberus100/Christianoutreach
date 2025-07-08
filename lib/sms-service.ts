import { PublishCommand, SetSMSAttributesCommand } from '@aws-sdk/client-sns';
import { snsClient } from './aws-config';

export interface SMSMessage {
  phoneNumber: string;
  message: string;
  senderId?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  private senderId: string;
  private enabled: boolean;

  constructor() {
    this.senderId = process.env.APP_SNS_SENDER_ID || 'HealthCheck';
    this.enabled = process.env.APP_SNS_ENABLED === 'true';
  }

  /**
   * Send SMS message using AWS SNS
   */
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    if (!this.enabled) {
      console.log('SMS service is disabled');
      return { success: false, error: 'SMS service is disabled' };
    }

    try {
      // Validate phone number format
      const phoneNumber = this.formatPhoneNumber(message.phoneNumber);
      if (!phoneNumber) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Set SMS attributes for better delivery
      await this.setSMSAttributes();

      // Send SMS
      const publishCommand = new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: message.message,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: message.senderId || this.senderId,
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      });

      const result = await snsClient.send(publishCommand);
      
      console.log('SMS sent successfully:', result.MessageId);
      
      return {
        success: true,
        messageId: result.MessageId,
      };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send test SMS
   */
  async sendTestSMS(phoneNumber: string): Promise<SMSResult> {
    const message = 'Test message from your health screening system. Reply STOP to opt out.';
    
    return this.sendSMS({
      phoneNumber,
      message,
    });
  }

  /**
   * Send welcome SMS after form submission
   */
  async sendWelcomeSMS(phoneNumber: string, firstName: string): Promise<SMSResult> {
    const message = `Hi ${firstName}! Thank you for completing your health screening. We'll be in touch with your results and next steps. Reply STOP to opt out.`;
    
    return this.sendSMS({
      phoneNumber,
      message,
    });
  }

  /**
   * Send follow-up reminder SMS
   */
  async sendFollowUpSMS(phoneNumber: string, firstName: string): Promise<SMSResult> {
    const message = `Hi ${firstName}! This is a friendly reminder about your health screening follow-up. Please contact us to schedule your next appointment. Reply STOP to opt out.`;
    
    return this.sendSMS({
      phoneNumber,
      message,
    });
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phoneNumber: string): string | null {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Handle US phone numbers
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // Handle international numbers with country code
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // Handle other international numbers
    if (digits.length > 11) {
      return `+${digits}`;
    }
    
    return null;
  }

  /**
   * Set SMS attributes for better delivery
   */
  private async setSMSAttributes(): Promise<void> {
    try {
      const setAttributesCommand = new SetSMSAttributesCommand({
        attributes: {
          DefaultSMSType: 'Transactional',
          DefaultSenderID: this.senderId,
        },
      });

      await snsClient.send(setAttributesCommand);
    } catch (error) {
      console.warn('Failed to set SMS attributes:', error);
      // Don't fail the entire SMS sending process for this
    }
  }

  /**
   * Check if SMS service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const smsService = new SMSService(); 