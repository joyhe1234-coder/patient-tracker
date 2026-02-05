/**
 * Cross-platform script to copy config files to dist folder after TypeScript build.
 * This ensures JSON config files (like import system configs) are available at runtime.
 *
 * Works on: Linux, Windows, macOS
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use path.join() for cross-platform path handling
const srcDir = path.join(__dirname, '..', 'src', 'config');
const destDir = path.join(__dirname, '..', 'dist', 'config');

/**
 * Recursively copy a directory and its contents
 * @param {string} src - Source directory path
 * @param {string} dest - Destination directory path
 * @returns {number} - Number of files copied
 */
function copyDir(src, dest) {
  let filesCopied = 0;

  // Create destination directory (recursive handles nested paths)
  fs.mkdirSync(dest, { recursive: true });

  // Read all items in source directory
  const items = fs.readdirSync(src);

  for (const item of items) {
    // Use path.join for cross-platform path construction
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      // Recursively copy subdirectories
      filesCopied += copyDir(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
      // Use path.relative for cleaner output
      const relativeSrc = path.relative(process.cwd(), srcPath);
      const relativeDest = path.relative(process.cwd(), destPath);
      console.log(`  ${relativeSrc} -> ${relativeDest}`);
      filesCopied++;
    }
  }

  return filesCopied;
}

// Main execution
try {
  console.log('Copying config files to dist...');
  console.log(`  Source: ${path.relative(process.cwd(), srcDir) || srcDir}`);
  console.log(`  Dest:   ${path.relative(process.cwd(), destDir) || destDir}`);
  console.log('');

  // Check if source directory exists
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: Source directory not found: ${srcDir}`);
    process.exit(1);
  }

  // Check if dist directory exists (should be created by tsc)
  const distRoot = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distRoot)) {
    console.error(`Error: dist directory not found. Run 'tsc' first.`);
    process.exit(1);
  }

  const count = copyDir(srcDir, destDir);
  console.log('');
  console.log(`Config files copied successfully (${count} files).`);
  process.exit(0);
} catch (error) {
  console.error('Error copying config files:', error.message);
  process.exit(1);
}
