#!/usr/bin/env node
/**
 * Automatic Version Bumper for Hive Craic
 *
 * This script automatically increments the version number (patch version by default)
 * and updates all application files following semantic versioning.
 *
 * Usage:
 *   node scripts/bump-version.mjs [major|minor|patch] [--dry-run]
 *
 * Examples:
 *   node scripts/bump-version.mjs          # Bumps patch: 1.0.11 → 1.0.12
 *   node scripts/bump-version.mjs patch    # Bumps patch: 1.0.11 → 1.0.12
 *   node scripts/bump-version.mjs minor    # Bumps minor: 1.0.11 → 1.1.0
 *   node scripts/bump-version.mjs major    # Bumps major: 1.0.11 → 2.0.0
 *   node scripts/bump-version.mjs --dry-run  # Preview changes without applying
 *
 * Options:
 *   --dry-run    Preview the version bump without making changes
 *   --yes, -y    Skip confirmation prompts (use with caution)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const bumpType = args.find(arg => !arg.startsWith('--')) || 'patch';
const isDryRun = args.includes('--dry-run');
const skipConfirm = args.includes('--yes') || args.includes('-y');

// Validate bump type
if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error(`❌ Error: Invalid bump type "${bumpType}"`);
  console.log('\n📖 Valid options:');
  console.log('   • major - Breaking changes (1.0.0 → 2.0.0)');
  console.log('   • minor - New features (1.0.0 → 1.1.0)');
  console.log('   • patch - Bug fixes (1.0.0 → 1.0.1)');
  console.log('\nExample: node scripts/bump-version.mjs minor');
  process.exit(1);
}

// Read current version
const versionFile = join(ROOT_DIR, 'version.json');
if (!existsSync(versionFile)) {
  console.error('❌ Error: version.json not found');
  console.log('\n💡 Create it with:');
  console.log('   echo \'{"version":"1.0.0","date":"November 18, 2025"}\' > version.json');
  process.exit(1);
}

let versionData;
try {
  versionData = JSON.parse(readFileSync(versionFile, 'utf8'));
} catch (error) {
  console.error('❌ Error: Invalid JSON in version.json');
  console.log('   Expected format: {"version":"1.0.0","date":"November 18, 2025"}');
  process.exit(1);
}

const oldVersion = versionData.version;
if (!oldVersion) {
  console.error('❌ Error: No version field found in version.json');
  process.exit(1);
}

// Parse version
const parts = oldVersion.split('.').map(Number);
if (parts.length !== 3 || parts.some(isNaN)) {
  console.error(`❌ Error: Invalid version format "${oldVersion}"`);
  console.log('   Expected format: X.Y.Z (e.g., 1.0.12)');
  console.log('   Each part must be a number');
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

// Display version bump info
console.log('\n╔════════════════════════════════════════╗');
console.log('║       Version Bump Summary             ║');
console.log('╚════════════════════════════════════════╝\n');
console.log(`📦 Bump Type: ${bumpType.toUpperCase()}`);
console.log(`📊 Current:   v${oldVersion}`);
console.log(`📊 New:       v${newVersion}`);
console.log(`📅 Date:      ${newDate}`);

if (isDryRun) {
  console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
}

// Describe what will change
console.log('\n📝 Files that will be updated:');
console.log('   • version.json');
console.log('   • package.json (npm version)');
console.log('   • public/service-worker.js (PWA cache name)');
console.log('   • public/manifest.json (PWA version)');
console.log('   • src/app/login/page.tsx (version badge & date)');
console.log('   • src/app/dashboard/page.tsx (version & date display)');
console.log('   • src/app/dashboard/about/page.tsx (version badge & date)');
console.log('\n⚠️  Manual update required:');
console.log('   • Changelog in src/app/dashboard/about/page.tsx');

// Confirmation for major versions
async function confirm(question) {
  if (skipConfirm) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  if (bumpType === 'major' && !skipConfirm) {
    console.log('\n⚠️  WARNING: Major version bumps indicate BREAKING CHANGES');
    console.log('   This will reset minor and patch versions to 0');
    const proceed = await confirm('\n🤔 Are you sure you want to bump the major version? (y/N): ');
    if (!proceed) {
      console.log('\n❌ Version bump cancelled');
      process.exit(0);
    }
  }

  if (isDryRun) {
    console.log('\n✅ Dry run complete - no files were modified');
    console.log('\n💡 Run without --dry-run to apply changes:');
    console.log(`   node scripts/bump-version.mjs ${bumpType}`);
    return;
  }

  // Check for uncommitted changes
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.log('\n⚠️  WARNING: You have uncommitted changes');
      console.log('   It\'s recommended to commit or stash changes before bumping version');
      
      const proceed = await confirm('\n🤔 Continue anyway? (y/N): ');
      if (!proceed) {
        console.log('\n❌ Version bump cancelled');
        process.exit(0);
      }
    }
  } catch (error) {
    // Not a git repository or git not available - continue anyway
  }

  // Call update-version script
  try {
    console.log('\n🔄 Updating files...\n');
    // execFileSync, not execSync: arguments are passed straight to the process rather than
    // through a shell, so nothing in them can be re-interpreted as shell syntax.
    execFileSync('node', ['--no-deprecation', join(__dirname, 'update-version.mjs'), newVersion, newDate], {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    });

    console.log('\n✨ Version bumped successfully!\n');

    // Extract changelog from git commits
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Extracting Changelog from Git       ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
      // Run git changelog extraction
      const extractOutput = execFileSync('node', ['--no-deprecation', join(__dirname, 'extract-git-changelog.mjs'), newVersion], {
        cwd: ROOT_DIR,
        encoding: 'utf8'
      });

      console.log(extractOutput);

      // Parse JSON output from extract script
      const jsonMatch = extractOutput.match(/📋 Changelog JSON:\s*\n([\s\S]+)/);
      if (jsonMatch) {
        const changelogData = JSON.parse(jsonMatch[1]);

        if (changelogData.entries && changelogData.entries.length > 0) {
          console.log('\n💾 Saving changelog entries to database...\n');

          // Add each entry to database
          for (const entry of changelogData.entries) {
            try {
              // Titles and descriptions come from commit messages, so they routinely contain
              // quotes and can contain backticks or $(...). Interpolating them into a shell
              // string truncated the argument at the first quote — the v1.11.3 entry for
              // 'head the payment panel "Not paid yet?"' was stored as title "...panel Not",
              // description "paid" — and would have let a commit message run shell commands.
              const result = execFileSync(
                'node',
                [
                  '--no-deprecation',
                  join(__dirname, 'add-changelog.mjs'),
                  newVersion,
                  entry.entry_type,
                  entry.title,
                  entry.description
                ],
                {
                  cwd: ROOT_DIR,
                  encoding: 'utf8',
                  input: 'y\n' // Auto-confirm
                }
              );
              console.log(`✅ Added: ${entry.title}`);
            } catch (error) {
              console.log(`⚠️  Could not add entry: ${entry.title}`);
            }
          }

          console.log(`\n✨ Added ${changelogData.entries.length} changelog entries from git commits!`);
        }
      }
    } catch (error) {
      console.log('\n⚠️  Could not extract changelog from git commits');
      console.log('   You can add entries manually with:');
      console.log(`   node .claude/skills/versioning/scripts/add-changelog.mjs\n`);
    }

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║          Next Steps                    ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log('1️⃣  Review the changes:');
    console.log('   git diff\n');
    console.log('2️⃣  Test the build:');
    console.log('   npm run build\n');
    console.log('3️⃣  Commit the changes:');
    console.log(`   git add . && git commit -m "chore: update to v${newVersion}"\n`);
    console.log('4️⃣  Tag the release:');
    console.log(`   git tag -a v${newVersion} -m "Release v${newVersion}"\n`);
    console.log('5️⃣  Push to remote:');
    console.log('   git push && git push --tags\n');

    if (skipConfirm) {
      console.log('💡 Add changelog entries manually with:');
      console.log(`   node .claude/skills/versioning/scripts/add-changelog.mjs\n`);
    }

  } catch (error) {
    console.error('\n❌ Error bumping version:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   • Check that update-version.mjs exists in scripts/');
    console.log('   • Verify file paths in update-version.mjs are correct');
    console.log('   • Ensure all target files exist and are writable');
    process.exit(1);
  }
}

main();
