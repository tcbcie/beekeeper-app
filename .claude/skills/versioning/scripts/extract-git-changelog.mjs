#!/usr/bin/env node
/**
 * Extract Changelog from Git Commits
 *
 * Automatically generates changelog entries from git commits since last version tag.
 * Uses Conventional Commits format to categorize changes.
 *
 * Conventional Commits Format:
 * - feat: A new feature → feature
 * - fix: A bug fix → bugfix
 * - perf: Performance improvement → improvement
 * - refactor: Code refactoring → improvement
 * - docs: Documentation changes → documentation
 * - style: Code style changes → improvement
 * - test: Test changes → documentation
 * - chore: Build/tooling changes → documentation
 *
 * Usage:
 *   node .claude/skills/versioning/scripts/extract-git-changelog.mjs [version]
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..', '..', '..', '..');

// Get version from argument or version.json
let targetVersion = process.argv[2];
if (!targetVersion) {
  try {
    const versionFile = join(ROOT_DIR, 'version.json');
    const versionData = JSON.parse(readFileSync(versionFile, 'utf8'));
    targetVersion = versionData.version;
  } catch (error) {
    console.error('❌ Error: Could not determine version');
    console.log('   Provide version as argument or ensure version.json exists');
    process.exit(1);
  }
}

// Get latest git tag
let lastTag;
try {
  lastTag = execSync('git describe --tags --abbrev=0', {
    encoding: 'utf8',
    cwd: ROOT_DIR
  }).trim();
} catch (error) {
  console.log('⚠️  No previous tags found, using all commits from initial commit');
  lastTag = null;
}

console.log('\n╔════════════════════════════════════════╗');
console.log('║    Git Changelog Extractor             ║');
console.log('╚════════════════════════════════════════╝\n');
console.log(`📦 Target Version: v${targetVersion}`);
console.log(`📌 Last Tag:       ${lastTag || '(none)'}`);
console.log(`📊 Analyzing commits...\n`);

// Get commits since last tag
const gitCommand = lastTag
  ? `git log ${lastTag}..HEAD --pretty=format:"%H|%s|%b" --no-merges`
  : `git log --pretty=format:"%H|%s|%b" --no-merges`;

let commits;
try {
  commits = execSync(gitCommand, {
    encoding: 'utf8',
    cwd: ROOT_DIR
  });
} catch (error) {
  console.error('❌ Error reading git commits:', error.message);
  process.exit(1);
}

if (!commits.trim()) {
  console.log('ℹ️  No new commits found since last tag');
  console.log('\n💡 Nothing to add to changelog');
  process.exit(0);
}

// Parse commits into changelog entries
const entries = [];
const commitLines = commits.split('\n').filter(line => line.trim());

for (const line of commitLines) {
  const [hash, subject, body] = line.split('|');

  // Skip if subject is missing
  if (!subject || !subject.trim()) {
    continue;
  }

  // Skip version bump commits
  if (subject.match(/^(chore|release):\s*(update to|bump|version)/i)) {
    continue;
  }

  // Skip commits from Claude (already documented)
  if (body && body.includes('Generated with Claude Code')) {
    continue;
  }

  // Parse conventional commit format: type(scope): description
  const match = subject.match(/^(feat|fix|perf|refactor|docs|style|test|chore|improvement)(\(.+\))?:\s*(.+)$/i);

  let entryType, title, description;

  if (match) {
    const [, type, scope, message] = match;

    // Map commit type to changelog entry type
    switch (type.toLowerCase()) {
      case 'feat':
        entryType = 'feature';
        break;
      case 'fix':
        entryType = 'bugfix';
        break;
      case 'perf':
      case 'refactor':
      case 'style':
      case 'improvement':
        entryType = 'improvement';
        break;
      case 'docs':
      case 'test':
      case 'chore':
        entryType = 'documentation';
        break;
      default:
        entryType = 'improvement';
    }

    // Create title from commit message
    title = message.trim();

    // Use scope as part of title if present
    if (scope) {
      const scopeName = scope.replace(/[()]/g, '');
      title = `${scopeName.charAt(0).toUpperCase() + scopeName.slice(1)}: ${title}`;
    }

    // Use body as description if available, otherwise use subject
    description = body && body.trim()
      ? body.trim().split('\n')[0] // First line of body
      : title;

  } else {
    // Non-conventional commit - categorize as improvement
    entryType = 'improvement';
    title = subject.trim();
    description = body && body.trim()
      ? body.trim().split('\n')[0]
      : title;
  }

  // Capitalize first letter of title
  title = title.charAt(0).toUpperCase() + title.slice(1);
  description = description.charAt(0).toUpperCase() + description.slice(1);

  entries.push({
    type: entryType,
    title,
    description,
    hash: hash.substring(0, 7)
  });
}

if (entries.length === 0) {
  console.log('ℹ️  No valid changelog entries found in commits');
  console.log('\n💡 Tip: Use conventional commit format for automatic changelog:');
  console.log('   feat: Add new feature');
  console.log('   fix: Fix a bug');
  console.log('   docs: Update documentation');
  process.exit(0);
}

// Display found entries
console.log(`✅ Found ${entries.length} changelog entries:\n`);

const typeIcons = {
  feature: '⭐',
  bugfix: '✓',
  improvement: '⚡',
  documentation: '🔧'
};

entries.forEach((entry, index) => {
  const icon = typeIcons[entry.type] || '•';
  console.log(`${index + 1}. ${icon} [${entry.type}] ${entry.title}`);
  console.log(`   ${entry.description}`);
  console.log(`   (${entry.hash})\n`);
});

// Output JSON for consumption by other scripts
console.log('\n📋 Changelog JSON:\n');
console.log(JSON.stringify({
  version: targetVersion,
  entries: entries.map(e => ({
    entry_type: e.type,
    title: e.title,
    description: e.description
  }))
}, null, 2));

export { entries, targetVersion };
