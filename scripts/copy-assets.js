import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Copying frontend assets to app bundle...');

const distDir = path.join(__dirname, '..', 'dist');
const bundleDir = path.join(__dirname, '..', 'src-tauri', 'target', 'release', 'bundle', 'macos', 'LocalReads.app', 'Contents', 'Resources');

if (!fs.existsSync(distDir)) {
  console.error('❌ Dist directory not found:', distDir);
  process.exit(1);
}

if (!fs.existsSync(bundleDir)) {
  console.error('❌ Bundle directory not found:', bundleDir);
  process.exit(1);
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied: ${item}`);
    }
  }
}

try {
  copyDir(distDir, bundleDir);
  console.log('✅ Frontend assets copied successfully!');
} catch (error) {
  console.error('❌ Error copying assets:', error);
  process.exit(1);
}
