import { NextApiRequest, NextApiResponse } from 'next';
import { docClient, TABLES } from '@/lib/aws-config';
import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: 'healthy' | 'unhealthy';
    environment: 'healthy' | 'unhealthy';
  };
  version: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'unhealthy',
        environment: 'unhealthy',
      },
      version: '1.0.0',
    });
  }

  try {
    // Check database connection
    let databaseStatus: 'healthy' | 'unhealthy' = 'healthy';
    try {
      await docClient.send(new DescribeTableCommand({
        TableName: TABLES.SUBMISSIONS,
      }));
    } catch (error) {
      console.error('Database health check failed:', error);
      databaseStatus = 'unhealthy';
    }

    // Check environment variables
    const environmentStatus: 'healthy' | 'unhealthy' = 
      process.env.JWT_SECRET && process.env.APP_AWS_REGION ? 'healthy' : 'unhealthy';

    const overallStatus = databaseStatus === 'healthy' && environmentStatus === 'healthy' 
      ? 'healthy' : 'unhealthy';

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: databaseStatus,
        environment: environmentStatus,
      },
      version: '1.0.0',
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'unhealthy',
        environment: 'unhealthy',
      },
      version: '1.0.0',
    });
  }
} 