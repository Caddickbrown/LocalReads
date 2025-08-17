#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/release.js <new-version>');
  console.error('Example: node scripts/release.js 0.6.12');
  process.exit(1);
}

const newVersion = args[0];

// Validate version format (simple check)
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Error: Version must be in format X.Y.Z (e.g., 0.6.12)');
  process.exit(1);
}

// Check if we're in a git repository
try {
  execSync('git rev-parse --git-dir', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Error: Not in a git repository');
  process.exit(1);
}

// Check if there are uncommitted changes
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    console.error('❌ Error: You have uncommitted changes. Please commit or stash them before releasing.');
    console.error('Uncommitted changes:');
    console.error(status);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error checking git status:', error.message);
  process.exit(1);
}

console.log(`🚀 Starting release process for version ${newVersion}...\n`);

// Files to update with version numbers
const files = [
  { path: 'src-tauri/tauri.conf.json', pattern: /"version":\s*"[^"]*"/, replacement: `"version": "${newVersion}"` },
  { path: 'package.json', pattern: /"version":\s*"[^"]*"/, replacement: `"version": "${newVersion}"` },
  { path: 'src-tauri/Cargo.toml', pattern: /version\s*=\s*"[^"]*"/, replacement: `version = "${newVersion}"` },
  { path: 'src/components/Settings.tsx', pattern: /version: '[^']*'/, replacement: `version: '${newVersion}'`, useStringReplace: true }
];

let updatedCount = 0;

// Update version numbers in files
console.log('📝 Updating version numbers...');
files.forEach(file => {
  try {
    const content = fs.readFileSync(file.path, 'utf8');
    let newContent;
    
    if (file.useStringReplace) {
      // Use simple string replacement for Settings.tsx
      const currentVersion = content.match(/version:\s*'([^']*)'/)?.[1];
      if (currentVersion) {
        const searchStr = 'version: \'' + currentVersion + '\'';
        const replaceStr = 'version: \'' + newVersion + '\'';
        newContent = content.replace(searchStr, replaceStr);
      } else {
        newContent = content;
      }
    } else {
      // Use regex replacement for other files
      newContent = content.replace(file.pattern, file.replacement);
    }
    
    if (content !== newContent) {
      fs.writeFileSync(file.path, newContent, 'utf8');
      console.log(`✅ Updated ${file.path} to version ${newVersion}`);
      updatedCount++;
    } else {
      console.log(`ℹ️  No changes needed in ${file.path}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${file.path}:`, error.message);
    process.exit(1);
  }
});

if (updatedCount === 0) {
  console.log('\n⚠️  No files were updated. Check if the version format is correct.');
  process.exit(1);
}

console.log(`\n✅ Successfully updated ${updatedCount} files to version ${newVersion}`);

// Clear build cache
console.log('\n🧹 Clearing build cache...');
try {
  // Remove common build directories
  const buildDirs = ['dist/', 'build/', 'src-tauri/target/', '.tauri/'];
  buildDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Removed ${dir}`);
    }
  });
  
  // Remove common cache files
  const cacheFiles = ['.vite/', 'node_modules/.cache/', '*.tsbuildinfo'];
  cacheFiles.forEach(pattern => {
    if (pattern.includes('*')) {
      // Handle glob patterns
      const files = fs.readdirSync('.').filter(file => file.includes(pattern.replace('*', '')));
      files.forEach(file => {
        if (fs.existsSync(file)) {
          fs.rmSync(file, { recursive: true, force: true });
          console.log(`✅ Removed ${file}`);
        }
      });
    } else if (fs.existsSync(pattern)) {
      fs.rmSync(pattern, { recursive: true, force: true });
      console.log(`✅ Removed ${pattern}`);
    }
  });
  
  console.log('✅ Build cache cleared successfully');
} catch (error) {
  console.warn(`⚠️  Warning: Some cache files could not be removed: ${error.message}`);
  console.log('Continuing with release process...');
}

// Git operations
try {
  console.log('\n🔧 Committing version changes...');
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
  
  console.log('\n🏷️  Creating git tag...');
  execSync(`git tag -a v${newVersion} -m "Release version ${newVersion}"`, { stdio: 'inherit' });
  
  console.log('\n📤 Pushing changes and tag to remote...');
  execSync('git push', { stdio: 'inherit' });
  execSync(`git push origin v${newVersion}`, { stdio: 'inherit' });
  
  console.log(`\n🎉 Successfully released version ${newVersion}!`);
  console.log('\nWhat was done:');
  console.log(`1. ✅ Updated version numbers in ${updatedCount} files`);
  console.log('2. ✅ Cleared build cache');
  console.log('3. ✅ Committed changes to git');
  console.log(`4. ✅ Created git tag v${newVersion}`);
  console.log('5. ✅ Pushed changes to remote repository');
  console.log(`6. ✅ Pushed tag v${newVersion} to remote repository`);
  
} catch (error) {
  console.error('\n❌ Error during git operations:', error.message);
  console.error('\nThe version files were updated, but git operations failed.');
  console.error('You may need to manually commit and tag the changes.');
  process.exit(1);
}
