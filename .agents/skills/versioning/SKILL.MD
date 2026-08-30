# Version Management Skill

## Overview

This skill provides comprehensive automated version management for the HiveCraic application, including:
- Consistent version numbering across all application files following semantic versioning
- Database-backed changelog management with automatic entry prompts
- Dynamic changelog display showing the last 5 versions in the About page

## When to Use This Skill

Use this skill when:
- Preparing to release a new version of the application
- Making changes that require version tracking
- Need to update version numbers across multiple files consistently
- Working with semantic versioning (major.minor.patch)
- Creating release tags and managing deployment versions

## System Architecture

### Version Files

The version management system updates the following files:

1. **version.json** - Central version registry
   ```json
   {
     "version": "1.0.12",
     "date": "November 18, 2025"
   }
   ```

2. **Login Page** (`src/app/login/page.tsx`)
   - Version badge display
   - Release date display

3. **Dashboard Page** (`src/app/dashboard/page.tsx`)
   - Version information
   - Date information

4. **About Page** (`src/app/dashboard/about/page.tsx`)
   - Dynamic changelog display powered by database
   - Shows last 5 versions automatically
   - No manual updates needed

### Database Changelog System

**NEW**: Changelog entries are now stored in a Supabase database table (`changelog`) and displayed dynamically in the About page.

**Table Structure**:
- `id`: UUID primary key
- `version`: Version number (e.g., "1.0.12")
- `date`: Release date
- `entry_type`: Type of change (feature, bugfix, improvement, documentation)
- `title`: Brief summary
- `description`: Detailed description
- `created_at`, `created_by`: Audit fields
- `is_published`: Controls visibility

**Benefits**:
- No more manual HTML editing in About page
- Consistent formatting across all changelog entries
- Easy to query and filter by version or type
- Automatic sorting and grouping by version
- Only shows last 5 versions (configurable)

**Entry Types**:
- 🌟 `feature` - New functionality (emerald)
- ✓ `bugfix` - Bug fixes (green)
- ⚡ `improvement` - Enhancements (blue)
- 🔧 `documentation` - Documentation updates (purple)

### Available Scripts

#### 1. bump-version.mjs
**Purpose**: Automatically increment version following semantic versioning

**Location**: `scripts/bump-version.mjs`

**Usage**:
```bash
# Patch version (bug fixes): 1.0.11 → 1.0.12
node scripts/bump-version.mjs
node scripts/bump-version.mjs patch

# Minor version (new features): 1.0.11 → 1.1.0
node scripts/bump-version.mjs minor

# Major version (breaking changes): 1.0.11 → 2.0.0
node scripts/bump-version.mjs major

# Via npm (recommended)
npm run version:bump          # patch
npm run version:bump minor
npm run version:bump major
```

#### 2. update-version.mjs
**Purpose**: Update version across all files (usually called by bump-version.mjs)

**Location**: `.Codex/skills/versioning/scripts/update-version.mjs`

**Usage**:
```bash
# Update to specific version with current date
node .Codex/skills/versioning/scripts/update-version.mjs 1.0.12

# Update with custom date
node .Codex/skills/versioning/scripts/update-version.mjs 1.0.12 "December 1, 2025"

# Via npm
npm run version:update 1.0.12 "December 1, 2025"
```

#### 3. add-changelog.mjs ⭐ NEW
**Purpose**: Add changelog entries to the database (called automatically by bump-version or standalone)

**Location**: `.Codex/skills/versioning/scripts/add-changelog.mjs`

**Usage**:
```bash
# Interactive mode (prompts for all fields)
node .Codex/skills/versioning/scripts/add-changelog.mjs

# Non-interactive mode (all arguments provided)
node .Codex/skills/versioning/scripts/add-changelog.mjs <version> <type> <title> <description>

# Examples
node .Codex/skills/versioning/scripts/add-changelog.mjs "1.1.0" "feature" "Team Tasks" "Team members can now close tasks for shared hives"
node .Codex/skills/versioning/scripts/add-changelog.mjs "1.0.12" "bugfix" "Login Fix" "Fixed login error for OAuth users"
node .Codex/skills/versioning/scripts/add-changelog.mjs "1.0.13" "improvement" "UI Polish" "Improved dark mode contrast on forms"
```

