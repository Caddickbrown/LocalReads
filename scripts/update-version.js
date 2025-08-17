#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/update-version.js <new-version>');
  console.error('Example: node scripts/update-version.js 0.6.11');
  process.exit(1);
}

const newVersion = args[0];

// Validate version format (simple check)
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Error: Version must be in format X.Y.Z (e.g., 0.6.11)');
  process.exit(1);
}

const files = [
  { path: 'src-tauri/tauri.conf.json', pattern: /"version":\s*"[^"]*"/, replacement: `"version": "${newVersion}"` },
  { path: 'package.json', pattern: /"version":\s*"[^"]*"/, replacement: `"version": "${newVersion}"` },
  { path: 'src-tauri/Cargo.toml', pattern: /version\s*=\s*"[^"]*"/, replacement: `version = "${newVersion}"` }
];

let updatedCount = 0;

files.forEach(file => {
  try {
    const content = fs.readFileSync(file.path, 'utf8');
    const newContent = content.replace(file.pattern, file.replacement);
    
    if (content !== newContent) {
      fs.writeFileSync(file.path, newContent, 'utf8');
      console.log(`✅ Updated ${file.path} to version ${newVersion}`);
      updatedCount++;
    } else {
      console.log(`ℹ️  No changes needed in ${file.path}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${file.path}:`, error.message);
  }
});

if (updatedCount > 0) {
  console.log(`\n🎉 Successfully updated ${updatedCount} files to version ${newVersion}`);
  console.log('\nNext steps:');
  console.log('1. Commit your changes');
  console.log('2. Build your application');
  console.log('3. Create a new release tag');
} else {
  console.log('\n⚠️  No files were updated. Check if the version format is correct.');
}
