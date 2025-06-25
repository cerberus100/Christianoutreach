# Deployment Guide - Health Screening System

## 🚀 AWS Amplify Deployment

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **GitHub Account** with repository access
3. **Domain Name** (optional, for custom domain)

### Step 1: Prepare Repository

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Health Screening System"
   git branch -M main
   git remote add origin https://github.com/yourusername/health-screening-system.git
   git push -u origin main
   ```

2. **Set up GitHub Secrets:**
   - Go to GitHub Repository → Settings → Secrets and Variables → Actions
   - Add the following secrets:
     ```
     JWT_SECRET=your_32_character_jwt_secret
     AWS_ACCESS_KEY_ID=your_aws_access_key
     AWS_SECRET_ACCESS_KEY=your_aws_secret_key
     ARYA_AI_API_KEY=your_arya_ai_api_key
     ```

### Step 2: AWS Amplify Setup

1. **Login to AWS Amplify Console:**
   - Go to https://console.aws.amazon.com/amplify/
   - Click "Create new app"

2. **Connect Repository:**
   - Select "GitHub" as source
   - Authorize AWS Amplify to access your GitHub account
   - Select your repository: `health-screening-system`
   - Choose branch: `main`

3. **Configure Build Settings:**
   - Amplify will detect the `amplify.yml` file automatically
   - Review the configuration and click "Next"

4. **Environment Variables:**
   Add these environment variables in Amplify Console:
   ```
   JWT_SECRET=your_32_character_jwt_secret_here
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_S3_BUCKET_NAME=health-screening-photos-prod
   AWS_DYNAMODB_TABLE_NAME=health-screening-submissions-prod
   AWS_DYNAMODB_CHURCHES_TABLE=health-screening-churches-prod
   AWS_DYNAMODB_USERS_TABLE=health-screening-users-prod
   ARYA_AI_API_KEY=your_arya_ai_api_key
   ARYA_AI_BASE_URL=https://api.arya.ai
   NEXTAUTH_URL=https://yourdomain.amplifyapp.com
   NEXTAUTH_SECRET=your_nextauth_secret_32_chars
   NODE_ENV=production
   NEXT_TELEMETRY_DISABLED=1
   ```

### Step 3: AWS Resources Setup

#### DynamoDB Tables

Create the following DynamoDB tables:

1. **health-screening-submissions-prod**
   ```bash
   aws dynamodb create-table \
     --table-name health-screening-submissions-prod \
     --attribute-definitions \
       AttributeName=id,AttributeType=S \
       AttributeName=churchId,AttributeType=S \
       AttributeName=submissionDate,AttributeType=S \
     --key-schema \
       AttributeName=id,KeyType=HASH \
     --global-secondary-indexes \
       IndexName=ChurchSubmissionsIndex,KeySchema=[{AttributeName=churchId,KeyType=HASH},{AttributeName=submissionDate,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
     --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
   ```

2. **health-screening-churches-prod**
   ```bash
   aws dynamodb create-table \
     --table-name health-screening-churches-prod \
     --attribute-definitions AttributeName=id,AttributeType=S \
     --key-schema AttributeName=id,KeyType=HASH \
     --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
   ```

3. **health-screening-users-prod**
   ```bash
   aws dynamodb create-table \
     --table-name health-screening-users-prod \
     --attribute-definitions \
       AttributeName=id,AttributeType=S \
       AttributeName=email,AttributeType=S \
     --key-schema AttributeName=id,KeyType=HASH \
     --global-secondary-indexes \
       IndexName=EmailIndex,KeySchema=[{AttributeName=email,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
     --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
   ```

#### S3 Bucket

```bash
aws s3 mb s3://health-screening-photos-prod
aws s3api put-bucket-encryption \
  --bucket health-screening-photos-prod \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

### Step 4: IAM Permissions

Create an IAM policy for Amplify:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/health-screening-*",
        "arn:aws:dynamodb:*:*:table/health-screening-*/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::health-screening-photos-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::health-screening-photos-prod"
    }
  ]
}
```

### Step 5: Deploy

1. **Review Settings:** In Amplify Console, review all settings
2. **Deploy:** Click "Save and Deploy"
3. **Monitor:** Watch the build process in real-time
4. **Test:** Once deployed, test all functionality

### Step 6: Custom Domain (Optional)

1. **Add Domain:** In Amplify Console → Domain Management
2. **DNS Configuration:** Update your domain's DNS settings
3. **SSL Certificate:** Amplify automatically provisions SSL certificates

## 🔧 Post-Deployment Configuration

### Admin User Setup

1. **Create Admin User:**
   ```javascript
   // Run this script once to create your admin user
   const bcrypt = require('bcryptjs');
   const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
   const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
   
   const client = new DynamoDBClient({ region: 'us-east-1' });
   const docClient = DynamoDBDocumentClient.from(client);
   
   async function createAdminUser() {
     const hashedPassword = await bcrypt.hash('your_secure_password', 10);
     
     await docClient.send(new PutCommand({
       TableName: 'health-screening-users-prod',
       Item: {
         id: 'admin-001',
         email: 'admin@yourchurch.org',
         hashedPassword,
         role: 'admin',
         firstName: 'Admin',
         lastName: 'User',
         createdDate: new Date().toISOString(),
         isActive: true
       }
     }));
   }
   
   createAdminUser().then(() => console.log('Admin user created'));
   ```

### Monitoring Setup

1. **CloudWatch Alarms:**
   - API Gateway errors
   - DynamoDB throttling
   - S3 upload failures

2. **Log Groups:**
   - Set up CloudWatch log groups for debugging
   - Configure log retention policies

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check environment variables are set correctly
   - Verify all dependencies are in package.json
   - Check build logs in Amplify Console

2. **Runtime Errors:**
   - Check CloudWatch logs
   - Verify AWS resource permissions
   - Confirm environment variables in production

3. **API Errors:**
   - Verify DynamoDB table names match environment variables
   - Check IAM permissions for AWS services
   - Confirm JWT_SECRET is set correctly

### Build Commands Reference

```bash
# Local development
npm run dev

# Production build test
npm run build
npm start

# Lint and type check
npm run lint
npx tsc --noEmit

# Security audit
npm audit
```

## 📊 Performance Optimization

### CDN Configuration

Amplify automatically configures CloudFront CDN with:
- Global edge locations
- Automatic HTTPS
- Custom headers (configured in amplify.yml)

### Caching Strategy

- Static assets: 1 year cache
- API responses: No cache (configured in amplify.yml)
- Admin pages: No cache for security

## 🔐 Security Checklist

- [ ] Environment variables are set in Amplify Console (not in code)
- [ ] JWT_SECRET is 32+ characters and unique
- [ ] AWS IAM permissions follow principle of least privilege
- [ ] S3 bucket has encryption enabled
- [ ] DynamoDB tables have encryption at rest
- [ ] Custom domain has HTTPS enforced
- [ ] Admin routes have proper authentication
- [ ] File upload limits are enforced
- [ ] Input validation is implemented

## 📈 Monitoring and Maintenance

### Key Metrics to Monitor

1. **Application Performance:**
   - Page load times
   - API response times
   - Error rates
   - User engagement

2. **Infrastructure:**
   - DynamoDB read/write capacity
   - S3 storage usage
   - Lambda function durations
   - CloudFront cache hit ratio

3. **Security:**
   - Failed login attempts
   - Unusual access patterns
   - File upload volumes
   - API rate limits

### Backup Strategy

1. **DynamoDB:** Enable point-in-time recovery
2. **S3:** Enable versioning and cross-region replication
3. **Code:** GitHub serves as primary backup

## 🚀 Scaling Considerations

### Auto Scaling

- DynamoDB: Configure auto-scaling for read/write capacity
- S3: Automatically scales with usage
- Amplify: Automatically scales web hosting

### Performance Optimization

- Enable DynamoDB DAX for caching
- Use S3 Transfer Acceleration for large uploads
- Implement CloudFront optimization features

## 🔄 CI/CD Pipeline

The GitHub Actions workflow automatically:
1. Runs tests on every push
2. Performs security audits
3. Builds the application
4. Deploys to Amplify on main branch

### Manual Deployment

If needed, you can trigger manual deployments:
1. Go to Amplify Console
2. Select your app
3. Click "Run build" for manual deployment

---

## 🎉 Success! Your Health Screening System is Live

Once deployed, your system will be available at:
- **Production URL:** `https://main.xxxxxx.amplifyapp.com`
- **Custom Domain:** `https://yourdomain.com` (if configured)

Test all functionality and enjoy your fully deployed health screening system! 🚀 