**Features**:
- Automatically reads current version from version.json in interactive mode
- Validates entry types
- Inserts entries directly into Supabase changelog table
- Supports multiple entries per version
- Entries appear immediately in About page changelog

## Semantic Versioning Guide

### Version Format: MAJOR.MINOR.PATCH

- **MAJOR** (X.0.0): Breaking changes, incompatible API changes
  - Example: Changing database schema, removing features, changing authentication
  
- **MINOR** (0.X.0): New features, backward-compatible additions
  - Example: New dashboard widget, additional reports, new user preferences
  
- **PATCH** (0.0.X): Bug fixes, backward-compatible fixes
  - Example: Fixing validation bugs, UI corrections, performance improvements

### Decision Tree

```
Is this a bug fix or minor improvement?
└─ YES → PATCH (1.0.11 → 1.0.12)

Does this add new functionality?
└─ YES → MINOR (1.0.11 → 1.1.0)

Does this break existing functionality?
└─ YES → MAJOR (1.0.11 → 2.0.0)
```

## Complete Release Workflow

### Step 1: Prepare Changes
```bash
# Ensure you're on the main branch
git checkout main
git pull origin main

# Ensure all changes are committed
git status
```

### Step 2: Bump Version
```bash
# Choose appropriate bump type
npm run version:bump        # For bug fixes (patch)
npm run version:bump minor  # For new features
npm run version:bump major  # For breaking changes
```

**What happens:**
- ✅ Reads current version from version.json
- ✅ Increments version according to semantic versioning
- ✅ Updates version.json
- ✅ Updates login page version badge and date
- ✅ Updates dashboard version and date
- ✅ Updates about page version badge and date
- ✅ **Prompts you to add changelog entries to the database**

### Step 3: Add Changelog Entries (Interactive)

**NEW**: The bump-version script now prompts you to add changelog entries immediately:

```bash
# After version bump, you'll see:
╔════════════════════════════════════════╗
║      Add Changelog Entries             ║
╚════════════════════════════════════════╝

📝 Add changelog entries now? (Y/n): y

📝 Entry Types:
   1. feature       - New functionality
   2. bugfix        - Bug fixes
   3. improvement   - Enhancements
   4. documentation - Documentation updates

🔢 Select type (1-4) or press Enter to skip: 1
📌 Title (brief summary): Team Task Collaboration
📄 Description (detailed): Team members can now close tasks for shared hives

✅ Changelog entry added successfully!

➕ Add another changelog entry? (y/N): y
```

**Multiple Entries**: You can add multiple changelog entries for the same version. Each commit/change can have its own entry, making the changelog more granular and informative.

**Skip Adding Entries**: If you press Enter at the first prompt or select to skip, you can add entries later using the standalone script (see below).

### Alternative: Add Changelog Entries Manually

If you skipped adding entries during version bump, or want to add more entries later:

```bash
# Interactive mode - script reads version from version.json
node .Codex/skills/versioning/scripts/add-changelog.mjs

# Non-interactive mode - provide all arguments
node .Codex/skills/versioning/scripts/add-changelog.mjs "1.0.12" "bugfix" "Fixed login error" "Resolved issue where users couldn't log in"

# Examples
node .Codex/skills/versioning/scripts/add-changelog.mjs "1.1.0" "feature" "Database Changelog" "Moved changelog to database for better version tracking"
node .Codex/skills/versioning/scripts/add-changelog.mjs "1.1.0" "improvement" "UI Polish" "Improved dark mode styling across all pages"
```

**Entry Types**:
- `feature` - New functionality (shows with ★ in emerald)
- `bugfix` - Bug fixes (shows with ✓ in green)
- `improvement` - Enhancements to existing features (shows with ⚡ in blue)
- `documentation` - Documentation updates (shows with 🔧 in purple)

