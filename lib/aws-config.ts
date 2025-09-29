import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';

// AWS Configuration
const awsConfig = {
  region: process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-1',
  // In Amplify, use the default credential chain (IAM role)
  // Do not set credentials explicitly to avoid conflicts
};

// DynamoDB Client
const dynamoDBClient = new DynamoDBClient(awsConfig);
export const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// S3 Client
export const s3Client = new S3Client(awsConfig);

// SNS Client
export const snsClient = new SNSClient(awsConfig);

// Table Names - Use fallback values since environment variables aren't reaching Lambda
export const TABLES = {
  SUBMISSIONS: process.env.APP_DYNAMODB_TABLE_NAME || 'health-screening-submissions',
  CHURCHES: process.env.APP_DYNAMODB_CHURCHES_TABLE || 'health-screening-churches',
  USERS: process.env.APP_DYNAMODB_USERS_TABLE || 'health-screening-users',
};

// DynamoDB Global Secondary Indexes - Use fallback values
export const GSI = {
  SUBMISSIONS_CHURCH_DATE: process.env.APP_DYNAMODB_SUBMISSIONS_GSI_CHURCH_DATE || 'submissions-church-date-index',
};

// S3 Bucket - Use fallback values
export const S3_BUCKET = process.env.APP_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || 'health-screening-photos-2024'; 

// Secondary Indexes - Use fallback values
export const INDEXES = {
  SUBMISSIONS_BY_CHURCH_DATE: process.env.APP_DYNAMODB_SUBMISSIONS_GSI_CHURCH_DATE || 'submissions-church-date-index',
};