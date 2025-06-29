# 🚀 Backend Setup Guide - AWS Configuration

## ✅ Status: Backend Code Complete
The frontend team has already implemented all backend functionality. You only need to configure AWS services.

## 🎯 Setup Checklist

### Step 1: Generate JWT Secret
```bash
# Generate a secure JWT secret (32 characters)
openssl rand -base64 32
# Save this output - you'll need it for environment variables
```

### Step 2: AWS Amplify Console Setup
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Connect to GitHub repository: `contentkingpins/churchoutreach`
4. Select branch: `main`
5. Accept default build settings
6. Click "Save and deploy"

### Step 3: Configure Environment Variables
In Amplify Console → App Settings → Environment Variables, add:

| Variable Name | Value | Required |
|---------------|-------|----------|
| `JWT_SECRET` | `[Your generated secret from Step 1]` | ✅ CRITICAL |
| `AWS_REGION` | `us-east-1` | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `NEXT_TELEMETRY_DISABLED` | `1` | ✅ |
| `AWS_S3_BUCKET_NAME` | `health-screening-photos-[suffix]` | ✅ |
| `ARYA_AI_API_KEY` | `[Your Arya AI key]` | ⚠️ Optional |

### Step 4: Create DynamoDB Tables

#### Table 1: health-screening-submissions
```bash
# In AWS DynamoDB Console:
- Table name: health-screening-submissions
- Partition key: id (String)
- Sort key: submissionDate (String)
- Billing mode: On-demand
```

#### Table 2: health-screening-churches
```bash
# In AWS DynamoDB Console:
- Table name: health-screening-churches
- Partition key: id (String)
- Global Secondary Index: name-index
  - GSI Partition key: name (String)
- Billing mode: On-demand
```

#### Table 3: health-screening-users
```bash
# In AWS DynamoDB Console:
- Table name: health-screening-users
- Partition key: email (String)
- Billing mode: On-demand
```

### Step 5: Create S3 Bucket
```bash
# In AWS S3 Console:
- Bucket name: health-screening-photos-[your-unique-suffix]
- Region: us-east-1
- Block all public access: ✅ (Keep enabled)
- Bucket versioning: Disabled
- Server-side encryption: Enabled (SSE-S3)
```

### Step 6: Configure IAM Permissions
The Amplify service role needs these permissions:

#### DynamoDB Permissions:
```json
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
        "arn:aws:dynamodb:us-east-1:*:table/health-screening-*",
        "arn:aws:dynamodb:us-east-1:*:table/health-screening-*/index/*"
      ]
    }
  ]
}
```

#### S3 Permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::health-screening-photos-*/*"
    }
  ]
}
```

### Step 7: Deploy and Test
1. **Trigger New Build**: Push to main branch or redeploy in Amplify Console
2. **Monitor Build**: Check build logs in Amplify Console
3. **Test Endpoints**: 
   - Health check: `https://[your-app].amplifyapp.com/api/health`
   - Admin login: `https://[your-app].amplifyapp.com/admin/login`

## 🔧 Quick Commands Reference

### Generate JWT Secret:
```bash
openssl rand -base64 32
```

### Test API Endpoints:
```bash
# Test submissions endpoint
curl -X POST https://[your-app].amplifyapp.com/api/submissions \
  -H "Content-Type: multipart/form-data" \
  -F "firstName=Test" \
  -F "lastName=User" \
  -F "dateOfBirth=1990-01-01" \
  -F "churchId=test-church"

# Test admin login
curl -X POST https://[your-app].amplifyapp.com/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.org","password":"demo123"}'
```

## 🎯 Default Admin Credentials
- **Email**: `admin@demo.org`
- **Password**: `demo123`

## ⚠️ Important Notes
1. **JWT_SECRET is CRITICAL** - Build will fail without it
2. **DynamoDB table names must match exactly** - Case sensitive
3. **S3 bucket names must be globally unique** - Add your suffix
4. **All services must be in us-east-1** - Don't change region
5. **Amplify IAM role needs permissions** - Attach policies above

## 🚀 Post-Setup Verification
Once deployed, verify these work:
- [ ] Home page loads: `https://[your-app].amplifyapp.com/`
- [ ] Admin login works: `https://[your-app].amplifyapp.com/admin/login`
- [ ] Form submission works: `https://[your-app].amplifyapp.com/form/test-church`
- [ ] Dashboard shows data: `https://[your-app].amplifyapp.com/admin/dashboard`

## 📞 Support
If you encounter issues:
1. Check Amplify build logs
2. Verify environment variables are set
3. Confirm DynamoDB tables exist
4. Check IAM permissions

**Status**: Ready for production deployment! 🎉 