### Step 4: Review Changes
```bash
# Check what files were modified
git status

# Review the actual changes
git diff

# View specific file changes
git diff src/app/login/page.tsx
git diff version.json
```

### Step 5: Build and Test
```bash
# Ensure the build succeeds
npm run build

# Run tests if available
npm test

# Start dev server and verify visually
npm run dev
```

**Verify:**
- ✅ Login page shows correct version
- ✅ Dashboard shows correct version and date
- ✅ About page → Changes section shows your changelog entries from the database
- ✅ Changelog entries are properly formatted with icons and colors
- ✅ Only the last 5 versions are displayed
- ✅ No console errors
- ✅ Application builds without errors

### Step 6: Commit Changes
```bash
# Stage all version changes
git add .

# Commit with conventional message
git commit -m "chore: update to v1.0.12"

# Or more detailed
git commit -m "chore: update to v1.0.12

- Fixed validation bug in queen registration
- Improved hive inspection date picker
- Updated dashboard statistics display"
```

### Step 7: Tag the Release
```bash
# Create annotated tag (recommended)
git tag -a v1.0.12 -m "Release version 1.0.12"

# Or simple tag
git tag v1.0.12

# Verify tag was created
git tag -l
```

### Step 8: Push Everything
```bash
# Push commits
git push origin main

# Push tags
git push origin --tags

# Or push both together
git push origin main --follow-tags
```

### Step 9: Deploy (if applicable)
```bash
# Trigger deployment (Vercel example)
vercel --prod

# Or wait for automatic deployment from git push
```

## Quick Reference Commands

### Most Common: Patch Version
```bash
npm run version:bump
git diff
npm run build
git add .
git commit -m "chore: update to v1.0.X"
git tag v1.0.X
git push && git push --tags
```

### Adding New Feature: Minor Version
```bash
npm run version:bump minor
# ... update changelog ...
git diff
npm run build
git add .
git commit -m "feat: update to v1.X.0"
git tag v1.X.0
git push && git push --tags
```

### Breaking Change: Major Version
```bash
npm run version:bump major
# ... update changelog ...
git diff
npm run build
git add .
git commit -m "feat!: update to vX.0.0"
git tag vX.0.0
git push && git push --tags
```

## Troubleshooting

### Version Not Updating in Files

**Problem**: Script completes but version doesn't change in UI files

**Solution**:
1. Check regex patterns in update-version.mjs match your file structure
2. Verify file paths are correct
3. Check for warnings like "⚠️ Pattern not found"
4. Manually verify file content structure matches expected patterns

```bash
# Search for current version in files
grep -r "v1.0.11" src/
```

### Script Fails to Find version.json

**Problem**: `❌ Error: version.json not found`

**Solution**:
```bash
# Ensure you're running from project root
cd /path/to/hive-craic

# Create version.json if missing
echo '{"version":"1.0.0","date":"November 18, 2025"}' > version.json
```

### Invalid Version Format Error

**Problem**: `❌ Error: Invalid version format`

**Solution**:
- Ensure version.json contains valid semantic version (X.Y.Z)
- All parts must be numbers
- Must have exactly 3 parts separated by dots

```json
// ✅ Valid
{"version": "1.0.12", "date": "November 18, 2025"}

// ❌ Invalid
{"version": "1.0", "date": "..."}
{"version": "v1.0.12", "date": "..."}
```

### Git Tag Already Exists

**Problem**: `fatal: tag 'v1.0.12' already exists`

**Solution**:
```bash
# Delete local tag
git tag -d v1.0.12

# Delete remote tag (if pushed)
git push origin :refs/tags/v1.0.12

# Create tag again
git tag v1.0.12
```

### Changes Not Appearing After Push

**Problem**: Pushed changes but version doesn't update in deployed app

**Solution**:
1. Verify files were actually committed: `git log -1 --stat`
2. Check deployment logs for build errors
3. Clear browser cache and hard refresh (Ctrl+Shift+R)
4. Verify correct branch was deployed

