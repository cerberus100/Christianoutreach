#!/usr/bin/env node

/**
 * Health Screening System - Setup Verification Script
 * 
 * This script checks if the development environment is properly configured
 * Run with: node scripts/setup-check.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Health Screening System - Setup Verification\n');

let hasErrors = false;
let warnings = [];

// Check if required files exist
const requiredFiles = [
  'package.json',
  'next.config.js',
  'tailwind.config.js',
  'tsconfig.json',
  'amplify.yml',
  '.gitignore',
  'env.example',
];

console.log('📁 Checking required files...');
requiredFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    hasErrors = true;
  }
});

// Check environment configuration
console.log('\n🔧 Checking environment configuration...');

const envExample = fs.existsSync('env.example');
const envLocal = fs.existsSync('.env.local');

if (envExample) {
  console.log('  ✅ env.example exists');
} else {
  console.log('  ❌ env.example missing');
  hasErrors = true;
}

if (envLocal) {
  console.log('  ✅ .env.local exists');
  
  // Check if critical environment variables are set
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const requiredEnvVars = [
    'JWT_SECRET',
    'AWS_REGION',
    'ARYA_AI_API_KEY',
  ];
  
  console.log('\n  🔑 Checking critical environment variables...');
  requiredEnvVars.forEach((envVar) => {
    const hasVar = envContent.includes(`${envVar}=`);
    const isEmpty = envContent.includes(`${envVar}=\n`) || envContent.includes(`${envVar}=$`);
    
    if (hasVar && !isEmpty) {
      console.log(`    ✅ ${envVar} is set`);
    } else {
      console.log(`    ⚠️  ${envVar} may not be properly configured`);
      warnings.push(`Set ${envVar} in .env.local`);
    }
  });
} else {
  console.log('  ⚠️  .env.local not found');
  warnings.push('Copy env.example to .env.local and configure your variables');
}

// Check package.json dependencies
console.log('\n📦 Checking package.json...');
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const criticalDependencies = [
    'next',
    'react',
    'typescript',
    '@aws-sdk/client-s3',
    '@aws-sdk/lib-dynamodb',
    'bcryptjs',
    'jsonwebtoken',
    'axios',
    'qrcode',
  ];
  
  criticalDependencies.forEach((dep) => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`  ✅ ${dep}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
      hasErrors = true;
    }
  });
} else {
  console.log('  ❌ package.json not found');
  hasErrors = true;
}

// Check TypeScript configuration
console.log('\n🔧 Checking TypeScript configuration...');
if (fs.existsSync('tsconfig.json')) {
  try {
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict) {
      console.log('  ✅ TypeScript strict mode enabled');
    } else {
      warnings.push('Consider enabling TypeScript strict mode for better type safety');
    }
  } catch (error) {
    console.log('  ⚠️  tsconfig.json format issue');
    warnings.push('Check tsconfig.json syntax');
  }
} else {
  console.log('  ❌ tsconfig.json not found');
  hasErrors = true;
}

// Check build configuration
console.log('\n🏗️  Checking build configuration...');
if (fs.existsSync('next.config.js')) {
  console.log('  ✅ Next.js configuration exists');
} else {
  console.log('  ❌ next.config.js missing');
  hasErrors = true;
}

if (fs.existsSync('amplify.yml')) {
  console.log('  ✅ AWS Amplify configuration exists');
} else {
  console.log('  ❌ amplify.yml missing');
  hasErrors = true;
}

// Check GitHub configuration
console.log('\n📋 Checking GitHub configuration...');
if (fs.existsSync('.github/workflows')) {
  console.log('  ✅ GitHub Actions workflows configured');
} else {
  console.log('  ⚠️  GitHub Actions not configured');
  warnings.push('GitHub Actions workflows not found');
}

if (fs.existsSync('.gitignore')) {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  if (gitignoreContent.includes('.env') && gitignoreContent.includes('node_modules')) {
    console.log('  ✅ .gitignore properly configured');
  } else {
    warnings.push('Check .gitignore configuration');
  }
} else {
  console.log('  ❌ .gitignore missing');
  hasErrors = true;
}

// Check documentation
console.log('\n📚 Checking documentation...');
const docFiles = ['README.md', 'SECURITY.md', 'DEPLOYMENT.md', 'DEVELOPMENT.md'];
docFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  ${file} missing`);
    warnings.push(`Create ${file} for better project documentation`);
  }
});

// Summary
console.log('\n📊 Setup Verification Summary');
console.log('================================');

if (hasErrors) {
  console.log('❌ Setup has ERRORS that need to be fixed before deployment');
  process.exit(1);
} else {
  console.log('✅ Setup verification passed!');
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings (recommended improvements):');
  warnings.forEach((warning, index) => {
    console.log(`   ${index + 1}. ${warning}`);
  });
}

console.log('\n🚀 Next steps:');
console.log('   1. Run: npm install');
console.log('   2. Configure .env.local with your credentials');
console.log('   3. Run: npm run dev');
console.log('   4. Test the application at http://localhost:3000');
console.log('   5. Deploy using the instructions in DEPLOYMENT.md');

console.log('\n📖 Documentation:');
console.log('   • Deployment: DEPLOYMENT.md');
console.log('   • Security: SECURITY.md');
console.log('   • Development: DEVELOPMENT.md');

console.log('\n✨ Happy coding!\n'); 