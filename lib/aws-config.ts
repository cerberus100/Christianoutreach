import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';

// AWS Configuration
const awsConfig = {
  region: process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-1',
  // Use explicit credentials if provided, otherwise use IAM role (production)
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
};

// DynamoDB Client
const dynamoDBClient = new DynamoDBClient(awsConfig);
export const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// S3 Client
export const s3Client = new S3Client(awsConfig);

// SNS Client
export const snsClient = new SNSClient(awsConfig);

// Table Names
export const TABLES = {
  SUBMISSIONS: process.env.APP_DYNAMODB_TABLE_NAME || 'health-screening-submissions',
  CHURCHES: process.env.APP_DYNAMODB_CHURCHES_TABLE || 'health-screening-churches',
  USERS: process.env.APP_DYNAMODB_USERS_TABLE || 'health-screening-users',
};

// DynamoDB Global Secondary Indexes
export const GSI = {
  SUBMISSIONS_CHURCH_DATE: process.env.APP_DYNAMODB_SUBMISSIONS_GSI_CHURCH_DATE || 'submissions-church-date-index',
};

// S3 Bucket
export const S3_BUCKET = process.env.APP_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || 'health-screening-photos-2024'; 

// Secondary Indexes
export const INDEXES = {
  SUBMISSIONS_BY_CHURCH_DATE:
    process.env.APP_DYNAMODB_SUBMISSIONS_GSI_CHURCH_DATE ||
    process.env.APP_DYNAMODB_SUBMISSIONS_GSI ||
    undefined,
};