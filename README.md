# Health Screening System

A comprehensive health screening and CRM system designed for church outreach programs to fight diabetes and other health conditions in the community.

## 🌟 Features

### 📱 Mobile-Optimized Health Screening Form
- **QR Code Access**: Each church gets a unique QR code for easy access
- **Multi-Step Form**: Professional, trust-building form with progress tracking
- **Camera Integration**: Waist-up selfie capture for AI analysis
- **Health Questions**: Comprehensive family history and symptom screening
- **Consent Management**: HIPAA-compliant consent collection

### 🤖 AI-Powered Health Analysis
- **Arya.ai Integration**: BMI estimation from facial photos
- **Risk Assessment**: Automated health risk scoring based on multiple factors
- **Demographics**: Age and gender estimation from photos
- **Recommendations**: Personalized health recommendations

### 📊 Professional Admin Dashboard
- **Real-time Analytics**: Comprehensive health screening statistics
- **Data Visualization**: Charts for risk distribution, BMI analysis, demographics
- **Outreach Location Tracking**: Monitor performance across multiple churches
- **Follow-up Management**: Track contact status and next steps

### 🔒 Security & Compliance
- **JWT Authentication**: Secure admin access
- **Data Encryption**: All data encrypted in transit and at rest
- **AWS Integration**: Enterprise-grade cloud infrastructure
- **HIPAA Considerations**: Privacy-focused design

### 📈 Data Management
- **CSV Export**: Complete data export functionality
- **Lead Journey Tracking**: Follow prospect from initial screening to outcome
- **Custom Forms**: Future support for church-specific form customization
- **Reporting**: Comprehensive analytics and reporting

## 🏗️ Architecture

### Frontend
- **Next.js 14**: React framework with server-side rendering
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Professional healthcare-focused styling
- **React Hook Form**: Form validation and management
- **Recharts**: Data visualization

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **AWS DynamoDB**: NoSQL database for submissions and user data
- **AWS S3**: Secure file storage for selfie photos
- **Arya.ai API**: AI-powered health analysis

### Authentication
- **JWT Tokens**: Secure admin authentication
- **bcryptjs**: Password hashing
- **Role-based Access**: Admin and viewer permissions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- AWS Account
- Arya.ai API Key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd health-screening-system
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=health-screening-photos
AWS_DYNAMODB_TABLE_NAME=health-screening-submissions
AWS_DYNAMODB_CHURCHES_TABLE=health-screening-churches
AWS_DYNAMODB_USERS_TABLE=health-screening-users

# Arya.ai API Configuration
ARYA_AI_API_KEY=your_arya_ai_api_key
ARYA_AI_BASE_URL=https://api.arya.ai

# JWT Secret
JWT_SECRET=your_secure_jwt_secret_here

# Admin Credentials
ADMIN_EMAIL=admin@yourchurch.org
ADMIN_PASSWORD=your_secure_admin_password
```

4. **Set up AWS resources**
```bash
# Create DynamoDB tables
aws dynamodb create-table \
  --table-name health-screening-submissions \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

aws dynamodb create-table \
  --table-name health-screening-churches \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

aws dynamodb create-table \
  --table-name health-screening-users \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create S3 bucket
aws s3 mb s3://health-screening-photos
```

5. **Run the development server**
```bash
npm run dev
```

6. **Access the application**
- Health Form: `http://localhost:3000/form/[churchId]`
- Admin Login: `http://localhost:3000/admin/login`
- Admin Dashboard: `http://localhost:3000/admin/dashboard`

## 📱 Usage

### For Church Administrators

1. **Generate QR Codes**: Each church gets a unique QR code linking to their form
2. **Share QR Code**: Display at events, print on materials, share digitally
3. **Monitor Dashboard**: Track submissions, analyze health trends, export data

### For Participants

1. **Scan QR Code**: Use phone camera to scan church's QR code
2. **Fill Form**: Complete personal information and health questions
3. **Take Selfie**: Capture waist-up photo for AI analysis
4. **Provide Consent**: Agree to follow-up communications
5. **Submit**: Receive confirmation and next steps

### Demo Credentials
- **Email**: admin@demo.org
- **Password**: demo123

## 🔧 Configuration

### Arya.ai Setup
1. Sign up at [Arya.ai](https://arya.ai)
2. Get API key for Face-to-BMI API
3. Add key to environment variables

### AWS Setup
1. Create AWS account
2. Set up IAM user with appropriate permissions
3. Create DynamoDB tables and S3 bucket
4. Configure environment variables

### Customization
- **Colors**: Edit `tailwind.config.js` for brand colors
- **Forms**: Modify form fields in `components/HealthScreeningForm.tsx`
- **Dashboard**: Customize metrics in `components/AdminDashboard.tsx`

## 📊 Data Flow

1. **Form Submission**: User fills form and uploads selfie
2. **File Storage**: Selfie uploaded to AWS S3
3. **AI Analysis**: Photo sent to Arya.ai for BMI/age/gender estimation
4. **Risk Assessment**: Health risk calculated based on responses + AI data
5. **Database Storage**: All data saved to DynamoDB
6. **Dashboard Update**: Real-time dashboard reflects new submission
7. **Follow-up**: Admin can track and manage follow-up communications

## 🚀 Deployment

### AWS Amplify (Recommended)
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize project
amplify init

# Deploy
amplify publish
```

### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔐 Security Considerations

### Data Protection
- All PII encrypted at rest
- Secure transmission via HTTPS
- Minimal data retention policy
- Access controls and audit logging

### Authentication
- JWT tokens with expiration
- Bcrypt password hashing
- Rate limiting on API endpoints
- CORS configuration

### AWS Security
- IAM roles with least privilege
- S3 bucket policies
- VPC configuration for production
- CloudTrail logging

## 📈 Analytics & Reporting

### Key Metrics
- Total submissions per location
- Health risk distribution
- BMI and age demographics
- Follow-up completion rates
- Conversion funnel analysis

### Export Options
- CSV export with custom date ranges
- Field selection for privacy compliance
- Automated reporting schedules
- Integration with external CRM systems

## 🛠️ Development

### Code Structure
```
├── components/          # React components
├── lib/                # Utilities and configurations
├── pages/              # Next.js pages and API routes
├── styles/             # CSS and styling
├── types/              # TypeScript type definitions
└── public/             # Static assets
```

### Key Components
- `HealthScreeningForm.tsx`: Main form component
- `AdminDashboard.tsx`: Dashboard with analytics
- `aws-config.ts`: AWS service configuration
- `arya-ai.ts`: AI integration service

### API Endpoints
- `POST /api/submissions`: Submit health screening
- `POST /api/admin/auth`: Admin authentication
- `GET /api/admin/dashboard`: Dashboard data
- `POST /api/admin/export`: Data export

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For technical support or questions:
- Create an issue in the repository
- Contact: support@healthscreening.org
- Documentation: [link to docs]

## 🔮 Roadmap

### Phase 2 Features
- [ ] Custom form builder for churches
- [ ] SMS/Email automation
- [ ] Mobile app version
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Integration with EHR systems

### Phase 3 Features
- [ ] Telemedicine integration
- [ ] Appointment scheduling
- [ ] Health coaching features
- [ ] Community health tracking
- [ ] Research data contribution

---

Built with ❤️ for community health initiatives 