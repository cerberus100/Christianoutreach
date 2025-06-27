import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { DashboardStats, HealthSubmission, ApiResponse } from '@/types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Middleware to verify JWT token
function verifyAuth(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  try {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    return true;
  } catch {
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<DashboardStats>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Verify authentication
  if (!verifyAuth(req)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  try {
    // In a real application, this would query DynamoDB
    // For now, we'll return mock data that represents the structure

    // TODO: Replace with actual DynamoDB queries when database is configured

    // Generate mock data for demonstration
    const now = new Date();
    const mockSubmissions: HealthSubmission[] = [];
    
    // Create sample submissions for the last 30 days
    for (let i = 0; i < 150; i++) {
      const submissionDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const riskScores = [1, 2, 3, 4, 5, 6, 7];
      const riskScore = riskScores[Math.floor(Math.random() * riskScores.length)];
      const bmiValues = [18, 22, 26, 31, 35];
      const bmi = bmiValues[Math.floor(Math.random() * bmiValues.length)];
      
      // Generate mock device and network info
      const deviceTypes = ['mobile', 'tablet', 'desktop'];
      const browsers = [
        { name: 'Chrome', version: '120.0' },
        { name: 'Safari', version: '17.1' },
        { name: 'Firefox', version: '119.0' },
        { name: 'Edge', version: '118.0' }
      ];
      const operatingSystems = [
        { name: 'iOS', version: '17.1' },
        { name: 'Android', version: '14.0' },
        { name: 'Windows', version: '11' },
        { name: 'macOS', version: '14.1' },
        { name: 'Linux', version: 'Ubuntu 22.04' }
      ];
      const ipAddresses = ['192.168.1.', '10.0.1.', '172.16.1.', '203.0.113.'];
      
      const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
      const browser = browsers[Math.floor(Math.random() * browsers.length)];
      const os = operatingSystems[Math.floor(Math.random() * operatingSystems.length)];
      const ipBase = ipAddresses[Math.floor(Math.random() * ipAddresses.length)];
      const ipAddress = ipBase + Math.floor(Math.random() * 255);

      mockSubmissions.push({
        id: `submission-${i}`,
        firstName: `Person${i}`,
        lastName: `Test${i}`,
        dateOfBirth: '01/01/1990',
        selfieUrl: '',
        churchId: ['church-a', 'church-b', 'church-c', 'church-d'][Math.floor(Math.random() * 4)],
        submissionDate: submissionDate.toISOString(),
        familyHistoryDiabetes: Math.random() > 0.6,
        familyHistoryHighBP: Math.random() > 0.5,
        familyHistoryDementia: Math.random() > 0.8,
        nerveSymptoms: Math.random() > 0.7,
        tcpaConsent: true,
        phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        estimatedBMI: bmi,
        bmiCategory: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese',
        estimatedAge: Math.floor(Math.random() * 40) + 25,
        estimatedGender: ['Male', 'Female'][Math.floor(Math.random() * 2)],
        healthRiskLevel: riskScore <= 2 ? 'Low' : riskScore <= 4 ? 'Moderate' : riskScore <= 6 ? 'High' : 'Very High',
        healthRiskScore: riskScore,
        followUpStatus: ['Pending', 'Contacted', 'Scheduled', 'Completed'][Math.floor(Math.random() * 4)] as 'Pending' | 'Contacted' | 'Scheduled' | 'Completed',
        
        // Device and Network Information
        deviceInfo: {
          userAgent: `Mozilla/5.0 (${deviceType === 'mobile' ? 'iPhone; CPU iPhone OS 17_1 like Mac OS X' : 'Windows NT 10.0; Win64; x64'}) AppleWebKit/537.36`,
          device: { 
            type: deviceType,
            brand: deviceType === 'mobile' ? 'Apple' : 'Unknown',
            model: deviceType === 'mobile' ? 'iPhone 15' : 'Unknown'
          },
          browser,
          os,
          screen: {
            width: deviceType === 'mobile' ? 393 : deviceType === 'tablet' ? 1024 : 1920,
            height: deviceType === 'mobile' ? 852 : deviceType === 'tablet' ? 768 : 1080
          },
          timezone: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'][Math.floor(Math.random() * 4)],
          language: 'en-US',
          platform: deviceType === 'mobile' ? 'iPhone' : 'Win32'
        },
        networkInfo: {
          ipAddress,
          ipType: 'IPv4' as const,
          userAgent: `Mozilla/5.0 (${deviceType === 'mobile' ? 'iPhone; CPU iPhone OS 17_1 like Mac OS X' : 'Windows NT 10.0; Win64; x64'}) AppleWebKit/537.36`,
          referrer: Math.random() > 0.5 ? 'https://www.google.com/' : undefined
        },
        submissionFingerprint: Math.random().toString(36).substring(2, 15),
        sessionId: Math.random().toString(36).substring(2, 15)
      });
    }

    // Calculate statistics
    const today = startOfDay(now);
    const endToday = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const todaySubmissions = mockSubmissions.filter(s => {
      const date = new Date(s.submissionDate);
      return date >= today && date <= endToday;
    }).length;

    const weekSubmissions = mockSubmissions.filter(s => {
      const date = new Date(s.submissionDate);
      return date >= weekStart && date <= weekEnd;
    }).length;

    const monthSubmissions = mockSubmissions.filter(s => {
      const date = new Date(s.submissionDate);
      return date >= monthStart && date <= monthEnd;
    }).length;

    // Risk distribution
    const riskDistribution = {
      low: mockSubmissions.filter(s => s.healthRiskLevel === 'Low').length,
      moderate: mockSubmissions.filter(s => s.healthRiskLevel === 'Moderate').length,
      high: mockSubmissions.filter(s => s.healthRiskLevel === 'High').length,
      veryHigh: mockSubmissions.filter(s => s.healthRiskLevel === 'Very High').length,
    };

    // BMI distribution
    const bmiDistribution = {
      underweight: mockSubmissions.filter(s => s.bmiCategory === 'Underweight').length,
      normal: mockSubmissions.filter(s => s.bmiCategory === 'Normal weight').length,
      overweight: mockSubmissions.filter(s => s.bmiCategory === 'Overweight').length,
      obese: mockSubmissions.filter(s => s.bmiCategory === 'Obese').length,
    };

    // Gender distribution
    const genderDistribution = {
      male: mockSubmissions.filter(s => s.estimatedGender === 'Male').length,
      female: mockSubmissions.filter(s => s.estimatedGender === 'Female').length,
      unknown: mockSubmissions.filter(s => !s.estimatedGender).length,
    };

    // Age distribution
    const ageDistribution = [
      { range: '18-25', count: mockSubmissions.filter(s => s.estimatedAge && s.estimatedAge >= 18 && s.estimatedAge <= 25).length },
      { range: '26-35', count: mockSubmissions.filter(s => s.estimatedAge && s.estimatedAge >= 26 && s.estimatedAge <= 35).length },
      { range: '36-45', count: mockSubmissions.filter(s => s.estimatedAge && s.estimatedAge >= 36 && s.estimatedAge <= 45).length },
      { range: '46-55', count: mockSubmissions.filter(s => s.estimatedAge && s.estimatedAge >= 46 && s.estimatedAge <= 55).length },
      { range: '56-65', count: mockSubmissions.filter(s => s.estimatedAge && s.estimatedAge >= 56 && s.estimatedAge <= 65).length },
      { range: '65+', count: mockSubmissions.filter(s => s.estimatedAge && s.estimatedAge > 65).length },
    ];

    // Top performing locations
    const churchStats = new Map();
    mockSubmissions.forEach(s => {
      if (!churchStats.has(s.churchId)) {
        churchStats.set(s.churchId, { submissions: 0, totalRisk: 0 });
      }
      const stats = churchStats.get(s.churchId);
      stats.submissions++;
      stats.totalRisk += s.healthRiskScore || 0;
    });

    const topLocations = Array.from(churchStats.entries()).map(([churchId, stats]) => ({
      name: churchId.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      submissions: stats.submissions,
      riskScore: stats.submissions > 0 ? stats.totalRisk / stats.submissions : 0,
    })).sort((a, b) => b.submissions - a.submissions).slice(0, 5);

    const averageRiskScore = mockSubmissions.reduce((sum, s) => sum + (s.healthRiskScore || 0), 0) / mockSubmissions.length;

    const dashboardStats: DashboardStats = {
      totalSubmissions: mockSubmissions.length,
      todaySubmissions,
      weekSubmissions,
      monthSubmissions,
      totalOutreachLocations: 4, // Mock value
      averageRiskScore,
      conversionRate: 0.75, // Mock value
      riskDistribution,
      ageDistribution,
      genderDistribution,
      bmiDistribution,
      topLocations,
      recentSubmissions: mockSubmissions
        .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime())
        .slice(0, 20),
    };

    res.status(200).json({
      success: true,
      data: dashboardStats,
      message: 'Dashboard data retrieved successfully',
    });

  } catch (_error) {
    console.error('Dashboard API error:', _error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve dashboard data',
    });
  }
} 