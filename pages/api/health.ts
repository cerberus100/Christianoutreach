import { NextApiRequest, NextApiResponse } from 'next';
import { docClient, TABLES } from '@/lib/aws-config';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: 'healthy' | 'unhealthy';
    environment: 'healthy' | 'unhealthy';
  };
  version: string;
  debug?: {
    env_vars?: string[];
    aws_region?: string;
    table_name?: string;
    error?: string;
  };
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

  const debugInfo: any = {};

  try {
    // Check environment variables
    const requiredEnvVars = [
      'JWT_SECRET',
      'APP_AWS_REGION',
      'APP_ACCESS_KEY_ID',
      'APP_SECRET_ACCESS_KEY',
      'APP_DYNAMODB_TABLE_NAME'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    debugInfo.env_vars = missingEnvVars;
    debugInfo.aws_region = process.env.APP_AWS_REGION;
    debugInfo.table_name = TABLES.SUBMISSIONS;
    
    const environmentStatus: 'healthy' | 'unhealthy' = missingEnvVars.length === 0 ? 'healthy' : 'unhealthy';

    // Check database connection using correct DynamoDB client
    let databaseStatus: 'healthy' | 'unhealthy' = 'healthy';
    try {
      // Create a DynamoDB client with the same config as our document client
      const dynamoClient = new DynamoDBClient({
        region: process.env.APP_AWS_REGION || 'us-east-1',
        ...(process.env.APP_ACCESS_KEY_ID && process.env.APP_SECRET_ACCESS_KEY 
          ? {
              credentials: {
                accessKeyId: process.env.APP_ACCESS_KEY_ID,
                secretAccessKey: process.env.APP_SECRET_ACCESS_KEY,
              },
            }
          : {}),
      });

      await dynamoClient.send(new DescribeTableCommand({
        TableName: TABLES.SUBMISSIONS,
      }));
    } catch (error) {
      debugInfo.error = error instanceof Error ? error.message : 'Unknown error';
      databaseStatus = 'unhealthy';
    }

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
      debug: debugInfo,
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'unhealthy',
        environment: 'unhealthy',
      },
      version: '1.0.0',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error',
        ...debugInfo
      },
    });
  }
} 