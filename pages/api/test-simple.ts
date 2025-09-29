import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Simple test endpoint that returns hardcoded data
  // This bypasses ALL AWS configuration issues
  
  const testData = {
    status: 'working',
    message: 'Simple endpoint is functional',
    timestamp: new Date().toISOString(),
    testStats: {
      totalSubmissions: 42,
      todaySubmissions: 5,
      weekSubmissions: 15,
      monthSubmissions: 42,
      totalOutreachLocations: 3,
      averageRiskScore: 2.5,
      conversionRate: 0.85,
      riskDistribution: { low: 10, moderate: 15, high: 12, veryHigh: 5 },
      ageDistribution: [
        { range: '18-25', count: 8 },
        { range: '26-35', count: 12 },
        { range: '36-45', count: 10 },
        { range: '46-55', count: 7 },
        { range: '56-65', count: 3 },
        { range: '65+', count: 2 },
      ],
      genderDistribution: { male: 20, female: 22, unknown: 0 },
      bmiDistribution: { underweight: 2, normal: 18, overweight: 15, obese: 7 },
      topLocations: [
        { id: 'church1', name: 'Main Street Church', submissions: 15, averageRisk: 2.2 },
        { id: 'church2', name: 'Community Center', submissions: 12, averageRisk: 2.8 },
        { id: 'church3', name: 'Downtown Chapel', submissions: 15, averageRisk: 2.1 },
      ],
      recentSubmissions: [
        {
          id: 'test1',
          firstName: 'John',
          lastName: 'Doe',
          healthRiskLevel: 'Moderate',
          submissionDate: new Date().toISOString(),
          churchId: 'church1'
        },
        {
          id: 'test2', 
          firstName: 'Jane',
          lastName: 'Smith',
          healthRiskLevel: 'Low',
          submissionDate: new Date(Date.now() - 86400000).toISOString(),
          churchId: 'church2'
        }
      ]
    }
  };

  res.status(200).json({
    success: true,
    data: testData.testStats,
    message: 'Test dashboard data loaded successfully'
  });
}
