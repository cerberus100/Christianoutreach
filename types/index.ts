export interface DeviceInfo {
  userAgent: string;
  browser?: {
    name: string;
    version: string;
  };
  os?: {
    name: string;
    version: string;
  };
  device?: {
    type: string; // mobile, tablet, desktop
    brand?: string;
    model?: string;
  };
  screen?: {
    width: number;
    height: number;
  };
  timezone?: string;
  language?: string;
  platform?: string;
  cookiesEnabled?: boolean;
  javaEnabled?: boolean;
}

export interface NetworkInfo {
  ipAddress: string;
  ipType: 'IPv4' | 'IPv6';
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  userAgent: string;
  referrer?: string;
  forwardedFor?: string; // For proxy/load balancer tracking
  connectionType?: string; // e.g., 'wifi', 'cellular', 'ethernet'
  requestHeaders?: Record<string, string>;
}

export interface HealthSubmission {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  selfieUrl: string;
  churchId: string;
  submissionDate: string;
  
  // Health screening responses
  familyHistoryDiabetes: boolean;
  familyHistoryHighBP: boolean;
  familyHistoryDementia: boolean;
  nerveSymptoms: boolean;
  
  // TCPA Consent
  tcpaConsent: boolean;
  
  // AI Analysis results
  estimatedBMI?: number;
  bmiCategory?: string;
  estimatedAge?: number;
  estimatedGender?: string;
  healthRiskLevel?: 'Low' | 'Moderate' | 'High' | 'Very High';
  healthRiskScore?: number;
  recommendations?: string[];
  
  // Contact information (required phone, optional email)
  phone: string;
  email?: string;
  
  // Follow-up tracking
  followUpStatus?: 'Pending' | 'Contacted' | 'Scheduled' | 'Completed';
  followUpNotes?: string;
  followUpDate?: string;
  
  // Device and Network Tracking
  deviceInfo?: DeviceInfo;
  networkInfo?: NetworkInfo;
  submissionFingerprint?: string; // Unique submission identifier
  sessionId?: string;
}

export interface OutreachLocation {
  id: string;
  name: string;
  address: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  qrCode: string;
  createdDate: string;
  isActive: boolean;
  
  // Custom form settings
  customFields?: CustomField[];
  brandingColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo?: string;
  
  // Statistics
  totalSubmissions?: number;
  recentSubmissions?: number;
  conversionRate?: number;
}

export interface CustomField {
  id: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date';
  label: string;
  required: boolean;
  options?: string[]; // for select fields
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  hashedPassword: string;
  role: 'admin' | 'viewer';
  firstName: string;
  lastName: string;
  createdDate: string;
  lastLogin?: string;
  isActive: boolean;
  permissions: {
    canViewSubmissions: boolean;
    canExportData: boolean;
    canManageChurches: boolean;
    canManageUsers: boolean;
    canViewAnalytics: boolean;
  };
}

export interface DashboardStats {
  totalSubmissions: number;
  todaySubmissions: number;
  weekSubmissions: number;
  monthSubmissions: number;
  totalOutreachLocations: number;
  averageRiskScore: number;
  conversionRate: number;
  
  // Risk distribution
  riskDistribution: {
    low: number;
    moderate: number;
    high: number;
    veryHigh: number;
  };
  
  // Demographics
  ageDistribution: {
    range: string;
    count: number;
  }[];
  
  genderDistribution: {
    male: number;
    female: number;
    unknown: number;
  };
  
  // BMI distribution
  bmiDistribution: {
    underweight: number;
    normal: number;
    overweight: number;
    obese: number;
  };
  
  // Top performing locations
  topLocations: {
    name: string;
    submissions: number;
    riskScore: number;
  }[];
  
  // Recent activity
  recentSubmissions: HealthSubmission[];
}

export interface FormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  selfie: File | null;
  
  // Health questions
  familyHistoryDiabetes: boolean;
  familyHistoryHighBP: boolean;
  familyHistoryDementia: boolean;
  nerveSymptoms: boolean;
  
  // TCPA Consent
  tcpaConsent: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ExportOptions {
  format: 'csv' | 'excel';
  dateRange: {
    start: string;
    end: string;
  };
  includeFields: string[];
  filterBy?: {
    churchId?: string;
    riskLevel?: string;
    followUpStatus?: string;
  };
} 