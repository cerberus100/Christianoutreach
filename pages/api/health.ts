import { NextApiRequest, NextApiResponse } from 'next';
import { TABLES } from '@/lib/aws-config';
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

  const debugInfo: Record<string, any> = {};

  try {
    // Debug ALL environment variables
    debugInfo.all_env_vars = Object.keys(process.env).filter(key => 
      key.startsWith('APP_') || key.startsWith('JWT_') || key.startsWith('AWS_') || key.startsWith('NODE_')
    ).reduce((acc, key) => {
      acc[key] = process.env[key] ? 'SET' : 'MISSING';
      return acc;
    }, {} as Record<string, string>);

    // Debug JWT_SECRET specifically
    debugInfo.jwt_secret_length = process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0;
    debugInfo.jwt_secret_first_chars = process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 5) : 'NONE';

    // Check environment variables
    const requiredEnvVars = [
      'JWT_SECRET',
      'APP_DYNAMODB_TABLE_NAME'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => {
      const value = process.env[envVar];
      return !value || value.length === 0;
    });
    debugInfo.env_vars = missingEnvVars.length > 0 ? missingEnvVars : ['all_present'];
    debugInfo.aws_region = process.env.APP_AWS_REGION;
    debugInfo.table_name = TABLES.SUBMISSIONS;
    
    const environmentStatus: 'healthy' | 'unhealthy' = missingEnvVars.length === 0 ? 'healthy' : 'unhealthy';

    // Check database connection using correct DynamoDB client
    let databaseStatus: 'healthy' | 'unhealthy' = 'healthy';
    try {
      // Create a DynamoDB client with the same config as our document client
      const dynamoClient = new DynamoDBClient({
        region: process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-1',
        // Use IAM role credentials in production (no explicit credentials)
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