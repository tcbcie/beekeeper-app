#!/usr/bin/env node
/**
 * Automatic Version Updater for Hive Craic
 *
 * This script updates the version number and date across all application files:
 * 1. version.json (central version registry)
 * 2. package.json (npm package version)
 * 3. public/service-worker.js (PWA cache name)
 * 4. public/manifest.json (PWA manifest version)
 * 5. Login page (src/app/login/page.tsx)
 * 6. Dashboard page (src/app/dashboard/page.tsx)
 * 7. About page (src/app/dashboard/about/page.tsx)
 *
 * Usage:
 *   node scripts/update-version.mjs <version> [date] [options]
 *
 * Examples:
 *   node scripts/update-version.mjs 1.0.12
 *   node scripts/update-version.mjs 1.0.12 "November 15, 2025"
 *   node scripts/update-version.mjs 1.0.12 --verify-only
 *   node scripts/update-version.mjs 1.0.12 --verbose
 *
 * Options:
 *   --verify-only    Check files without making changes
 *   --verbose        Show detailed output
 *   --backup         Create backup files before updating
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify-only');
const verbose = args.includes('--verbose');
const createBackup = args.includes('--backup');

// Filter out flags to get positional arguments
const positionalArgs = args.filter(arg => !arg.startsWith('--'));

if (positionalArgs.length === 0) {
  console.error('❌ Error: Version number required\n');
  console.log('📖 Usage:');
  console.log('   node scripts/update-version.mjs <version> [date] [options]\n');
  console.log('📝 Examples:');
  console.log('   node scripts/update-version.mjs 1.0.12');
  console.log('   node scripts/update-version.mjs 1.0.12 "November 15, 2025"');
  console.log('   node scripts/update-version.mjs 1.0.12 --verify-only\n');
  console.log('⚙️  Options:');
  console.log('   --verify-only    Check patterns without updating');
  console.log('   --verbose        Show detailed information');
  console.log('   --backup         Create .backup files before updating');
  process.exit(1);
}

const newVersion = positionalArgs[0];
const newDate = positionalArgs[1] || new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

// Validate version format
const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
if (!versionRegex.test(newVersion)) {
  console.error(`❌ Error: Invalid version format "${newVersion}"`);
  console.log('\n📖 Valid formats:');
  console.log('   • 1.0.12 (standard)');
  console.log('   • 1.1.0-beta.1 (pre-release)');
  console.log('   • 2.0.0-rc.1 (release candidate)');
  process.exit(1);
}

// Display operation info
console.log('\n╔════════════════════════════════════════╗');
console.log('║      Version Update Operation          ║');
console.log('╚════════════════════════════════════════╝\n');
console.log(`📊 Target Version: v${newVersion}`);
console.log(`📅 Date:           ${newDate}`);
console.log(`🔍 Mode:           ${verifyOnly ? 'VERIFY ONLY' : 'UPDATE'}`);
if (createBackup) console.log('💾 Backup:         ENABLED');
console.log('');

// Read version.json to get current version
const versionFile = join(ROOT_DIR, 'version.json');
let versionData;
let oldVersion = 'unknown';
let oldDate = 'unknown';

try {
  if (!existsSync(versionFile)) {
    console.log('⚠️  Warning: version.json not found');
    console.log('   Will create new file\n');
    versionData = { version: '0.0.0', date: '' };
  } else {
    versionData = JSON.parse(readFileSync(versionFile, 'utf8'));
    oldVersion = versionData.version || 'unknown';
    oldDate = versionData.date || 'unknown';
  }
} catch (error) {
  console.error('❌ Error reading version.json:', error.message);
  console.log('   File may contain invalid JSON');
  process.exit(1);
}

// File update configurations
const files = [
  {
    name: 'Package.json',
    path: join(ROOT_DIR, 'package.json'),
    updates: [
      {
        search: /("version":\s*")[\d.]+(-[a-zA-Z0-9.]+)?(")/,
        replace: `$1${newVersion}$3`,
        description: 'Package version'
      }
    ]
  },
  {
    name: 'Service Worker',
    path: join(ROOT_DIR, 'public/service-worker.js'),
    updates: [
      {
        search: /(const CACHE_NAME = ['"])hivecraic-v[\d.]+(-[a-zA-Z0-9.]+)?(['"])/,
        replace: `$1hivecraic-v${newVersion}$3`,
        description: 'PWA cache name'
      }
    ]
  },
  {
    name: 'PWA Manifest',
    path: join(ROOT_DIR, 'public/manifest.json'),
    updates: [
      {
        search: /("version":\s*")[\d.]+(-[a-zA-Z0-9.]+)?(")/,
        replace: `$1${newVersion}$3`,
        description: 'PWA manifest version'
      }
    ]
  },
  {
    name: 'Login Page',
    path: join(ROOT_DIR, 'src/app/login/page.tsx'),
    updates: [
      {
        search: /(<span className="px-2 py-1 bg-emerald-900\/30 text-forest-600 dark:text-emerald-400 rounded font-medium">)v[\d.]+(-[a-zA-Z0-9.]+)?(<\/span>)/,
        replace: `$1v${newVersion}$3`,
        description: 'Version badge'
      },
      {
        search: /(<span>)[A-Za-z]+ \d{1,2}, \d{4}(<\/span>)/,
        replace: `$1${newDate}$2`,
        description: 'Release date'
      }
    ]
  },
  {
    name: 'Dashboard Page',
    path: join(ROOT_DIR, 'src/app/dashboard/page.tsx'),
    updates: [
      {
        search: /(<span className="font-bold text-indigo-700 dark:text-indigo-300">)v[\d.]+(-[a-zA-Z0-9.]+)?(<\/span>)/,
        replace: `$1v${newVersion}$3`,
        description: 'Version display'
      },
      {
        search: /(<span className="font-semibold text-blue-700 dark:text-blue-400">)[A-Za-z]+ \d{1,2}, \d{4}(<\/span>)/,
        replace: `$1${newDate}$2`,
        description: 'Date display'
      }
    ]
  },
  {
    name: 'About Page',
    path: join(ROOT_DIR, 'src/app/dashboard/about/page.tsx'),
    updates: [
      {
        search: /(<strong>Current Version:<\/strong> )[\d.]+(-[a-zA-Z0-9.]+)?( \()([A-Za-z]+)( \d{4}\))/,
        replace: (_match, p1, _p2, p3, _p4, p5) => {
          const month = newDate.split(' ')[0];
          const year = newDate.split(' ').pop();
          return `${p1}${newVersion}${p3}${month}${p5.replace(/\d{4}/, year)}`;
        },
        description: 'Current version and date'
      }
    ]
  }
];

// Verify all files exist before proceeding
console.log('🔍 Checking file availability...\n');
let missingFiles = [];

for (const file of files) {
  if (!existsSync(file.path)) {
    missingFiles.push(file.path);
    console.log(`❌ Missing: ${file.name}`);
    if (verbose) console.log(`   Path: ${file.path}`);
  } else {
    console.log(`✅ Found: ${file.name}`);
    if (verbose) console.log(`   Path: ${file.path}`);
  }
}

if (missingFiles.length > 0) {
  console.error('\n❌ Error: Required files are missing');
  console.log('\n💡 Ensure you\'re running from the project root directory');
  console.log('   Expected structure:');
  console.log('   project-root/');
  console.log('   ├── version.json');
  console.log('   ├── scripts/');
  console.log('   └── src/app/');
  process.exit(1);
}

console.log('');

// Create backups if requested
if (createBackup && !verifyOnly) {
  console.log('💾 Creating backups...\n');
  for (const file of files) {
    try {
      const backupPath = `${file.path}.backup`;
      copyFileSync(file.path, backupPath);
      console.log(`  ✓ Backed up ${file.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to backup ${file.name}:`, error.message);
    }
  }
  console.log('');
}

// Update version.json
if (!verifyOnly) {
  versionData.version = newVersion;
  versionData.date = newDate;
  
  try {
    writeFileSync(versionFile, JSON.stringify(versionData, null, 2) + '\n');
    console.log(`✅ Updated version.json: v${oldVersion} → v${newVersion}\n`);
  } catch (error) {
    console.error('❌ Failed to update version.json:', error.message);
    process.exit(1);
  }
}

// Process each file
console.log('🔄 Processing files...\n');
let totalUpdates = 0;
let totalWarnings = 0;
const results = [];

for (const file of files) {
  console.log(`📄 ${file.name}`);
  
  try {
    let content = readFileSync(file.path, 'utf8');
    let fileUpdates = 0;
    let fileWarnings = 0;

    for (const update of file.updates) {
      const before = content;
      const testContent = content.replace(update.search, update.replace);

      if (testContent !== before) {
        fileUpdates++;
        console.log(`   ✓ ${update.description}`);
        
        if (verbose) {
          // Show what changed
          const match = before.match(update.search);
          if (match) {
            console.log(`     Before: "${match[0].substring(0, 60)}..."`);
          }
        }
        
        if (!verifyOnly) {
          content = testContent;
        }
      } else {
        fileWarnings++;
        totalWarnings++;
        console.log(`   ⚠️  Pattern not found: ${update.description}`);
        
        if (verbose) {
          console.log(`     Regex: ${update.search}`);
          console.log(`     This may indicate the file structure has changed`);
        }
      }
    }

    if (!verifyOnly && fileUpdates > 0) {
      writeFileSync(file.path, content, 'utf8');
    }

    totalUpdates += fileUpdates;
    results.push({
      name: file.name,
      updates: fileUpdates,
      warnings: fileWarnings
    });
    
    console.log(`   ${verifyOnly ? 'Would make' : 'Made'} ${fileUpdates} change(s)\n`);
    
  } catch (error) {
    console.error(`❌ Error processing ${file.name}:`, error.message);
    results.push({
      name: file.name,
      updates: 0,
      warnings: 0,
      error: error.message
    });
  }
}

// Summary
console.log('╔════════════════════════════════════════╗');
console.log('║            Summary                     ║');
console.log('╚════════════════════════════════════════╝\n');

if (verifyOnly) {
  console.log('🔍 Verification complete!\n');
  console.log(`   Patterns found:     ${totalUpdates}`);
  console.log(`   Patterns missing:   ${totalWarnings}`);
  
  if (totalWarnings > 0) {
    console.log('\n⚠️  Some patterns were not found');
    console.log('   Review the file structure or update the regex patterns');
  } else {
    console.log('\n✅ All patterns verified successfully');
    console.log('   Run without --verify-only to apply changes');
  }
} else {
  console.log('✨ Version update complete!\n');
  console.log(`   Total changes:      ${totalUpdates}`);
  console.log(`   Version:            v${oldVersion} → v${newVersion}`);
  console.log(`   Date:               ${oldDate} → ${newDate}`);
  
  if (totalWarnings > 0) {
    console.log(`   ⚠️  Warnings:         ${totalWarnings}`);
  }
}

// Detailed results
if (verbose) {
  console.log('\n📊 Detailed Results:\n');
  for (const result of results) {
    console.log(`   ${result.name}:`);
    console.log(`   ├─ Changes: ${result.updates}`);
    if (result.warnings > 0) {
      console.log(`   ├─ Warnings: ${result.warnings}`);
    }
    if (result.error) {
      console.log(`   └─ Error: ${result.error}`);
    } else {
      console.log(`   └─ Status: OK`);
    }
  }
}

// Next steps
if (!verifyOnly) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          Next Steps                    ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log('📝 Don\'t forget to:');
  console.log('   1. ⚠️  IMPORTANT: Update changelog database entries:');
  console.log(`      node scripts/add-changelog.mjs ${newVersion} <type> <title> <description>`);
  console.log('      Types: feature, bugfix, improvement, documentation');
  console.log('      Or extract from git: node scripts/extract-git-changelog.mjs');
  console.log('   2. Test the build: npm run build');
  console.log('   3. Review changes: git diff');
  console.log(`   4. Commit: git add . && git commit -m "chore: update to v${newVersion}"`);
  console.log(`   5. Tag: git tag v${newVersion}`);
  console.log('   6. Push: git push && git push --tags\n');
}

// Exit with appropriate code
if (totalWarnings > 0 && !verifyOnly) {
  console.log('⚠️  Completed with warnings\n');
  process.exit(0);
} else {
  process.exit(0);
}
