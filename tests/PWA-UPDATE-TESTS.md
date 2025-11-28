# PWA Update System - Test Documentation

## Overview

Comprehensive test suite for the PWA update system, covering update manager logic, UI components, and integration flows.

## Test Files

### 1. Update Manager Tests (`tests/lib/update-manager.test.ts`)

Tests the core update management functionality.

#### Test Coverage

**Initialize Method**
- ✅ Should initialize with service worker registration
- ✅ Should detect waiting service worker immediately
- ✅ Should set up periodic update checks (every 30 minutes)
- ✅ Should check for updates on visibility change

**Check for Updates Method**
- ✅ Should update state to checking
- ✅ Should call registration.update()
- ✅ Should update state to no-update after timeout if no update found
- ✅ Should handle update check errors
- ✅ Should not check for updates if not initialized

**Apply Update Method**
- ✅ Should send SKIP_WAITING message to waiting service worker
- ✅ Should warn if no waiting service worker

**Dismiss Update Method**
- ✅ Should update state to no-update

**Subscribe Method**
- ✅ Should call listener immediately with current state
- ✅ Should call listener on state updates
- ✅ Should return unsubscribe function

**Get State Method**
- ✅ Should return current state

**Event Handling**
- ✅ Should update state to installing when new worker is installing
- ✅ Should update state to ready when new worker is installed
- ✅ Should reload page when controller changes

**Version Function**
- ✅ Should return app version from environment
- ✅ Should return default version if env var not set

**Total Tests:** 20 test cases

---

### 2. Update Notification Component Tests (`tests/components/UpdateNotification.test.tsx`)

Tests the update notification UI component.

#### Test Coverage

**UpdateNotification Component**
- ✅ Should not render when no update is available
- ✅ Should render when update is ready
- ✅ Should call applyUpdate when Update Now is clicked
- ✅ Should call dismissUpdate when Later is clicked
- ✅ Should hide notification after Update Now is clicked
- ✅ Should hide notification after Later is clicked
- ✅ Should subscribe to update manager on mount
- ✅ Should unsubscribe from update manager on unmount
- ✅ Should update visibility when state changes
- ✅ Should hide when state changes to no-update
- ✅ Should render update icon

**UpdateCheckButton Component**
- ✅ Should render check for updates button
- ✅ Should call checkForUpdates when clicked
- ✅ Should show checking state when update check is in progress
- ✅ Should disable button when checking for updates
- ✅ Should enable button when not checking
- ✅ Should render refresh icon
- ✅ Should have spinning animation when checking
- ✅ Should not have spinning animation when not checking
- ✅ Should subscribe to update manager on mount
- ✅ Should unsubscribe from update manager on unmount
- ✅ Should update button state when update state changes

**Total Tests:** 22 test cases

---

### 3. Version Display Component Tests (`tests/components/VersionDisplay.test.tsx`)

Tests the version display component.

#### Test Coverage

- ✅ Should render version number
- ✅ Should call getAppVersion
- ✅ Should render with correct styling classes
- ✅ Should display different version numbers correctly
- ✅ Should handle version with pre-release tag
- ✅ Should handle version with build metadata
- ✅ Should render as a div element
- ✅ Should be accessible

**Total Tests:** 8 test cases

---

### 4. PWA Update Flow Integration Tests (`tests/integration/pwa-update-flow.test.ts`)

End-to-end integration tests for the complete update flow.

#### Test Coverage

**Complete Update Lifecycle**
- ✅ Should handle full update flow from detection to activation
- ✅ Should detect waiting service worker on initialization
- ✅ Should handle user dismissing update

**Periodic Update Checks**
- ✅ Should check for updates every 30 minutes
- ✅ Should check for updates when page becomes visible
- ✅ Should not check for updates when page becomes hidden

**Manual Update Check**
- ✅ Should allow manual update check
- ✅ Should update state during manual check

**Error Handling**
- ✅ Should handle update check failures gracefully
- ✅ Should handle missing waiting service worker gracefully

**Multiple Subscribers**
- ✅ Should notify all subscribers of state changes
- ✅ Should allow subscribers to unsubscribe

**Version Management**
- ✅ Should get version from environment variable
- ✅ Should fallback to default version when env var not set

**Total Tests:** 14 test cases

---

## Test Summary

| Test Suite | Test Cases | Coverage Area |
|------------|-----------|---------------|
| Update Manager | 20 | Core logic, state management |
| Update Notification | 22 | UI components, user interactions |
| Version Display | 8 | Version rendering |
| Integration Tests | 14 | End-to-end flows |
| **TOTAL** | **64** | **Complete system** |

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test update-manager.test.ts
npm test UpdateNotification.test.tsx
npm test VersionDisplay.test.tsx
npm test pwa-update-flow.test.ts
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with UI
```bash
npm run test:ui
```

## Test Coverage Goals

- **Lines:** 80%+ ✅
- **Functions:** 80%+ ✅
- **Branches:** 75%+ ✅
- **Statements:** 80%+ ✅

## Key Testing Patterns

### 1. Mocking Service Workers

```typescript
const mockRegistration = {
  waiting: null,
  installing: null,
  active: mockServiceWorker,
  update: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn()
}
```

### 2. Testing State Updates

```typescript
const stateUpdates: string[] = []
updateManager.subscribe((state) => {
  stateUpdates.push(state.status)
})

expect(stateUpdates).toContain('ready')
```

### 3. Testing User Interactions

```typescript
const updateButton = screen.getByText('Update Now')
fireEvent.click(updateButton)

expect(updateManager.applyUpdate).toHaveBeenCalled()
```

### 4. Testing Async Flows

```typescript
await waitFor(() => {
  expect(screen.getByText('Update Available')).toBeInTheDocument()
})
```

## Edge Cases Tested

1. **No Service Worker Support** - Graceful degradation
2. **Update Check Failures** - Error handling
3. **Missing Waiting Worker** - Prevents crashes
4. **Multiple Subscribers** - All notified correctly
5. **Unsubscribe** - Memory leak prevention
6. **Page Visibility Changes** - Smart update checking
7. **Timer-based Updates** - Periodic checks work
8. **Environment Variables** - Fallback to defaults

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

- ✅ No browser dependencies (uses jsdom)
- ✅ Fast execution (< 5 seconds)
- ✅ Deterministic results
- ✅ Clear failure messages
- ✅ Coverage reporting

## Future Test Enhancements

Potential additions to the test suite:

- [ ] Visual regression tests for notification UI
- [ ] Performance tests for large subscriber lists
- [ ] Accessibility tests (ARIA, keyboard navigation)
- [ ] Cross-browser compatibility tests
- [ ] E2E tests with Playwright/Cypress
- [ ] Network failure simulation tests
- [ ] Offline/online transition tests

## Maintenance Notes

### When Adding New Features

1. Add unit tests for new functions
2. Add component tests for new UI elements
3. Update integration tests for new flows
4. Update this documentation

### When Fixing Bugs

1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify the test passes
4. Add regression test to prevent recurrence

## Documentation References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Update System Docs](../MD/PWA-UPDATE-SYSTEM.md)
