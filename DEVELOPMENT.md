# Development Guide - Health Screening System

Based on [SmartBear's Code Review Best Practices](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/) and [Debug-Friendly Programming](https://medium.com/eureka-engineering/code-review-and-debug-friendly-programming-6956f2f42f30).

## 📊 Code Review Metrics

Following SmartBear's research, we aim for:
- **200-400 lines of code** per review session
- **500 LOC per hour** maximum review speed  
- **60 minutes maximum** per review session
- **70-90% defect discovery** rate target

## 🔍 Code Review Checklist

### Security & Authentication
- [ ] JWT tokens properly validated
- [ ] Input sanitization implemented
- [ ] File upload limits enforced
- [ ] Environment variables used for secrets
- [ ] Error messages don't leak sensitive info

### Error Handling
- [ ] All API routes have try-catch blocks
- [ ] User-friendly error messages
- [ ] Proper HTTP status codes
- [ ] Errors logged for debugging
- [ ] Graceful fallbacks implemented

### TypeScript Quality
- [ ] No `any` types (use `unknown` instead)
- [ ] Proper interface definitions
- [ ] Type-only imports where needed
- [ ] Consistent naming conventions
- [ ] JSDoc comments for complex functions

### Performance
- [ ] Image compression and size limits
- [ ] Database queries optimized
- [ ] Proper caching headers
- [ ] Loading states implemented
- [ ] Error boundaries in place

## 🐛 Debug-Friendly Programming

### Strategic Linebreaks
Following the Medium article, we use linebreaks for better debugging:

```typescript
// ✅ Good - Easy to set breakpoints
if (formData.firstName && 
    formData.lastName && 
    formData.dateOfBirth) {
  // Process valid data
}

// ❌ Avoid - Hard to debug specific conditions
if (formData.firstName && formData.lastName && formData.dateOfBirth) {
  // Process valid data
}
```

### Meaningful Variable Names
```typescript
// ✅ Good - Self-documenting
const isValidHealthData = validateHealthResponses(formData);
const userConsentsToFollowUp = formData.consentFollowup;

// ❌ Avoid - Unclear purpose
const valid = check(data);
const consent = data.c;
```

### Generous Console Logging
```typescript
// ✅ Good - Contextual debugging
console.log('Processing submission for church:', churchId);
console.log('AI analysis result:', { success: aiAnalysis.success, bmi: aiAnalysis.bmi });

// ❌ Avoid - Vague logging
console.log('Processing...');
console.log(result);
```

## 🏗️ Architecture Patterns

### API Route Structure
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 2. Authentication check
  if (!verifyAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // 3. Input validation
    const validatedData = validateInput(req.body);
    
    // 4. Business logic
    const result = await processData(validatedData);
    
    // 5. Success response
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    // 6. Error handling
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
```

### Component Structure
```typescript
export default function MyComponent({ prop1, prop2 }: Props) {
  // 1. State declarations
  const [loading, setLoading] = useState(false);
  
  // 2. Form handling
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  // 3. Effect hooks
  useEffect(() => {
    // Side effects
  }, []);
  
  // 4. Event handlers
  const handleSubmit = async (data: FormData) => {
    // Implementation
  };
  
  // 5. Render logic
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

## 📝 Documentation Standards

### Function Documentation
```typescript
/**
 * Analyzes a selfie photo using Arya.ai API for BMI estimation
 * @param imageBuffer - Raw image data as Buffer
 * @param mimeType - Image MIME type (image/jpeg, image/png)
 * @returns Promise<AryaAIResponse> - AI analysis results including BMI, age, gender
 * @throws Error when API request fails or image is invalid
 */
async analyzeSelfie(imageBuffer: Buffer, mimeType: string): Promise<AryaAIResponse>
```

### Component Documentation
```typescript
interface HealthScreeningFormProps {
  /** Unique identifier for the church/outreach location */
  churchId: string;
  /** Display name of the church for user context */
  churchName: string;
  /** Callback fired when form submission succeeds */
  onSuccess?: (submissionId: string) => void;
}
```

## 🧪 Testing Guidelines

### Unit Test Structure
```typescript
describe('HealthRiskAssessment', () => {
  it('should calculate high risk for obese BMI with family history', () => {
    const result = assessHealthRisk(35, true, true, false, true);
    
    expect(result.riskLevel).toBe('High');
    expect(result.riskScore).toBeGreaterThan(6);
    expect(result.recommendations).toContain('Consider weight management programs');
  });
});
```

### Integration Test Coverage
- [ ] Form submission end-to-end
- [ ] Admin authentication flow
- [ ] File upload and storage
- [ ] QR code generation
- [ ] Data export functionality

## 🔧 Development Workflow

### Before Committing
1. **Run build check**: `npm run build`
2. **Run linter**: `npm run lint`
3. **Check TypeScript**: `npm run type-check`
4. **Test critical paths**: Manual testing of forms
5. **Review environment vars**: Check all required vars are documented

### Code Review Focus Areas
1. **Security**: Authentication, input validation, error handling
2. **Performance**: Loading states, image optimization, caching
3. **UX**: Error messages, form validation, responsive design
4. **Maintainability**: Type safety, documentation, naming

### Git Commit Messages
```
feat: add QR code generation for outreach locations
fix: resolve TypeScript error in FormData import
docs: update security guidelines for production
refactor: improve error handling in submission API
test: add unit tests for health risk assessment
```

## 📊 Performance Monitoring

### Key Metrics to Track
- Form submission success rate
- Image upload completion time
- AI analysis response time
- Admin dashboard load time
- Mobile form usability scores

### Error Tracking
- API endpoint error rates
- Form validation failures
- Authentication failures
- File upload errors
- AI service timeouts

## 🚀 Deployment Checklist

### Pre-Production
- [ ] Security review completed
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Performance testing done
- [ ] Error monitoring setup
- [ ] Backup strategy implemented

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring dashboards active
- [ ] Error rates within acceptable limits
- [ ] User acceptance testing completed
- [ ] Documentation updated 