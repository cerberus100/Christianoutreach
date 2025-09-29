import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';

// AWS Configuration
const awsConfig = {
  region: process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-1',
  // In production (AWS Lambda), always use IAM role credentials
  // Never use explicit credentials in Amplify environment
};

// DynamoDB Client
const dynamoDBClient = new DynamoDBClient(awsConfig);
export const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// S3 Client
export const s3Client = new S3Client(awsConfig);

// SNS Client
export const snsClient = new SNSClient(awsConfig);

// Table Names - HARDCODED since environment variables aren't reaching Lambda
export const TABLES = {
  SUBMISSIONS: 'health-screening-submissions',
  CHURCHES: 'health-screening-churches',
  USERS: 'health-screening-users',
};

// DynamoDB Global Secondary Indexes - HARDCODED since env vars aren't reaching Lambda
export const GSI = {
  SUBMISSIONS_CHURCH_DATE: 'submissions-church-date-index',
};

// S3 Bucket - HARDCODED since env vars aren't reaching Lambda
export const S3_BUCKET = 'health-screening-photos-2024'; 

// Secondary Indexes - HARDCODED since env vars aren't reaching Lambda
export const INDEXES = {
  SUBMISSIONS_BY_CHURCH_DATE: 'submissions-church-date-index',
};