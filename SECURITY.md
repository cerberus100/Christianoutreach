# Security Guidelines for Health Screening System

## 🔐 Environment Configuration

### Required Environment Variables

Create a `.env.local` file in your project root with these variables:

```bash
# JWT Secret for authentication (MUST be changed in production)
JWT_SECRET=your_strong_jwt_secret_minimum_32_characters

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET_NAME=health-screening-photos
AWS_DYNAMODB_TABLE_NAME=health-screening-submissions
AWS_DYNAMODB_CHURCHES_TABLE=health-screening-churches
AWS_DYNAMODB_USERS_TABLE=health-screening-users

# Arya.ai API Configuration
ARYA_AI_API_KEY=your_arya_ai_api_key
ARYA_AI_BASE_URL=https://api.arya.ai

# Next.js Configuration
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_nextauth_secret_minimum_32_characters
```

## 🛡️ Security Features Implemented

### Authentication & Authorization
- ✅ JWT-based admin authentication
- ✅ Password hashing with bcryptjs
- ✅ Token expiration (24 hours)
- ✅ Protected API routes with middleware
- ✅ Client-side authentication checks

### Data Protection
- ✅ Input validation on all forms
- ✅ File upload size limits (5MB)
- ✅ Secure file storage in AWS S3
- ✅ Data encryption in transit (HTTPS required)
- ✅ Environment variable protection

### Privacy & Compliance
- ✅ Explicit consent collection
- ✅ Data minimization principles
- ✅ Secure photo handling
- ✅ Optional contact information
- ✅ Clear data usage messaging

## ⚠️ Production Security Checklist

### Before Deploying:

1. **Environment Variables**
   - [ ] Generate strong JWT_SECRET (32+ characters)
   - [ ] Set up AWS IAM with minimal permissions
   - [ ] Configure production S3 bucket with encryption
   - [ ] Set NEXTAUTH_URL to production domain

2. **Database Security**
   - [ ] Enable DynamoDB encryption at rest
   - [ ] Configure VPC and security groups
   - [ ] Set up backup and recovery
   - [ ] Implement access logging

3. **Application Security**
   - [ ] Enable HTTPS/TLS certificates
   - [ ] Configure CORS properly
   - [ ] Set up rate limiting
   - [ ] Implement CSP headers
   - [ ] Remove demo credentials

4. **Monitoring & Logging**
   - [ ] Set up CloudWatch logging
   - [ ] Configure error monitoring
   - [ ] Implement audit trails
   - [ ] Set up security alerts

## 🚨 Security Concerns to Address

### High Priority
1. **Demo Credentials**: Remove hardcoded demo user in production
2. **JWT Secret**: Must be strong and unique per environment
3. **Rate Limiting**: Implement on login and form submission endpoints
4. **Input Sanitization**: Add HTML/SQL injection protection

### Medium Priority
1. **CSRF Protection**: Add CSRF tokens to forms
2. **Session Management**: Implement proper logout and token refresh
3. **File Validation**: Enhanced image file type validation
4. **Audit Logging**: Log all admin actions

### Recommendations
1. **Use AWS Secrets Manager** for API keys in production
2. **Implement OAuth 2.0** for better admin authentication
3. **Add API rate limiting** with AWS API Gateway
4. **Set up AWS WAF** for additional protection

## 📋 Compliance Notes

### HIPAA Considerations
- PHI data is collected (names, DOB, health info)
- Ensure AWS Business Associate Agreement
- Implement data retention policies
- Consider additional encryption requirements

### General Privacy
- Clear privacy policy required
- Consent tracking implemented
- Data portability features recommended
- Right to deletion should be implemented

## 🔧 Quick Security Setup

For development:
```bash
# 1. Copy environment template
cp env.example .env.local

# 2. Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Set the generated secret in .env.local
JWT_SECRET=your_generated_secret_here
```

For production, use AWS Systems Manager Parameter Store or Secrets Manager. 