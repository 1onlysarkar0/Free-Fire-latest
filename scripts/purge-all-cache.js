// scripts/purge-all-cache.js
const fs = require('fs');
const path = require('path');

const cachePath = path.join(__dirname, '..', '.next', 'cache');

console.log('Purging Next.js cache directory...');

try {
  if (fs.existsSync(cachePath)) {
    fs.rmSync(cachePath, { recursive: true, force: true });
    console.log('✓ Next.js cache directory (.next/cache) deleted successfully.');
  } else {
    console.log('Next.js cache directory (.next/cache) does not exist (already clean).');
  }
} catch (error) {
  console.error('Failed to purge Next.js cache directory:', error.message);
  process.exit(1);
}
