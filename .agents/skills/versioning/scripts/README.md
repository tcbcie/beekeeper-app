# Scripts Directory

Automation scripts for Hive Craic development and maintenance.

## Available Scripts

### Version Management

The version management system consists of two coordinated scripts that maintain consistent versioning across the entire application following semantic versioning principles.

#### bump-version.mjs
**Automatically increments version following semantic versioning**

```bash
# Bump patch version (bug fixes) - default
node scripts/bump-version.mjs
node scripts/bump-version.mjs patch

# Bump minor version (new features)
node scripts/bump-version.mjs minor

# Bump major version (breaking changes)
node scripts/bump-version.mjs major

# Via npm (recommended)
npm run version:bump
npm run version:bump minor
npm run version:bump major
```

**Options:**
- `--dry-run` - Preview changes without applying them
- `--yes`, `-y` - Skip confirmation prompts (use with caution)

**Examples:**
```bash
# Preview what a minor bump would do
node scripts/bump-version.mjs minor --dry-run

# Bump major version without confirmation
node scripts/bump-version.mjs major --yes
```

**What it does:**
1. Reads current version from version.json
2. Increments version according to semantic versioning rules:
   - Patch: `1.0.11` → `1.0.12` (bug fixes)
   - Minor: `1.0.11` → `1.1.0` (new features, resets patch)
   - Major: `1.0.11` → `2.0.0` (breaking changes, resets minor and patch)
3. Calls update-version.mjs to update all files
4. Provides clear next steps for completing the release

**Safety features:**
- Validates version format before proceeding
- Warns about uncommitted git changes
- Requires confirmation for major version bumps
- Provides detailed feedback and next steps

---

#### update-version.mjs
**Updates version number and date across all application files**

```bash
# Update to specific version with current date
node scripts/update-version.mjs 1.0.12

# Update with custom date
node scripts/update-version.mjs 1.0.12 "December 1, 2025"

# Via npm
npm run version:update 1.0.12 "December 1, 2025"
```

**Options:**
- `--verify-only` - Check patterns without making changes
- `--verbose` - Show detailed output including matched patterns
- `--backup` - Create .backup files before updating

**Examples:**
```bash
# Verify patterns will match before updating
node scripts/update-version.mjs 1.0.12 --verify-only

# Update with backup files created
node scripts/update-version.mjs 1.0.12 --backup

# Update with detailed output
node scripts/update-version.mjs 1.0.12 --verbose

# Pre-release version
node scripts/update-version.mjs 1.1.0-beta.1
```

**Updates the following files:**
- **version.json** - Central version registry
- **src/app/login/page.tsx** - Version badge and date
- **src/app/dashboard/page.tsx** - Version and date display  
- **src/app/dashboard/about/page.tsx** - Latest version badge and date

**⚠️ Manual Update Required:**
- Changelog section in `src/app/dashboard/about/page.tsx`

**Features:**
- Validates version format (supports pre-release versions)
- Checks all required files exist before proceeding
- Reports missing patterns with warnings
- Creates backups when requested
- Provides detailed summary of changes

---

## Quick Reference

### Most Common: Patch Version (Bug Fixes)
```bash
npm run version:bump
# Review changes
git diff
# Update changelog in src/app/dashboard/about/page.tsx
# Test build
npm run build
# Commit
git add .
git commit -m "chore: update to v1.0.12"
# Tag
git tag -a v1.0.12 -m "Release v1.0.12"
# Push
git push && git push --tags
```

### New Feature: Minor Version
```bash
npm run version:bump minor
# Update changelog manually
# Review and test
git diff && npm run build
# Commit and tag
git add .
git commit -m "feat: update to v1.1.0"
git tag -a v1.1.0 -m "Release v1.1.0 - New features"
git push && git push --tags
```

### Breaking Change: Major Version
```bash
npm run version:bump major
# Update changelog with migration notes
# Review thoroughly
git diff && npm run build
# Commit and tag
git add .
git commit -m "feat!: update to v2.0.0"
git tag -a v2.0.0 -m "Release v2.0.0 - Breaking changes"
git push && git push --tags
```

---

## Semantic Versioning Guidelines

Version format: **MAJOR.MINOR.PATCH**

| Component | When to Increment | Example | Use Case |
|-----------|-------------------|---------|----------|
| **MAJOR** | Breaking changes | 1.0.0 → 2.0.0 | API changes, removed features, incompatible updates |
| **MINOR** | New features | 1.0.0 → 1.1.0 | New functionality, backward-compatible additions |
| **PATCH** | Bug fixes | 1.0.0 → 1.0.1 | Bug fixes, performance improvements, minor updates |

