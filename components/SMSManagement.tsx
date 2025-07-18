import React, { useState } from 'react';
import { 
  DevicePhoneMobileIcon, 
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface SMSManagementProps {
  submissions: any[];
  onRefresh: () => void;
}

interface SMSHistory {
  id: string;
  phoneNumber: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: Date;
  messageId?: string;
}

export default function SMSManagement({ submissions, onRefresh }: SMSManagementProps) {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [isLoading, setIsLoading] = useState(false);
  const [smsHistory, setSMSHistory] = useState<SMSHistory[]>([]);
  
  // Form state
  const [selectedSubmission, setSelectedSubmission] = useState<string>('');
  const [messageType, setMessageType] = useState<'welcome' | 'followup' | 'custom'>('welcome');
  const [customMessage, setCustomMessage] = useState('');
  const [customPhoneNumber, setCustomPhoneNumber] = useState('');

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let phoneNumber: string;
      let firstName: string;

      if (selectedSubmission) {
        // Send to selected submission
        const submission = submissions.find(s => s.id === selectedSubmission);
        if (!submission) {
          toast.error('Selected submission not found');
          return;
        }
        phoneNumber = submission.phone;
        firstName = submission.firstName;
      } else {
        // Send to custom phone number
        phoneNumber = customPhoneNumber;
        firstName = 'Participant';
      }

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({
          phoneNumber,
          message: messageType === 'custom' ? customMessage : undefined,
          firstName,
          messageType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('SMS sent successfully!');
        
        // Add to history
        const newHistoryItem: SMSHistory = {
          id: Date.now().toString(),
          phoneNumber,
          message: messageType === 'custom' ? customMessage : getMessagePreview(messageType, firstName),
          status: 'sent',
          timestamp: new Date(),
          messageId: result.data?.messageId,
        };
        
        setSMSHistory(prev => [newHistoryItem, ...prev]);
        
        // Reset form
        setSelectedSubmission('');
        setCustomMessage('');
        setCustomPhoneNumber('');
        
        // Refresh submissions if needed
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('SMS send error:', error);
      toast.error('Failed to send SMS');
    } finally {
      setIsLoading(false);
    }
  };

  const testSMSService = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: '+1xxxxxxxxxx', // Production phone number
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('SMS service is working correctly!');
      } else {
        toast.error(result.error || 'SMS service test failed');
      }
    } catch (error) {
      console.error('SMS service test error:', error);
      toast.error('Failed to test SMS service');
    } finally {
      setIsLoading(false);
    }
  };

  const getMessagePreview = (type: string, firstName: string): string => {
    switch (type) {
      case 'welcome':
        return `Hi ${firstName}! Thank you for completing your health screening...`;
      case 'followup':
        return `Hi ${firstName}! This is a friendly reminder about your health screening follow-up...`;
      default:
        return customMessage;
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
    }
    return phone;
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <DevicePhoneMobileIcon className="w-5 h-5 mr-2 text-blue-600" />
              SMS Management
            </h2>
            <button
              onClick={testSMSService}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 flex items-center"
            >
              <InformationCircleIcon className="w-4 h-4 mr-1" />
              Test Service
            </button>
          </div>
        </div>
        
        <div className="flex">
          <button
            onClick={() => setActiveTab('send')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'send'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Send SMS
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            SMS History ({smsHistory.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'send' ? (
          <form onSubmit={handleSendSMS} className="space-y-6">
            {/* Recipient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send To
              </label>
              <div className="space-y-3">
                <div>
                  <select
                    value={selectedSubmission}
                    onChange={(e) => {
                      setSelectedSubmission(e.target.value);
                      setCustomPhoneNumber('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a submission...</option>
                    {submissions.map((submission) => (
                      <option key={submission.id} value={submission.id}>
                        {submission.firstName} {submission.lastName} - {formatPhoneNumber(submission.phone)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">OR</span>
                  <input
                    type="tel"
                    placeholder="Enter custom phone number"
                    value={customPhoneNumber}
                    onChange={(e) => {
                      setCustomPhoneNumber(e.target.value);
                      setSelectedSubmission('');
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Message Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Type
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as 'welcome' | 'followup' | 'custom')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="welcome">Welcome Message</option>
                <option value="followup">Follow-up Reminder</option>
                <option value="custom">Custom Message</option>
              </select>
            </div>

            {/* Custom Message */}
            {messageType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your custom message..."
                  required={messageType === 'custom'}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {customMessage.length}/160 characters
                </p>
              </div>
            )}

            {/* Message Preview */}
            {(selectedSubmission || customPhoneNumber) && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Message Preview:</h4>
                <p className="text-sm text-gray-600 italic">
                  {getMessagePreview(messageType, selectedSubmission ? 
                    submissions.find(s => s.id === selectedSubmission)?.firstName || 'Participant' :
                    'Participant'
                  )}
                </p>
              </div>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || (!selectedSubmission && !customPhoneNumber)}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <PaperAirplaneIcon className="w-5 h-5 mr-2" />
              )}
              {isLoading ? 'Sending...' : 'Send SMS'}
            </button>
          </form>
        ) : (
          // SMS History Tab
          <div className="space-y-4">
            {smsHistory.length === 0 ? (
              <div className="text-center py-8">
                <DevicePhoneMobileIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No SMS messages sent yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {smsHistory.map((sms) => (
                  <div key={sms.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {formatPhoneNumber(sms.phoneNumber)}
                          </span>
                          <span className="ml-2 text-sm text-gray-500">
                            {sms.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{sms.message}</p>
                        {sms.messageId && (
                          <p className="text-xs text-gray-500">Message ID: {sms.messageId}</p>
                        )}
                      </div>
                      <div className="ml-4">
                        {sms.status === 'sent' && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            Sent
                          </span>
                        )}
                        {sms.status === 'failed' && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            <ExclamationCircleIcon className="w-3 h-3 mr-1" />
                            Failed
                          </span>
                        )}
                        {sms.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            <div className="w-3 h-3 border border-yellow-600 border-t-transparent rounded-full animate-spin mr-1" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 