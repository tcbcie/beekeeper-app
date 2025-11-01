#!/usr/bin/env node
/**
 * Automatic Version Updater for Hive Craic
 *
 * This script updates the version number and date across all application files:
 * 1. Login page (src/app/login/page.tsx)
 * 2. Dashboard page (src/app/dashboard/page.tsx)
 * 3. About page changelog (src/app/dashboard/about/page.tsx)
 *
 * Usage:
 *   node scripts/update-version.mjs <version> [date]
 *
 * Examples:
 *   node scripts/update-version.mjs 1.0.12
 *   node scripts/update-version.mjs 1.0.12 "November 15, 2025"
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Get version and date from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Error: Version number required');
  console.log('Usage: node scripts/update-version.mjs <version> [date]');
  console.log('Example: node scripts/update-version.mjs 1.0.12 "November 15, 2025"');
  process.exit(1);
}

const newVersion = args[0];
const newDate = args[1] || new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

console.log(`\n🔄 Updating version to v${newVersion} (${newDate})\n`);

// Read version.json to get current version
const versionFile = join(ROOT_DIR, 'version.json');
let versionData;
try {
  versionData = JSON.parse(readFileSync(versionFile, 'utf8'));
} catch (error) {
  console.error('❌ Error reading version.json:', error.message);
  process.exit(1);
}

const oldVersion = versionData.version;
const oldDate = versionData.date;

// Update version.json
versionData.version = newVersion;
versionData.date = newDate;
writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
console.log(`✅ Updated version.json: v${oldVersion} → v${newVersion}`);

// File update configurations
const files = [
  {
    path: join(ROOT_DIR, 'src/app/login/page.tsx'),
    updates: [
      {
        search: /(<span className="px-2 py-1 bg-amber-50 text-amber-700 rounded font-medium">)v[\d.]+(<\/span>)/,
        replace: `$1v${newVersion}$2`,
        description: 'Login page version badge'
      },
      {
        search: /(<span>)[^<]*(\d{4})<\/span>/,
        replace: `$1${newDate}</span>`,
        description: 'Login page date'
      }
    ]
  },
  {
    path: join(ROOT_DIR, 'src/app/dashboard/page.tsx'),
    updates: [
      {
        search: /(<span className="font-bold text-indigo-700">)v[\d.]+(<\/span>)/,
        replace: `$1v${newVersion}$2`,
        description: 'Dashboard version display'
      },
      {
        search: /(<span className="font-semibold text-blue-700">)[^<]*(<\/span>)/,
        replace: `$1${newDate}$2`,
        description: 'Dashboard date display'
      }
    ]
  },
  {
    path: join(ROOT_DIR, 'src/app/dashboard/about/page.tsx'),
    updates: [
      {
        search: /(<span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded font-semibold">)v[\d.]+(<\/span>)/,
        replace: `$1v${newVersion}$2`,
        description: 'About page latest version badge'
      },
      {
        search: /(bg-emerald-100 text-emerald-800[^>]*>v[\d.]+<\/span>\s+)[^<\n]*(\d{4})/,
        replace: `$1${newDate}`,
        description: 'About page latest version date'
      }
    ]
  }
];

// Process each file
let totalUpdates = 0;
for (const file of files) {
  try {
    let content = readFileSync(file.path, 'utf8');
    let fileUpdates = 0;

    for (const update of file.updates) {
      const before = content;
      content = content.replace(update.search, update.replace);

      if (content !== before) {
        fileUpdates++;
        console.log(`  ✓ ${update.description}`);
      } else {
        console.log(`  ⚠️  Pattern not found: ${update.description}`);
      }
    }

    if (fileUpdates > 0) {
      writeFileSync(file.path, content, 'utf8');
      totalUpdates += fileUpdates;
      console.log(`✅ Updated ${file.path.split('/').pop()}: ${fileUpdates} change(s)\n`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${file.path}:`, error.message);
  }
}

console.log(`\n✨ Version update complete!`);
console.log(`   Total changes: ${totalUpdates}`);
console.log(`   Version: v${oldVersion} → v${newVersion}`);
console.log(`   Date: ${oldDate} → ${newDate}`);
console.log(`\n📝 Don't forget to:`);
console.log(`   1. Update the changelog in src/app/dashboard/about/page.tsx`);
console.log(`   2. Commit the changes with: git add . && git commit -m "Update to v${newVersion}"`);
console.log(`   3. Tag the release: git tag v${newVersion}`);
console.log(``);