### Decision Tree
```
Is this ONLY a bug fix or minor improvement?
└─ YES → PATCH (npm run version:bump)

Does this add NEW functionality?
└─ YES → MINOR (npm run version:bump minor)

Does this BREAK existing functionality?
└─ YES → MAJOR (npm run version:bump major)
```

---

## Complete Workflow

### Before You Start
```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Check for uncommitted changes
git status
```

### 1. Bump Version
```bash
# Choose appropriate version bump
npm run version:bump        # For bug fixes
npm run version:bump minor  # For new features
npm run version:bump major  # For breaking changes
```

### 2. Update Changelog
Edit `src/app/dashboard/about/page.tsx` and add your release notes:

```tsx
<div className="border-l-4 border-emerald-500 pl-4 mb-6">
  <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded font-semibold">
      v1.0.12
    </span>
    <span className="text-sm text-gray-600">November 18, 2025</span>
  </div>
  <h3 className="font-semibold text-gray-900 mb-2">Latest Release</h3>
  <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
    <li>Fixed validation bug in queen registration form</li>
    <li>Improved hive inspection date picker</li>
    <li>Updated dashboard statistics display</li>
  </ul>
</div>
```

### 3. Review Changes
```bash
# Check modified files
git status

# Review all changes
git diff

# Review specific files
git diff version.json
git diff src/app/login/page.tsx
```

### 4. Test Build
```bash
# Verify build succeeds
npm run build

# Start dev server and test
npm run dev
```

**Verify:**
- ✅ Login page shows new version
- ✅ Dashboard shows correct version and date
- ✅ About page shows new version in changelog
- ✅ No console errors
- ✅ Application functions correctly

### 5. Commit Changes
```bash
# Stage all changes
git add .

# Commit with conventional message
git commit -m "chore: update to v1.0.12"

# Or with details
git commit -m "chore: update to v1.0.12

- Fixed queen registration validation
- Improved date picker UX
- Updated dashboard statistics"
```

### 6. Tag Release
```bash
# Create annotated tag (recommended)
git tag -a v1.0.12 -m "Release v1.0.12: Bug fixes and improvements"

# Verify tag
git tag -l
git show v1.0.12
```

### 7. Push to Remote
```bash
# Push commits and tags together
git push origin main --follow-tags

# Or separately
git push origin main
git push origin --tags
```

---

## Advanced Usage

### Dry Run (Preview Changes)
```bash
# See what would happen without making changes
node scripts/bump-version.mjs --dry-run
node scripts/bump-version.mjs minor --dry-run
```

### Verify Patterns
```bash
# Check if regex patterns will match without updating
node scripts/update-version.mjs 1.0.12 --verify-only
```

### Pre-release Versions
```bash
# Beta release
node scripts/update-version.mjs 1.1.0-beta.1
git tag v1.1.0-beta.1

# Release candidate
node scripts/update-version.mjs 1.1.0-rc.1
git tag v1.1.0-rc.1

# Final release
npm run version:bump minor
```

### Hotfix Workflow
```bash
# Create hotfix branch from production tag
git checkout -b hotfix/1.0.13 v1.0.12

# Make your fix
# ... edit files ...

# Bump patch version
npm run version:bump

# Test thoroughly
npm run build

# Commit and tag
git add .
git commit -m "fix: critical bug in validation"
git tag v1.0.13

# Merge back to main
git checkout main
git merge hotfix/1.0.13

# Push everything
git push origin main --tags
```

### Custom Date Format
```bash
# Use different date format
node scripts/update-version.mjs 1.0.12 "1st December 2025"
node scripts/update-version.mjs 1.0.12 "Dec 1, 2025"
```

---

## Troubleshooting

### Version Not Updating in UI

**Symptoms**: Script succeeds but version doesn't appear in application

**Diagnosis:**
```bash
# Check if patterns matched
node scripts/update-version.mjs 1.0.12 --verify-only --verbose

# Search for old version in files
grep -r "v1.0.11" src/

# Check version.json
cat version.json
```

**Solutions:**
1. Run with `--verbose` to see detailed output
2. Check for warnings about patterns not found
3. Verify file structure matches expected patterns
4. Manually update files if patterns don't match

### Build Fails After Version Update

**Symptoms**: `npm run build` fails after version bump

**Solutions:**
```bash
# Check for syntax errors in updated files
npm run dev

# Review changes to see what broke
git diff

# Revert if necessary
git checkout -- src/app/login/page.tsx

# Re-run update
node scripts/update-version.mjs 1.0.12
```

