#!/usr/bin/env node

import { execSync } from 'child_process';

try {
  // Check if versions are consistent
  execSync('node scripts/check-versions.js', { stdio: 'inherit' });
  console.log('✅ Version check passed - proceeding with commit');
} catch (error) {
  console.error('❌ Version check failed - commit blocked');
  console.error('Please fix version inconsistencies before committing.');
  process.exit(1);
}
