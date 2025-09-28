import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { stringify } from 'csv-stringify/sync';
import { requireAdmin } from '@/lib/auth';
import { fetchAllSubmissions } from '@/lib/submissions-service';
import { HealthSubmission, SubmissionFollowUpStatus, SubmissionsQueryParams } from '@/types';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '@/lib/aws-config';

const exportRequestSchema = z.object({
  format: z.literal('csv').default('csv'),
  filters: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      churchIds: z.array(z.string()).optional(),
      riskLevels: z.array(z.string()).optional(),
      followUpStatuses: z.array(z.string()).optional(),
    })
    .optional(),
});

function formatBoolean(value: boolean | undefined): string {
  if (value === undefined || value === null) return '';
  return value ? 'Yes' : 'No';
}

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

  try {
    requireAdmin(req);
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  const parseResult = exportRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid export request payload',
    });
  }

  const { format, filters } = parseResult.data;
  if (format !== 'csv') {
    return res.status(400).json({
      success: false,
      error: 'Only CSV export is currently supported',
    });
  }

  try {
    const submissions: HealthSubmission[] = [];
    const baseFilters: SubmissionsQueryParams = {
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      riskLevels: filters?.riskLevels,
      followUpStatuses: filters?.followUpStatuses as SubmissionFollowUpStatus[] | undefined,
    };

    if (filters?.churchIds && filters.churchIds.length > 0) {
      for (const churchId of filters.churchIds) {
        const chunk = await fetchAllSubmissions({
          ...baseFilters,
          churchId,
        });
        submissions.push(...chunk);
      }
    } else {
      const chunk = await fetchAllSubmissions(baseFilters);
      submissions.push(...chunk);
    }

    const locationsResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.CHURCHES,
        ProjectionExpression: '#id, #name',
        ExpressionAttributeNames: {
          '#id': 'id',
          '#name': 'name',
        },
      })
    );

    const locationMap = new Map<string, string>();
    locationsResult.Items?.forEach((location: any) => {
      if (location.id && location.name) {
        locationMap.set(location.id, location.name);
      }
    });

    const exportRows = submissions
      .sort(
        (a, b) =>
          new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
      )
      .map((submission) => ({
        id: submission.id,
        firstName: submission.firstName,
        lastName: submission.lastName,
        dateOfBirth: submission.dateOfBirth,
        phone: submission.phone || '',
        email: submission.email || '',
        churchId: submission.churchId,
        churchName: locationMap.get(submission.churchId) || submission.churchId,
        submissionDate: submission.submissionDate,
        familyHistoryDiabetes: formatBoolean(submission.familyHistoryDiabetes),
        familyHistoryHighBP: formatBoolean(submission.familyHistoryHighBP),
        familyHistoryDementia: formatBoolean(submission.familyHistoryDementia),
        familyHistoryAsthma: formatBoolean(submission.familyHistoryAsthma),
        eczemaHistory: formatBoolean(submission.eczemaHistory),
        nerveSymptoms: formatBoolean(submission.nerveSymptoms),
        sex: submission.sex || '',
        cardiovascularHistory: formatBoolean(submission.cardiovascularHistory),
        chronicKidneyDisease: formatBoolean(submission.chronicKidneyDisease),
        diabetes: formatBoolean(submission.diabetes),
        insuranceType: submission.insuranceType || '',
        insuranceId: submission.insuranceId || '',
        estimatedBMI: submission.estimatedBMI?.toString() || '',
        bmiCategory: submission.bmiCategory || '',
        estimatedAge: submission.estimatedAge?.toString() || '',
        estimatedGender: submission.estimatedGender || '',
        healthRiskLevel: submission.healthRiskLevel || '',
        healthRiskScore: submission.healthRiskScore?.toString() || '',
        followUpStatus: submission.followUpStatus || '',
        tcpaConsent: formatBoolean(submission.tcpaConsent),
        ipAddress: getNestedValue(submission, 'networkInfo.ipAddress'),
        deviceType: getNestedValue(submission, 'deviceInfo.device.type'),
        browser:
          getNestedValue(submission, 'deviceInfo.browser.name') +
          ' ' +
          getNestedValue(submission, 'deviceInfo.browser.version'),
        operatingSystem:
          getNestedValue(submission, 'deviceInfo.os.name') +
          ' ' +
          getNestedValue(submission, 'deviceInfo.os.version'),
        submissionFingerprint: submission.submissionFingerprint || '',
        timezone: getNestedValue(submission, 'deviceInfo.timezone'),
        screenResolution:
          getNestedValue(submission, 'deviceInfo.screen.width') +
          'x' +
          getNestedValue(submission, 'deviceInfo.screen.height'),
        userAgent: getNestedValue(submission, 'deviceInfo.userAgent'),
        sessionId: submission.sessionId || '',
      }));

    const columns = [
      { key: 'id', header: 'Submission ID' },
      { key: 'firstName', header: 'First Name' },
      { key: 'lastName', header: 'Last Name' },
      { key: 'dateOfBirth', header: 'Date of Birth' },
      { key: 'phone', header: 'Phone Number' },
      { key: 'email', header: 'Email Address' },
      { key: 'churchId', header: 'Church ID' },
      { key: 'churchName', header: 'Church Name' },
      { key: 'submissionDate', header: 'Submission Date' },
      { key: 'familyHistoryDiabetes', header: 'Family History - Diabetes' },
      { key: 'familyHistoryHighBP', header: 'Family History - High BP' },
      { key: 'familyHistoryDementia', header: 'Family History - Dementia' },
      { key: 'familyHistoryAsthma', header: 'Family History - Asthma' },
      { key: 'eczemaHistory', header: 'Eczema History' },
      { key: 'nerveSymptoms', header: 'Nerve Symptoms' },
      { key: 'sex', header: 'Sex' },
      { key: 'cardiovascularHistory', header: 'Cardiovascular History' },
      { key: 'chronicKidneyDisease', header: 'Chronic Kidney Disease' },
      { key: 'diabetes', header: 'Diabetes' },
      { key: 'insuranceType', header: 'Insurance Type' },
      { key: 'insuranceId', header: 'Insurance ID' },
      { key: 'estimatedBMI', header: 'Estimated BMI' },
      { key: 'bmiCategory', header: 'BMI Category' },
      { key: 'estimatedAge', header: 'Estimated Age' },
      { key: 'estimatedGender', header: 'Estimated Gender' },
      { key: 'healthRiskLevel', header: 'Health Risk Level' },
      { key: 'healthRiskScore', header: 'Health Risk Score' },
      { key: 'followUpStatus', header: 'Follow-up Status' },
      { key: 'tcpaConsent', header: 'TCPA Consent' },
      { key: 'ipAddress', header: 'IP Address' },
      { key: 'deviceType', header: 'Device Type' },
      { key: 'browser', header: 'Browser' },
      { key: 'operatingSystem', header: 'Operating System' },
      { key: 'submissionFingerprint', header: 'Submission Fingerprint' },
      { key: 'timezone', header: 'Timezone' },
      { key: 'screenResolution', header: 'Screen Resolution' },
      { key: 'userAgent', header: 'User Agent' },
      { key: 'sessionId', header: 'Session ID' },
    ];

    const fileName = `health-screening-export-${new Date().toISOString()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );

    const csv = stringify(exportRows, { header: true, columns });
    res.send(csv);
  } catch (error) {
    console.error('Export API error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to export data',
      });
    } else {
      res.destroy(error as Error);
    }
  }
} 