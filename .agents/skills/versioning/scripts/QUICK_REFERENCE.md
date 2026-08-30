# Version Management Quick Reference

## Daily Commands

### Bump Patch Version (Bug Fixes)
```bash
npm run version:bump
# or
node scripts/bump-version.mjs
```

### Bump Minor Version (New Features)
```bash
npm run version:bump minor
# or
node scripts/bump-version.mjs minor
```

### Bump Major Version (Breaking Changes)
```bash
npm run version:bump major
# or
node scripts/bump-version.mjs major
```

## Preview Changes (Dry Run)
```bash
node scripts/bump-version.mjs --dry-run
node scripts/bump-version.mjs minor --dry-run
```

## Skip Confirmations
```bash
node scripts/bump-version.mjs --yes
node scripts/bump-version.mjs major -y
```

## Verify File Patterns
```bash
node scripts/update-version.mjs 1.0.12 --verify-only
```

## Create Backups
```bash
node scripts/update-version.mjs 1.0.12 --backup
```

## Verbose Output
```bash
node scripts/update-version.mjs 1.0.12 --verbose
```

## Complete Workflow
```bash
# 1. Bump version
npm run version:bump

# 2. Update changelog manually in:
#    src/app/dashboard/about/page.tsx

# 3. Review changes
git diff

# 4. Test build
npm run build

# 5. Commit
git add .
git commit -m "chore: update to v1.0.12"

# 6. Tag
git tag -a v1.0.12 -m "Release v1.0.12"

# 7. Push
git push && git push --tags
```

## Troubleshooting

### Check Current Version
```bash
cat version.json
```

### Find Version in Files
```bash
grep -r "v1.0" src/
```

### View Git Tags
```bash
git tag -l
```

### Delete Wrong Tag
```bash
git tag -d v1.0.12
git push origin :refs/tags/v1.0.12
```

## Semantic Versioning Guide

| Change Type | Version | Example | Command |
|------------|---------|---------|---------|
| Bug Fix | Patch | 1.0.11 → 1.0.12 | `npm run version:bump` |
| New Feature | Minor | 1.0.11 → 1.1.0 | `npm run version:bump minor` |
| Breaking Change | Major | 1.0.11 → 2.0.0 | `npm run version:bump major` |

## Pre-release Versions

```bash
# Beta release
node scripts/update-version.mjs 1.1.0-beta.1

# Release candidate
node scripts/update-version.mjs 1.1.0-rc.1

# Tag appropriately
git tag v1.1.0-beta.1
```

## Hotfix Workflow

```bash
# Create hotfix branch
git checkout -b hotfix/1.0.13 v1.0.12

# Make fixes
# ... edit files ...

# Bump patch version
npm run version:bump

# Commit and tag
git add .
git commit -m "fix: critical bug"
git tag v1.0.13

# Merge back
git checkout main
git merge hotfix/1.0.13

# Push
git push && git push --tags
```

## Compare Versions

```bash
# See changes between versions
git diff v1.0.11..v1.0.12

# See commits between versions
git log v1.0.11..v1.0.12 --oneline
```

## Emergency Rollback

```bash
# Checkout old version
git checkout v1.0.11

# Create branch from old version
git checkout -b rollback/v1.0.11 v1.0.11
```
