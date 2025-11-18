# Scripts Directory

Automation scripts for Hive Craic development and maintenance.

## Available Scripts

### Version Management

#### update-version.mjs
Updates version number and date across all application files.

```bash
# Update to specific version
node scripts/update-version.mjs 1.0.12

# Update with custom date
node scripts/update-version.mjs 1.0.12 "December 1, 2025"

# Via npm
npm run version:update 1.0.12 "December 1, 2025"
```

**Updates:**
- Login page version badge
- Dashboard version display
- About page changelog
- version.json

#### bump-version.mjs
Automatically increments version following semantic versioning.

```bash
# Bump patch version (default)
node scripts/bump-version.mjs
node scripts/bump-version.mjs patch

# Bump minor version
node scripts/bump-version.mjs minor

# Bump major version
node scripts/bump-version.mjs major

# Via npm (recommended)
npm run version:bump
npm run version:bump minor
npm run version:bump major
```

**Examples:**
- Patch: `1.0.11` → `1.0.12`
- Minor: `1.0.11` → `1.1.0`
- Major: `1.0.11` → `2.0.0`

## Quick Reference

### Before Committing

```bash
# Bump version
npm run version:bump

# Review changes
git diff

# Build to verify
npm run build
```

### After Committing

```bash
# Tag the release
git tag v1.0.12

# Push with tags
git push && git push --tags
```

## Documentation

See [../docs/VERSION_MANAGEMENT.md](../docs/VERSION_MANAGEMENT.md) for complete documentation on version management, release workflows, and best practices.
