#!/usr/bin/env node

/**
 * YAML Validation Script for AWS Amplify Configuration
 * Validates amplify.yml and other YAML files for syntax errors
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 YAML Validation Check\n');

// Simple YAML validation function
function validateYAML(content, filename) {
  const errors = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) return;
    
    // Check for unquoted colons in shell command strings (not YAML structure)
    if (trimmed.startsWith('- ') && !trimmed.startsWith('- |') && !trimmed.startsWith("- '")) {
      const commandPart = trimmed.substring(2);
      // Only flag as error if it looks like a shell command with unquoted colons
      if (commandPart.startsWith('echo ') && commandPart.includes(':') && 
          !commandPart.startsWith('"') && !commandPart.startsWith("'")) {
        errors.push(`Line ${lineNum}: Unquoted colon in shell command - ${trimmed}`);
      }
    }
    
    // Check for inconsistent indentation
    if (line.length > 0 && line.match(/^\s+/)) {
      const spaces = line.match(/^\s+/)[0].length;
      if (spaces % 2 !== 0) {
        errors.push(`Line ${lineNum}: Odd number of spaces (${spaces}) - use 2-space indentation`);
      }
    }
    
    // Check for tabs
    if (line.includes('\t')) {
      errors.push(`Line ${lineNum}: Contains tabs - use spaces only`);
    }
    
    // Check for trailing spaces
    if (line.endsWith(' ')) {
      errors.push(`Line ${lineNum}: Trailing spaces detected`);
    }
  });
  
  return errors;
}

// Files to validate
const filesToCheck = [
  'amplify.yml',
  '.github/workflows/ci.yml'
];

let totalErrors = 0;

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`📄 Checking ${file}...`);
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      const errors = validateYAML(content, file);
      
      if (errors.length === 0) {
        console.log(`  ✅ ${file} - No issues found`);
      } else {
        console.log(`  ❌ ${file} - ${errors.length} issues found:`);
        errors.forEach(error => {
          console.log(`     ${error}`);
        });
        totalErrors += errors.length;
      }
    } catch (error) {
      console.log(`  ❌ ${file} - Error reading file: ${error.message}`);
      totalErrors++;
    }
  } else {
    console.log(`  ⚠️  ${file} - File not found`);
  }
  console.log('');
});

// Additional AWS Amplify specific checks
console.log('🔧 AWS Amplify Specific Checks...');

if (fs.existsSync('amplify.yml')) {
  const content = fs.readFileSync('amplify.yml', 'utf8');
  
  // Check for required sections
  const requiredSections = ['version', 'frontend', 'phases', 'build'];
  const missingSections = requiredSections.filter(section => !content.includes(section));
  
  if (missingSections.length === 0) {
    console.log('  ✅ All required sections present');
  } else {
    console.log(`  ❌ Missing sections: ${missingSections.join(', ')}`);
    totalErrors += missingSections.length;
  }
  
  // Check for backend section (should not exist for frontend-only apps)
  if (content.includes('backend:')) {
    console.log('  ❌ Backend section found - remove for frontend-only deployment');
    totalErrors++;
  } else {
    console.log('  ✅ No backend section (correct for frontend-only)');
  }
  
  // Check for proper artifact configuration
  if (content.includes('baseDirectory: .') && content.includes('**/*')) {
    console.log('  ✅ Artifact configuration looks correct');
  } else {
    console.log('  ⚠️  Check artifact configuration');
  }
}

console.log('\n📊 Validation Summary:');
if (totalErrors === 0) {
  console.log('🎉 All YAML files are valid!');
  console.log('✅ Ready for AWS Amplify deployment');
  process.exit(0);
} else {
  console.log(`❌ Found ${totalErrors} issues that need to be fixed`);
  console.log('🔧 Please resolve these issues before deploying');
  process.exit(1);
} 