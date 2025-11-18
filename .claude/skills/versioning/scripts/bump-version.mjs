#!/usr/bin/env node
/**
 * Automatic Version Bumper for Hive Craic
 *
 * This script automatically increments the version number (patch version by default)
 * and updates all application files.
 *
 * Usage:
 *   node scripts/bump-version.mjs [major|minor|patch]
 *
 * Examples:
 *   node scripts/bump-version.mjs          # Bumps patch: 1.0.11 → 1.0.12
 *   node scripts/bump-version.mjs patch    # Bumps patch: 1.0.11 → 1.0.12
 *   node scripts/bump-version.mjs minor    # Bumps minor: 1.0.11 → 1.1.0
 *   node scripts/bump-version.mjs major    # Bumps major: 1.0.11 → 2.0.0
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Get bump type from command line (default: patch)
const bumpType = process.argv[2] || 'patch';
if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error(`❌ Error: Invalid bump type "${bumpType}"`);
  console.log('Valid options: major, minor, patch');
  process.exit(1);
}

// Read current version
const versionFile = join(ROOT_DIR, 'version.json');
if (!existsSync(versionFile)) {
  console.error('❌ Error: version.json not found');
  process.exit(1);
}

const versionData = JSON.parse(readFileSync(versionFile, 'utf8'));
const oldVersion = versionData.version;

// Parse version
const parts = oldVersion.split('.').map(Number);
if (parts.length !== 3 || parts.some(isNaN)) {
  console.error(`❌ Error: Invalid version format "${oldVersion}". Expected format: X.Y.Z`);
  process.exit(1);
}

let [major, minor, patch] = parts;

// Bump version
switch (bumpType) {
  case 'major':
    major++;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor++;
    patch = 0;
    break;
  case 'patch':
    patch++;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;

// Generate date
const newDate = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

console.log(`\n📦 Bumping ${bumpType} version: v${oldVersion} → v${newVersion}\n`);

// Call update-version script
try {
  execSync(`node "${join(__dirname, 'update-version.mjs')}" ${newVersion} "${newDate}"`, {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });

  console.log(`\n✨ Version bumped successfully!`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Update changelog in src/app/dashboard/about/page.tsx`);
  console.log(`   2. Review the changes: git diff`);
  console.log(`   3. Commit: git add . && git commit -m "Update to v${newVersion}"`);
  console.log(`   4. Tag: git tag v${newVersion}`);
  console.log(`   5. Push: git push && git push --tags`);
  console.log(``);
} catch (error) {
  console.error('❌ Error bumping version:', error.message);
  process.exit(1);
}