## Best Practices

### ✅ DO

1. **Always bump version before deploying**
   ```bash
   npm run version:bump && npm run build
   ```

2. **Update changelog in About page**
   - Add meaningful release notes
   - List user-facing changes
   - Include bug fixes and improvements

3. **Use semantic versioning correctly**
   - Patch: Bug fixes only
   - Minor: New features
   - Major: Breaking changes

4. **Create annotated git tags**
   ```bash
   git tag -a v1.0.12 -m "Release 1.0.12: Fixed queen registration bug"
   ```

5. **Test build after version bump**
   ```bash
   npm run build
   ```

6. **Review changes before committing**
   ```bash
   git diff
   ```

### ❌ DON'T

1. **Don't skip version bumps for deployments**
   - Every deployment should have a version

2. **Don't manually edit version numbers**
   - Always use the scripts to ensure consistency

3. **Don't forget to push tags**
   ```bash
   # ❌ Wrong
   git push
   
   # ✅ Correct
   git push && git push --tags
   ```

4. **Don't bump major version without documentation**
   - Document breaking changes
   - Provide migration guide if needed

5. **Don't reuse version numbers**
   - Once a version is tagged and pushed, never change it

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Deploy
on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          npm ci
          npm run build
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Vercel Integration

Vercel automatically deploys when you push tags:
1. Push your version tag: `git push --tags`
2. Vercel detects the new tag
3. Automatic production deployment triggered

## Version History Tracking

### View All Versions
```bash
# List all version tags
git tag -l

# Show tag details
git show v1.0.12

# View changelog
git log --oneline --decorate
```

### Compare Versions
```bash
# See changes between versions
git diff v1.0.11..v1.0.12

# See commit messages between versions
git log v1.0.11..v1.0.12 --oneline
```

### Rollback if Needed
```bash
# Checkout specific version
git checkout v1.0.11

# Create branch from old version
git checkout -b hotfix/v1.0.11 v1.0.11
```

## Advanced Usage

### Custom Date Format
```bash
# Use specific date
node scripts/update-version.mjs 1.0.12 "1st December 2025"

# Use different format
node scripts/update-version.mjs 1.0.12 "Dec 1, 2025"
```

### Pre-release Versions
```bash
# For beta releases
node scripts/update-version.mjs 1.1.0-beta.1
git tag v1.1.0-beta.1

# For release candidates
node scripts/update-version.mjs 1.1.0-rc.1
git tag v1.1.0-rc.1
```

### Hotfix Workflow
```bash
# Create hotfix branch from production tag
git checkout -b hotfix/1.0.13 v1.0.12

# Fix the bug
# ... make changes ...

# Bump patch version
npm run version:bump

# Commit and tag
git add .
git commit -m "fix: critical bug in validation"
git tag v1.0.13

# Merge back to main
git checkout main
git merge hotfix/1.0.13
git push && git push --tags
```

## File Structure Reference

```
project-root/
├── version.json                          # Central version file
├── scripts/
│   ├── bump-version.mjs                  # Auto-increment version
│   ├── update-version.mjs                # Update files with version
│   └── SKILL.md                          # This file
├── src/
│   └── app/
│       ├── login/
│       │   └── page.tsx                  # Version badge
│       └── dashboard/
│           ├── page.tsx                  # Version display
│           └── about/
│               └── page.tsx              # Changelog
└── package.json                          # npm scripts
```

## Package.json Scripts Setup

Ensure your `package.json` includes these scripts:

```json
{
  "scripts": {
    "version:bump": "node scripts/bump-version.mjs",
    "version:update": "node scripts/update-version.mjs",
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

## Summary

Version management for Hive Craic is automated through two coordinated scripts:

1. **bump-version.mjs** - Semantic version incrementing
2. **update-version.mjs** - File updates across the application

**Typical workflow**: Bump → Update Changelog → Review → Build → Commit → Tag → Push

**Most common command**: `npm run version:bump`

This ensures consistent versioning across all application files and maintains a clear release history through git tags.