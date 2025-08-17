#!/usr/bin/env node

import fs from 'fs';

const files = [
  { path: 'src-tauri/tauri.conf.json', name: 'Tauri Config' },
  { path: 'package.json', name: 'Package.json' },
  { path: 'src-tauri/Cargo.toml', name: 'Cargo.toml' }
];

function extractVersion(content, fileType) {
  if (fileType === 'Cargo.toml') {
    const match = content.match(/version\s*=\s*"([^"]*)"/);
    return match ? match[1] : null;
  } else {
    const match = content.match(/"version":\s*"([^"]*)"/);
    return match ? match[1] : null;
  }
}

function checkVersions() {
  const versions = [];
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      const version = extractVersion(content, file.name);
      if (version) {
        versions.push({ file: file.name, version });
      } else {
        console.error(`❌ Could not extract version from ${file.name}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error reading ${file.path}:`, error.message);
      process.exit(1);
    }
  });
  
  const uniqueVersions = [...new Set(versions.map(v => v.version))];
  
  if (uniqueVersions.length === 1) {
    console.log(`✅ All versions are consistent: ${uniqueVersions[0]}`);
    versions.forEach(v => console.log(`   ${v.file}: ${v.version}`));
  } else {
    console.error('❌ Version mismatch detected:');
    versions.forEach(v => console.error(`   ${v.file}: ${v.version}`));
    console.error('\nRun "npm run version <new-version>" to fix this.');
    process.exit(1);
  }
}

checkVersions();
