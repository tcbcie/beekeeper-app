# Version Management System

## Overview
Automated system for managing version numbers and dates across the Hive Craic application. This ensures consistency across all user-facing version displays.

## Version Locations

The version number appears in three locations:

1. **Login Page** ([src/app/login/page.tsx](../src/app/login/page.tsx))
   - Version badge at bottom of login form
   - Format: `v1.0.11`

2. **Dashboard** ([src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx))
   - Version display in application info card
   - Format: `v1.0.11` with date

3. **About Page Changelog** ([src/app/dashboard/about/page.tsx](../src/app/dashboard/about/page.tsx))
   - Latest version at top of changelog
   - Format: `v1.0.11` with full date and feature list

## Automated Version Update

### Quick Start

**Bump patch version (most common):**
```bash
npm run version:bump
```

**Update to specific version:**
```bash
npm run version:update 1.0.12 "November 15, 2025"
```

**Bump minor or major version:**
```bash
npm run version:bump minor  # 1.0.11 → 1.1.0
npm run version:bump major  # 1.0.11 → 2.0.0
```

### Files

#### 1. version.json
Central version configuration file containing:
- Current version number
- Current release date
- Changelog entries (for future automation)

```json
{
  "version": "1.0.11",
  "date": "November 1, 2025",
  "changelog": { ... }
}
```

#### 2. scripts/update-version.mjs
Updates version across all three locations automatically.

**Usage:**
```bash
node scripts/update-version.mjs <version> [date]
```

**Examples:**
```bash
# Use current date
node scripts/update-version.mjs 1.0.12

# Specify custom date
node scripts/update-version.mjs 1.0.12 "December 1, 2025"
```

**What it does:**
- Updates `version.json`
- Updates login page version and date
- Updates dashboard version and date
- Updates About page latest version and date
- Reports all changes made

#### 3. scripts/bump-version.mjs
Automatically increments version number following semantic versioning.

**Usage:**
```bash
node scripts/bump-version.mjs [major|minor|patch]
```

**Examples:**
```bash
node scripts/bump-version.mjs        # Patch: 1.0.11 → 1.0.12
node scripts/bump-version.mjs patch  # Patch: 1.0.11 → 1.0.12
node scripts/bump-version.mjs minor  # Minor: 1.0.11 → 1.1.0
node scripts/bump-version.mjs major  # Major: 1.0.11 → 2.0.0
```

**What it does:**
- Reads current version from `version.json`
- Increments appropriate version segment
- Resets lower segments (e.g., minor bump resets patch to 0)
- Calls `update-version.mjs` with new version
- Uses current date automatically

## Release Workflow

### Standard Release Process

1. **Make your code changes**
   ```bash
   # Make changes to code
   # Test thoroughly
   ```

2. **Bump version**
   ```bash
   npm run version:bump
   # or for minor/major releases:
   # npm run version:bump minor
   ```

3. **Update changelog**
   - Edit [src/app/dashboard/about/page.tsx](../src/app/dashboard/about/page.tsx)
   - Add new version section with feature list
   - Follow existing format (see example below)

4. **Review changes**
   ```bash
   git diff
   ```

5. **Commit all changes**
   ```bash
   git add .
   git commit -m "Update to v1.0.12: Brief description of changes"
   ```

6. **Tag the release**
   ```bash
   git tag v1.0.12
   ```

7. **Push to remote**
   ```bash
   git push && git push --tags
   ```

### Hot Fix Release

For urgent fixes that need immediate deployment:

```bash
# 1. Create hotfix branch
git checkout -b hotfix/1.0.12

# 2. Make fix
# ... edit files ...

# 3. Bump version
npm run version:bump

# 4. Update changelog (brief entry)
# Edit about/page.tsx

# 5. Commit
git add .
git commit -m "Hotfix v1.0.12: Brief description"

# 6. Tag and merge
git tag v1.0.12
git checkout main
git merge hotfix/1.0.12
git push && git push --tags
```

## Changelog Format

When adding a new version to the changelog, follow this structure:

```tsx
<div>
  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded font-semibold">
      v1.0.12
    </span>
    November 15, 2025
  </h3>
  <ul className="mt-3 space-y-2 text-gray-700">
    <li className="flex items-start gap-2">
      <span className="text-green-600 mt-1">✓</span>
      <span><strong>Feature Name:</strong> Brief description of the feature</span>
    </li>
    <li className="flex items-start gap-2">
      <span className="text-green-600 mt-1">✓</span>
      <span><strong>Bug Fix:</strong> What was fixed and why</span>
    </li>
    {/* Add more items as needed */}
  </ul>
</div>

{/* Previous version becomes a border-t pt-6 section */}
<div className="border-t pt-6">
  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded font-semibold">
      v1.0.11
    </span>
    November 1, 2025
  </h3>
  {/* ... */}
</div>
```

## Semantic Versioning

We follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.x.x → 2.0.0): Breaking changes, major redesigns
- **MINOR** (1.0.x → 1.1.0): New features, backwards compatible
- **PATCH** (1.0.11 → 1.0.12): Bug fixes, small improvements

### Version Guidelines

**Increment PATCH when:**
- Bug fixes
- Performance improvements
- UI tweaks
- Documentation updates
- Minor feature enhancements

**Increment MINOR when:**
- New features
- New pages or major sections
- Database schema changes (backwards compatible)
- API endpoint additions

**Increment MAJOR when:**
- Breaking changes to data structures
- Major architectural changes
- Removal of features
- Incompatible API changes

## Troubleshooting

### Script not found
```bash
# Make scripts executable
chmod +x scripts/*.mjs
```

### Version not updating
```bash
# Check pattern in files manually
# Update regex patterns in update-version.mjs if file format changed
```

### Date format issues
```bash
# Use exact format: "Month Day, Year"
npm run version:update 1.0.12 "November 15, 2025"
```

## Future Enhancements

Potential improvements for the version management system:

1. **Automated Changelog**
   - Parse git commits to generate changelog
   - Use conventional commits format

2. **Git Integration**
   - Auto-commit version changes
   - Auto-create git tags
   - Auto-push to remote

3. **Pre-commit Hook**
   - Validate version format
   - Ensure changelog updated
   - Check for version conflicts

4. **Release Notes**
   - Generate markdown release notes
   - Create GitHub releases automatically

5. **Version Check**
   - Verify version consistency across files
   - Warn if versions don't match

## Manual Version Update

If you need to update versions manually (not recommended):

1. Update `version.json`
2. Search for current version in:
   - `src/app/login/page.tsx` - Line ~116
   - `src/app/dashboard/page.tsx` - Line ~836
   - `src/app/dashboard/about/page.tsx` - Line ~341
3. Update dates in same locations
4. Add new changelog section in about page

## Best Practices

1. **Always use scripts** - Don't manually edit version numbers
2. **Update changelog first** - Before committing version bump
3. **Test before release** - Run `npm run build` after version update
4. **Tag commits** - Always tag release commits
5. **Descriptive commits** - Include version in commit message
6. **Follow semver** - Use correct version increment type

## npm Scripts Reference

```json
{
  "scripts": {
    "version:update": "node scripts/update-version.mjs",
    "version:bump": "node scripts/bump-version.mjs"
  }
}
```

- `npm run version:update <version> [date]` - Update to specific version
- `npm run version:bump [major|minor|patch]` - Auto-increment version
