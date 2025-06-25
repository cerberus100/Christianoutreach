#!/usr/bin/env node

/**
 * AWS Amplify Deployment Verification Script
 * Checks if the project is ready for Amplify deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 AWS Amplify Deployment Check\n');

// Check required files
const requiredFiles = [
  'package.json',
  'next.config.js',
  'amplify.yml',
  'pages/_app.tsx',
  'pages/index.tsx'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    process.exit(1);
  }
});

// Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['build', 'start'];

requiredScripts.forEach(script => {
  if (packageJson.scripts && packageJson.scripts[script]) {
    console.log(`  ✅ ${script}: ${packageJson.scripts[script]}`);
  } else {
    console.log(`  ❌ ${script} script - MISSING`);
    process.exit(1);
  }
});

// Check amplify.yml configuration
console.log('\n⚙️  Checking amplify.yml configuration...');
const amplifyYml = fs.readFileSync('amplify.yml', 'utf8');

if (amplifyYml.includes('backend:')) {
  console.log('  ❌ Backend configuration found - this should be frontend-only');
  console.log('  ℹ️  Remove the backend section from amplify.yml');
  process.exit(1);
} else {
  console.log('  ✅ Frontend-only configuration');
}

if (amplifyYml.includes('npm run build')) {
  console.log('  ✅ Build command configured');
} else {
  console.log('  ❌ Build command not found in amplify.yml');
  process.exit(1);
}

// Check environment variables (warnings only)
console.log('\n🔧 Environment variables check...');
const requiredEnvVars = [
  'JWT_SECRET',
  'AWS_REGION',
  'ARYA_AI_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'DYNAMODB_TABLE_PREFIX',
  'S3_BUCKET'
];

console.log('  ⚠️  Make sure these are set in Amplify Console:');
requiredEnvVars.forEach(envVar => {
  console.log(`     - ${envVar}`);
});

// Check for API routes
console.log('\n🛠️  Checking API routes...');
const apiDir = 'pages/api';
if (fs.existsSync(apiDir)) {
  const apiFiles = fs.readdirSync(apiDir, { recursive: true })
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
  console.log(`  ✅ Found ${apiFiles.length} API routes`);
  console.log('  ℹ️  This app requires server-side rendering on Amplify');
} else {
  console.log('  ℹ️  No API routes found - could use static export');
}

// Check Next.js configuration
console.log('\n⚛️  Checking Next.js configuration...');
try {
  const nextConfig = require('../next.config.js');
  if (nextConfig.trailingSlash !== undefined) {
    console.log(`  ✅ trailingSlash: ${nextConfig.trailingSlash}`);
  }
  if (nextConfig.images && nextConfig.images.domains) {
    console.log(`  ✅ Image domains configured: ${nextConfig.images.domains.join(', ')}`);
  }
  console.log('  ✅ Next.js configuration looks good');
} catch (error) {
  console.log('  ❌ Error reading next.config.js:', error.message);
  process.exit(1);
}

console.log('\n🎉 Deployment check completed successfully!');
console.log('\n📋 Next steps:');
console.log('  1. Commit and push your changes');
console.log('  2. Set environment variables in Amplify Console');
console.log('  3. Configure custom domain (optional)');
console.log('  4. Set up monitoring and alerts');

console.log('\n🔗 Useful links:');
console.log('  • Amplify Console: https://console.aws.amazon.com/amplify/');
console.log('  • Next.js on Amplify: https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html');
console.log('  • Environment Variables: https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html'); 