#!/bin/bash

# AWS Health Screening System Setup Script
# This script creates the necessary AWS resources for the health screening system

set -e

echo "🚀 Setting up AWS resources for Health Screening System..."

# Configuration
REGION="us-east-1"
PROJECT_NAME="health-screening"
BUCKET_SUFFIX=$(date +%s)  # Unique suffix using timestamp

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

log_info "Starting AWS resource creation..."

# 1. Create DynamoDB Tables
log_info "Creating DynamoDB tables..."

# Create submissions table
aws dynamodb create-table \
    --table-name health-screening-submissions \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=submissionDate,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
        AttributeName=submissionDate,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --no-cli-pager || log_warn "Submissions table may already exist"

# Create churches table
aws dynamodb create-table \
    --table-name health-screening-churches \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=name,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=name-index,KeySchema=[{AttributeName=name,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --no-cli-pager || log_warn "Churches table may already exist"

# Create users table
aws dynamodb create-table \
    --table-name health-screening-users \
    --attribute-definitions \
        AttributeName=email,AttributeType=S \
    --key-schema \
        AttributeName=email,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --no-cli-pager || log_warn "Users table may already exist"

log_info "DynamoDB tables created successfully"

# 2. Create S3 Bucket
BUCKET_NAME="health-screening-photos-${BUCKET_SUFFIX}"
log_info "Creating S3 bucket: $BUCKET_NAME"

aws s3 mb s3://$BUCKET_NAME --region $REGION || log_warn "Bucket may already exist"

# Configure bucket settings
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Disabled

aws s3api put-bucket-encryption \
    --bucket $BUCKET_NAME \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }'

aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration \
        BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

log_info "S3 bucket created and configured successfully"

# 3. Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
log_info "Generated JWT secret"

# 4. Create IAM policy for Amplify
POLICY_NAME="HealthScreeningAmplifyPolicy"
log_info "Creating IAM policy: $POLICY_NAME"

POLICY_DOCUMENT=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": [
                "arn:aws:dynamodb:${REGION}:*:table/health-screening-*",
                "arn:aws:dynamodb:${REGION}:*:table/health-screening-*/index/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
        }
    ]
}
EOF
)

aws iam create-policy \
    --policy-name $POLICY_NAME \
    --policy-document "$POLICY_DOCUMENT" \
    --description "Policy for Health Screening Amplify app" \
    --no-cli-pager || log_warn "Policy may already exist"

log_info "IAM policy created successfully"

# 5. Output summary
echo ""
echo "🎉 AWS Setup Complete!"
echo "======================================"
echo ""
echo "📋 Environment Variables for Amplify:"
echo "======================================"
echo "JWT_SECRET=$JWT_SECRET"
echo "AWS_REGION=$REGION"
echo "AWS_S3_BUCKET_NAME=$BUCKET_NAME"
echo "NODE_ENV=production"
echo "NEXT_TELEMETRY_DISABLED=1"
echo ""
echo "📋 Resources Created:"
echo "===================="
echo "✅ DynamoDB Tables:"
echo "   - health-screening-submissions"
echo "   - health-screening-churches"
echo "   - health-screening-users"
echo "✅ S3 Bucket: $BUCKET_NAME"
echo "✅ IAM Policy: $POLICY_NAME"
echo ""
echo "🔧 Next Steps:"
echo "=============="
echo "1. Copy the environment variables above to AWS Amplify Console"
echo "2. Go to Amplify Console → Your App → App Settings → Environment Variables"
echo "3. Add each variable listed above"
echo "4. Attach the IAM policy '$POLICY_NAME' to your Amplify service role"
echo "5. Redeploy your app"
echo ""
echo "🌐 Admin Login Credentials:"
echo "=========================="
echo "Email: admin@demo.org"
echo "Password: demo123"
echo ""
log_info "Setup complete! 🚀" 