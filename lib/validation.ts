import { z } from 'zod';

// Phone number validation (US format)
const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

// Email validation
const emailSchema = z.string().email('Invalid email format');

// Phone validation
const phoneSchema = z.string()
  .regex(phoneRegex, 'Invalid phone number format')
  .or(z.string().length(0)); // Allow empty phone numbers

// Common string validation
const requiredString = z.string().min(1, 'This field is required');

// Date validation
const dateSchema = z.string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in MM/DD/YYYY format')
  .refine((date) => {
    const [month, day, year] = date.split('/').map(Number);
    const parsedDate = new Date(year, month - 1, day);
    return parsedDate.getFullYear() === year &&
           parsedDate.getMonth() === month - 1 &&
           parsedDate.getDate() === day;
  }, 'Invalid date');

// URL validation for S3 photo URLs
const photoUrlSchema = z.string().url('Invalid photo URL format').optional();

// Enum validations
const insuranceTypeSchema = z.enum([
  'private',
  'medicare',
  'medicaid',
  'self-pay',
  'other'
]);

const healthRiskLevelSchema = z.enum([
  'Low',
  'Medium',
  'High',
  'Critical'
]);

const followUpStatusSchema = z.enum([
  'Pending',
  'Contacted',
  'Scheduled',
  'Completed',
  'No Response'
]);

const sexSchema = z.enum([
  'male',
  'female',
  'other'
]);

// Device info validation
const deviceInfoSchema = z.object({
  userAgent: z.string(),
  device: z.object({
    type: z.string()
  }),
  browser: z.object({
    name: z.string(),
    version: z.string()
  }),
  os: z.object({
    name: z.string(),
    version: z.string()
  }),
  screen: z.object({
    width: z.number(),
    height: z.number()
  }),
  timezone: z.string(),
  language: z.string()
});

// Network info validation
const networkInfoSchema = z.object({
  ipAddress: z.string(),
  ipType: z.enum(['IPv4', 'IPv6']),
  userAgent: z.string()
});

// Submission validation schema
export const healthSubmissionSchema = z.object({
  id: z.string().optional(),
  firstName: requiredString.min(2, 'First name must be at least 2 characters'),
  lastName: requiredString.min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: dateSchema,
  selfieUrl: photoUrlSchema,
  churchId: requiredString,
  submissionDate: z.string().datetime().optional(),
  familyHistoryDiabetes: z.boolean(),
  familyHistoryHighBP: z.boolean(),
  familyHistoryDementia: z.boolean(),
  nerveSymptoms: z.boolean(),
  sex: sexSchema,
  cardiovascularHistory: z.boolean(),
  chronicKidneyDisease: z.boolean(),
  diabetes: z.boolean(),
  insuranceType: insuranceTypeSchema,
  tcpaConsent: z.boolean(),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.string().length(0)),
  estimatedBMI: z.number().min(10).max(60).optional(),
  bmiCategory: z.string().optional(),
  estimatedAge: z.number().min(18).max(120).optional(),
  estimatedGender: z.string().optional(),
  healthRiskLevel: healthRiskLevelSchema.optional(),
  healthRiskScore: z.number().min(0).max(100).optional(),
  recommendations: z.array(z.string()).optional(),
  followUpStatus: followUpStatusSchema.optional(),
  followUpNotes: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
  deviceInfo: deviceInfoSchema.optional(),
  networkInfo: networkInfoSchema.optional(),
  submissionFingerprint: z.string().optional(),
  sessionId: z.string().optional()
});

// Location validation schema
export const outreachLocationSchema = z.object({
  id: z.string().optional(),
  name: requiredString.min(2, 'Location name must be at least 2 characters'),
  address: requiredString.min(10, 'Address must be at least 10 characters'),
  contactPerson: requiredString.min(2, 'Contact person name must be at least 2 characters'),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  qrCode: z.string().optional(),
  createdDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  totalSubmissions: z.number().default(0),
  recentSubmissions: z.number().default(0),
  conversionRate: z.number().min(0).max(1).default(0)
});

// Login validation schema
export const loginSchema = z.object({
  email: emailSchema,
  password: requiredString.min(6, 'Password must be at least 6 characters')
});

// Follow-up update validation schema
export const followUpUpdateSchema = z.object({
  followUpStatus: followUpStatusSchema,
  followUpNotes: z.string().optional(),
  followUpDate: z.string().datetime().optional()
});

// Export options validation schema
export const exportOptionsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  churchId: z.string().optional(),
  riskLevel: healthRiskLevelSchema.optional(),
  followUpStatus: followUpStatusSchema.optional(),
  includePhotos: z.boolean().default(false),
  format: z.enum(['csv', 'json']).default('csv')
});

// SMS request validation schema
export const smsRequestSchema = z.object({
  phoneNumber: phoneSchema,
  message: requiredString.min(1).max(160, 'SMS message cannot exceed 160 characters'),
  firstName: z.string().optional(),
  messageType: z.enum(['welcome', 'followup', 'custom']).default('custom')
});

// Test SMS validation schema
export const testSmsSchema = z.object({
  phoneNumber: phoneSchema
});

// Type exports for use in API handlers
export type HealthSubmissionInput = z.infer<typeof healthSubmissionSchema>;
export type OutreachLocationInput = z.infer<typeof outreachLocationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type FollowUpUpdateInput = z.infer<typeof followUpUpdateSchema>;
export type ExportOptionsInput = z.infer<typeof exportOptionsSchema>;
export type SmsRequestInput = z.infer<typeof smsRequestSchema>;
export type TestSmsInput = z.infer<typeof testSmsSchema>;

/**
 * Validation helper functions
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: (error as z.ZodError).issues.map((err: any) => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return { success: false, errors: ['Invalid data format'] };
  }
}

/**
 * Safe validation that logs errors but doesn't throw
 */
export function validateSafely<T>(schema: z.ZodSchema<T>, data: unknown, context: string): T | null {
  const validation = validateData(schema, data);

  if (!validation.success) {
    console.error(`Validation failed for ${context}:`, validation.errors);
    return null;
  }

  return validation.data;
}
