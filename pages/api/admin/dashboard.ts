import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth';
import { DashboardStats, HealthSubmission, ApiResponse } from '@/types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '@/lib/aws-config';

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

  // Verify admin authentication
  const user = requireAdmin(req, res);
  if (!user) return; // Response already sent by requireAdmin

  try {
    console.log('Dashboard: Starting data fetch', { 
      table: TABLES.SUBMISSIONS, 
      region: process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-1',
      nodeEnv: process.env.NODE_ENV 
    });

    // Query all submissions from DynamoDB
    let submissionsResult;
    try {
      console.log('Dashboard: Attempting DynamoDB scan...');
      submissionsResult = await docClient.send(new ScanCommand({
        TableName: TABLES.SUBMISSIONS,
      }));
      console.log('Dashboard: DynamoDB scan successful', { itemCount: submissionsResult.Items?.length || 0 });
    } catch (scanError) {
      console.error('Dashboard: DynamoDB scan failed', { 
        error: scanError, 
        table: TABLES.SUBMISSIONS,
        errorName: scanError instanceof Error ? scanError.name : 'Unknown',
        errorMessage: scanError instanceof Error ? scanError.message : 'Unknown error',
        errorStack: scanError instanceof Error ? scanError.stack : 'No stack'
      });
      throw new Error(`Failed to scan submissions table: ${scanError instanceof Error ? scanError.message : 'Unknown error'}`);
    }

    const submissions = (submissionsResult.Items || []) as HealthSubmission[];
    console.log('Dashboard: Retrieved submissions', { count: submissions.length });

    // If no submissions, return empty dashboard with defaults
    if (submissions.length === 0) {
      const emptyDashboardStats: DashboardStats = {
        totalSubmissions: 0,
        todaySubmissions: 0,
        weekSubmissions: 0,
        monthSubmissions: 0,
        totalOutreachLocations: 0,
        averageRiskScore: 0,
        conversionRate: 0,
        riskDistribution: { low: 0, moderate: 0, high: 0, veryHigh: 0 },
        ageDistribution: [
          { range: '18-25', count: 0 },
          { range: '26-35', count: 0 },
          { range: '36-45', count: 0 },
          { range: '46-55', count: 0 },
          { range: '56-65', count: 0 },
          { range: '65+', count: 0 },
        ],
        genderDistribution: { male: 0, female: 0, unknown: 0 },
        bmiDistribution: { underweight: 0, normal: 0, overweight: 0, obese: 0 },
        topLocations: [],
        recentSubmissions: [],
      };

      return res.status(200).json({
        success: true,
        data: emptyDashboardStats,
        message: 'Dashboard loaded - no submissions yet',
      });
    }

    // Query all locations to get total count
    let locationsResult;
    try {
      locationsResult = await docClient.send(new ScanCommand({
        TableName: TABLES.CHURCHES,
      }));
    } catch (locationsError) {
      console.error('Dashboard: Locations scan failed', { error: locationsError, table: TABLES.CHURCHES });
      throw new Error(`Failed to scan locations table: ${locationsError instanceof Error ? locationsError.message : 'Unknown error'}`);
    }

    const totalOutreachLocations = locationsResult.Items?.length || 0;

    // Calculate time-based statistics
    const now = new Date();
    const today = startOfDay(now);
    const endToday = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const todaySubmissions = submissions.filter(s => {
      const date = new Date(s.submissionDate);
      return date >= today && date <= endToday;
    }).length;

    const weekSubmissions = submissions.filter(s => {
      const date = new Date(s.submissionDate);
      return date >= weekStart && date <= weekEnd;
    }).length;

    const monthSubmissions = submissions.filter(s => {
      const date = new Date(s.submissionDate);
      return date >= monthStart && date <= monthEnd;
    }).length;

    // Risk distribution
    const riskDistribution = {
      low: submissions.filter(s => s.healthRiskLevel === 'Low').length,
      moderate: submissions.filter(s => s.healthRiskLevel === 'Moderate').length,
      high: submissions.filter(s => s.healthRiskLevel === 'High').length,
      veryHigh: submissions.filter(s => s.healthRiskLevel === 'Very High').length,
    };

    // BMI distribution
    const bmiDistribution = {
      underweight: submissions.filter(s => s.bmiCategory === 'Underweight').length,
      normal: submissions.filter(s => s.bmiCategory === 'Normal weight' || s.bmiCategory === 'Normal').length,
      overweight: submissions.filter(s => s.bmiCategory === 'Overweight').length,
      obese: submissions.filter(s => s.bmiCategory === 'Obese').length,
    };

    // Gender distribution with safety checks
    const genderDistribution = {
      male: submissions.filter(s => (s.estimatedGender === 'Male') || (s.sex === 'male')).length,
      female: submissions.filter(s => (s.estimatedGender === 'Female') || (s.sex === 'female')).length,
      unknown: submissions.filter(s => (!s.estimatedGender || s.estimatedGender === 'Unknown') && (!s.sex)).length,
    };

    // Age distribution with safety checks
    const ageDistribution = [
      { range: '18-25', count: submissions.filter(s => s.estimatedAge && typeof s.estimatedAge === 'number' && s.estimatedAge >= 18 && s.estimatedAge <= 25).length },
      { range: '26-35', count: submissions.filter(s => s.estimatedAge && typeof s.estimatedAge === 'number' && s.estimatedAge >= 26 && s.estimatedAge <= 35).length },
      { range: '36-45', count: submissions.filter(s => s.estimatedAge && typeof s.estimatedAge === 'number' && s.estimatedAge >= 36 && s.estimatedAge <= 45).length },
      { range: '46-55', count: submissions.filter(s => s.estimatedAge && typeof s.estimatedAge === 'number' && s.estimatedAge >= 46 && s.estimatedAge <= 55).length },
      { range: '56-65', count: submissions.filter(s => s.estimatedAge && typeof s.estimatedAge === 'number' && s.estimatedAge >= 56 && s.estimatedAge <= 65).length },
      { range: '65+', count: submissions.filter(s => s.estimatedAge && typeof s.estimatedAge === 'number' && s.estimatedAge > 65).length },
    ];

    // Top performing locations
    const churchStats = new Map();
    submissions.forEach(s => {
      if (!churchStats.has(s.churchId)) {
        churchStats.set(s.churchId, { submissions: 0, totalRisk: 0 });
      }
      const stats = churchStats.get(s.churchId);
      stats.submissions++;
      stats.totalRisk += s.healthRiskScore || 0;
    });

    // Get actual location names from the churches table
    const locationNameMap = new Map();
    if (locationsResult.Items) {
      locationsResult.Items.forEach((location: any) => {
        locationNameMap.set(location.id, location.name);
      });
    }

    const topLocations = Array.from(churchStats.entries()).map(([churchId, stats]) => ({
      name: locationNameMap.get(churchId) || churchId,
      submissions: stats.submissions,
      riskScore: stats.submissions > 0 ? stats.totalRisk / stats.submissions : 0,
    })).sort((a, b) => b.submissions - a.submissions).slice(0, 5);

    // Calculate average risk score
    const averageRiskScore = submissions.length > 0 
      ? submissions.reduce((sum, s) => sum + (s.healthRiskScore || 0), 0) / submissions.length 
      : 0;

    // Calculate conversion rate (submissions with phone/email vs total)
    const submissionsWithContact = submissions.filter(s => s.phone || s.email).length;
    const conversionRate = submissions.length > 0 ? submissionsWithContact / submissions.length : 0;

    const dashboardStats: DashboardStats = {
      totalSubmissions: submissions.length,
      todaySubmissions,
      weekSubmissions,
      monthSubmissions,
      totalOutreachLocations,
      averageRiskScore,
      conversionRate,
      riskDistribution,
      ageDistribution,
      genderDistribution,
      bmiDistribution,
      topLocations,
      recentSubmissions: submissions
        .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime())
        .slice(0, 20),
    };

    res.status(200).json({
      success: true,
      data: dashboardStats,
      message: 'Dashboard data retrieved successfully',
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve dashboard data',
    });
  }
} 