### Git Tag Already Exists

**Symptoms**: `fatal: tag 'v1.0.12' already exists`

**Solutions:**
```bash
# Delete local tag
git tag -d v1.0.12

# Delete remote tag (if pushed)
git push origin :refs/tags/v1.0.12

# Create tag again
git tag v1.0.12
```

### Uncommitted Changes Warning

**Symptoms**: Script warns about uncommitted changes

**Solutions:**
```bash
# Commit or stash changes first
git stash
npm run version:bump
git stash pop

# Or commit them
git add .
git commit -m "chore: prepare for version bump"
npm run version:bump
```

### Pattern Not Found Warnings

**Symptoms**: `⚠️ Pattern not found` warnings during update

**Solutions:**
1. Run with `--verify-only` to check all patterns
2. Check if file structure has changed
3. Update regex patterns in update-version.mjs if needed
4. Manually verify and update affected files

---

## Best Practices

### ✅ DO

1. **Always bump version before deploying**
   ```bash
   npm run version:bump && npm run build
   ```

2. **Update changelog with meaningful notes**
   - Describe what changed from user perspective
   - List bug fixes, new features, improvements
   - Note any breaking changes

3. **Test build after version bump**
   ```bash
   npm run build && npm run dev
   ```

4. **Use appropriate version type**
   - Patch for bug fixes
   - Minor for new features
   - Major for breaking changes

5. **Create annotated tags**
   ```bash
   git tag -a v1.0.12 -m "Descriptive message"
   ```

6. **Review changes before committing**
   ```bash
   git diff
   ```

7. **Use dry-run for safety**
   ```bash
   node scripts/bump-version.mjs minor --dry-run
   ```

### ❌ DON'T

1. **Don't skip version bumps for deployments**
   - Every deployment should have a version

2. **Don't manually edit version numbers**
   - Always use the scripts for consistency

3. **Don't forget to update changelog**
   - Users need to know what changed

4. **Don't forget to push tags**
   ```bash
   # ❌ Wrong
   git push
   
   # ✅ Correct  
   git push && git push --tags
   ```

5. **Don't reuse version numbers**
   - Once tagged and pushed, never change

6. **Don't bump major without documentation**
   - Document breaking changes
   - Provide migration guide

---

## Package.json Configuration

Ensure your `package.json` includes these scripts:

```json
{
  "scripts": {
    "version:bump": "node scripts/bump-version.mjs",
    "version:update": "node scripts/update-version.mjs",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

---

## File Structure

```
project-root/
├── version.json                    # Central version file
├── scripts/
│   ├── bump-version.mjs            # Auto-increment version
│   ├── update-version.mjs          # Update files with version
│   ├── SKILL.md                    # Complete documentation
│   ├── QUICK_REFERENCE.md          # Quick command reference
│   └── README.md                   # This file
├── src/
│   └── app/
│       ├── login/
│       │   └── page.tsx            # Version badge display
│       └── dashboard/
│           ├── page.tsx            # Version information
│           └── about/
│               └── page.tsx        # Changelog and version
└── package.json                    # npm scripts
```

---

## Version History

View your version history:

```bash
# List all version tags
git tag -l

# Show tag details
git show v1.0.12

# View changelog
git log --oneline --decorate

# Compare versions
git diff v1.0.11..v1.0.12

# See commits between versions
git log v1.0.11..v1.0.12 --oneline
```

---

## CI/CD Integration

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
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy to production
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## Documentation

- **[SKILL.md](SKILL.md)** - Complete version management guide with workflows and troubleshooting
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick command reference card
- **[README.md](README.md)** - This file

For additional documentation on version management, release workflows, and best practices, see the complete [SKILL.md](SKILL.md) guide.

---

## Support

If you encounter issues:

1. Review the troubleshooting section above
2. Check the [SKILL.md](SKILL.md) for detailed guidance
3. Run commands with `--verbose` for more information
4. Use `--verify-only` to check without making changes

---

## Summary

**Two scripts, one workflow:**

1. **bump-version.mjs** - Automatically increment version
2. **update-version.mjs** - Update files with new version

**Most common usage:**
```bash
npm run version:bump          # Bump patch version
# Update changelog manually
git diff && npm run build     # Review and test
git add . && git commit -m "chore: update to v1.0.12"
git tag v1.0.12 && git push --follow-tags
```

**Key features:**
- ✅ Semantic versioning support
- ✅ Dry-run mode for safety
- ✅ Pattern verification
- ✅ Backup creation
- ✅ Detailed validation
- ✅ Clear feedback and guidance
