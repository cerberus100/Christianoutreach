import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

// AWS Configuration
const awsConfig = {
  region: process.env.APP_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
};

// DynamoDB Client
const dynamoDBClient = new DynamoDBClient(awsConfig);
export const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// S3 Client
export const s3Client = new S3Client(awsConfig);

// Table Names
export const TABLES = {
  SUBMISSIONS: process.env.AWS_DYNAMODB_TABLE_NAME || 'health-screening-submissions',
  CHURCHES: process.env.AWS_DYNAMODB_CHURCHES_TABLE || 'health-screening-churches',
  USERS: process.env.AWS_DYNAMODB_USERS_TABLE || 'health-screening-users',
};

// S3 Bucket
export const S3_BUCKET = process.env.APP_S3_BUCKET_NAME || 'health-screening-photos'; 